/**
 * Redirect From Plugin for Jekyll.js
 *
 * Implements jekyll-redirect-from functionality
 * Generates redirect pages based on front matter configuration
 *
 * @see https://github.com/jekyll/jekyll-redirect-from
 */

import { Plugin } from './types';
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
 */
export class RedirectFromPlugin implements Plugin {
  name = 'jekyll-redirect-from';

  register(_renderer: Renderer, _site: Site): void {
    // Plugin is invoked explicitly when needed via generateRedirects()
    // No need to store a reference on the site object
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
