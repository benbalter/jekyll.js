/**
 * Redirect From Plugin for Jekyll.js
 *
 * Implements jekyll-redirect-from functionality
 * Generates redirect pages based on front matter configuration
 *
 * @see https://github.com/jekyll/jekyll-redirect-from
 */

import { Plugin, GeneratorPlugin, GeneratorResult, GeneratorPriority } from './types';
import { Renderer } from '../core/Renderer';
import { Site } from '../core/Site';
import { Document } from '../core/Document';
import { escapeHtml, escapeJs } from '../utils/html';

/**
 * Interface for redirect information
 */
export interface RedirectInfo {
  /** The URL path to redirect from */
  from: string;
  /** The URL path to redirect to */
  to: string;
}

/**
 * Redirect From Plugin implementation
 * Implements both Plugin and GeneratorPlugin interfaces
 */
export class RedirectFromPlugin implements Plugin, GeneratorPlugin {
  name = 'jekyll-redirect-from';
  priority = GeneratorPriority.LOW; // Run late, after URLs are generated

  register(_renderer: Renderer, _site: Site): void {
    // No-op: redirect generation is handled via the GeneratorPlugin interface
  }

  /**
   * Generator interface - generates redirect HTML files
   */
  generate(site: Site, _renderer: Renderer): GeneratorResult {
    const redirects = this.generateRedirects(site);

    // Mark documents with redirect_to so they don't get rendered as normal pages
    // The redirect HTML from the generator will be used instead
    const allDocuments: Document[] = [
      ...site.pages,
      ...site.posts,
      ...Array.from(site.collections.values()).flat(),
    ];

    for (const doc of allDocuments) {
      if (doc.data.redirect_to) {
        // Mark document as having no output to prevent normal rendering
        doc.data.output = false;
      }
    }

    return {
      files: redirects.map((redirect) => {
        // Remove leading slash to make path relative to destination
        let path = redirect.from.replace(/^\//, '');

        // If path is empty, use index.html
        if (path === '') {
          path = 'index.html';
        }
        // If path ends with /, add index.html
        else if (path.endsWith('/')) {
          path = path + 'index.html';
        }
        // If path doesn't have an extension at the end (e.g., /books, /old-page), add .html
        // This handles redirect_from URLs which typically don't have extensions
        // Use regex to check for extension at end of path to avoid matching dots in directory names
        else if (!/\.[a-zA-Z0-9]+$/.test(path)) {
          path = path + '.html';
        }
        // Otherwise use path as-is (it already has an extension like .html from doc.url)

        return {
          path,
          content: redirect.html,
        };
      }),
    };
  }

  /**
   * Generate redirect pages for the site
   * @returns Array of redirect information with HTML content
   */
  generateRedirects(site: Site): Array<RedirectInfo & { html: string }> {
    const redirects: Array<RedirectInfo & { html: string }> = [];
    const config = site.config;
    const baseurl = config.baseurl || '';

    // Process all documents (pages, posts, collections)
    const allDocuments: Document[] = [
      ...site.pages,
      ...site.posts,
      ...Array.from(site.collections.values()).flat(),
    ];

    for (const doc of allDocuments) {
      // Handle redirect_from
      const redirectFrom = doc.data.redirect_from;
      if (redirectFrom) {
        const redirectUrls = Array.isArray(redirectFrom) ? redirectFrom : [redirectFrom];

        for (const fromUrl of redirectUrls) {
          const normalizedFrom = normalizeUrl(fromUrl);
          const toUrl = doc.url || '/';

          redirects.push({
            from: normalizedFrom,
            to: `${baseurl}${toUrl}`,
            html: generateRedirectHtml(`${baseurl}${toUrl}`),
          });
        }
      }

      // Handle redirect_to
      const redirectTo = doc.data.redirect_to;
      if (redirectTo) {
        const docUrl = doc.url || '';
        const toUrl = isAbsoluteUrl(redirectTo)
          ? redirectTo
          : `${baseurl}${normalizeUrl(redirectTo)}`;

        redirects.push({
          from: docUrl,
          to: toUrl,
          html: generateRedirectHtml(toUrl),
        });
      }
    }

    return redirects;
  }
}

/**
 * Normalize a URL path
 * Ensures the path starts with /
 */
function normalizeUrl(url: string): string {
  if (!url) return '/';
  return url.startsWith('/') ? url : `/${url}`;
}

/**
 * Check if a URL is absolute (starts with http:// or https://)
 */
function isAbsoluteUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

/**
 * Generate HTML content for a redirect page
 * @param targetUrl URL to redirect to
 * @returns HTML string for redirect page
 */
function generateRedirectHtml(targetUrl: string): string {
  // Escape the target URL for use in HTML attributes
  const escapedUrl = escapeHtml(targetUrl);
  const escapedJsUrl = escapeJs(targetUrl);

  return `<!DOCTYPE html>
<html lang="en-US">
  <head>
    <meta charset="utf-8">
    <title>Redirecting&hellip;</title>
    <link rel="canonical" href="${escapedUrl}">
    <script>window.location.href="${escapedJsUrl}";</script>
    <meta http-equiv="refresh" content="0; url=${escapedUrl}">
    <meta name="robots" content="noindex">
  </head>
  <body>
    <h1>Redirecting&hellip;</h1>
    <a href="${escapedUrl}">Click here if you are not redirected.</a>
  </body>
</html>`;
}
