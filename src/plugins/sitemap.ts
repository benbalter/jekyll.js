/**
 * Sitemap Plugin for Jekyll.js
 *
 * Implements jekyll-sitemap functionality
 * Generates a sitemap.xml file for search engines
 *
 * @see https://github.com/jekyll/jekyll-sitemap
 */

import { Plugin, GeneratorPlugin, GeneratorResult, GeneratorPriority } from './index';
import { Renderer } from '../core/Renderer';
import { Site } from '../core/Site';
import { Document } from '../core/Document';

/**
 * Sitemap Plugin implementation
 * Implements both Plugin (for backward compatibility) and GeneratorPlugin interfaces
 */
export class SitemapPlugin implements Plugin, GeneratorPlugin {
  name = 'jekyll-sitemap';
  priority = GeneratorPriority.LOWEST; // Run last so all URLs are generated

  register(_renderer: Renderer, site: Site): void {
    // Store a reference for backward compatibility with legacy builder code
    (site as any)._sitemapPlugin = this;
  }

  /**
   * Generator interface - generates sitemap.xml file
   */
  generate(site: Site, _renderer: Renderer): GeneratorResult {
    const content = this.generateSitemap(site);
    return {
      files: [
        {
          path: 'sitemap.xml',
          content,
        },
      ],
    };
  }

  /**
   * Generate the sitemap XML content
   */
  generateSitemap(site: Site): string {
    const config = site.config;
    const baseUrl = config.url || '';
    const baseurl = config.baseurl || '';
    const siteUrl = `${baseUrl}${baseurl}`;

    const lines: string[] = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ];

    // Collect all documents that should be in the sitemap
    const documents: Document[] = [];

    // Add pages
    for (const page of site.pages) {
      if (shouldIncludeInSitemap(page)) {
        documents.push(page);
      }
    }

    // Add posts
    for (const post of site.posts) {
      if (shouldIncludeInSitemap(post)) {
        documents.push(post);
      }
    }

    // Add collection documents
    for (const [, docs] of site.collections) {
      for (const doc of docs) {
        if (shouldIncludeInSitemap(doc)) {
          documents.push(doc);
        }
      }
    }

    // Sort documents by URL for consistency
    documents.sort((a, b) => {
      const urlA = a.url || '';
      const urlB = b.url || '';
      return urlA.localeCompare(urlB);
    });

    // Generate URL entries
    for (const doc of documents) {
      const url = doc.url || '';
      const fullUrl = `${siteUrl}${url}`;

      // Get lastmod date
      const lastmod = doc.data.last_modified_at || doc.date;
      const lastmodStr = lastmod ? new Date(lastmod).toISOString().split('T')[0] : '';

      // Get change frequency and priority from front matter or defaults
      const changefreq = doc.data.sitemap?.changefreq || getDefaultChangefreq(doc);
      const priority =
        doc.data.sitemap?.priority !== undefined
          ? doc.data.sitemap.priority
          : getDefaultPriority(doc);

      lines.push('  <url>');
      lines.push(`    <loc>${escapeXml(fullUrl)}</loc>`);
      if (lastmodStr) {
        lines.push(`    <lastmod>${lastmodStr}</lastmod>`);
      }
      if (changefreq) {
        lines.push(`    <changefreq>${changefreq}</changefreq>`);
      }
      if (priority !== undefined) {
        lines.push(`    <priority>${priority.toFixed(1)}</priority>`);
      }
      lines.push('  </url>');
    }

    lines.push('</urlset>');
    return lines.join('\n');
  }
}

/**
 * Check if a document should be included in the sitemap
 */
function shouldIncludeInSitemap(doc: Document): boolean {
  // Check if explicitly excluded in front matter
  if (doc.data.sitemap === false) {
    return false;
  }

  // Check if URL exists
  if (!doc.url) {
    return false;
  }

  // Don't include unpublished documents
  if (!doc.published) {
    return false;
  }

  return true;
}

/**
 * Get default change frequency based on document type
 */
function getDefaultChangefreq(doc: Document): string {
  // Posts change less frequently than pages
  if (doc.type === 'post') {
    return 'monthly';
  }
  return 'weekly';
}

/**
 * Get default priority based on document type and URL
 */
function getDefaultPriority(doc: Document): number {
  const url = doc.url || '';

  // Homepage gets highest priority
  if (url === '/' || url === '/index.html') {
    return 1.0;
  }

  // Posts get medium priority
  if (doc.type === 'post') {
    return 0.6;
  }

  // Other pages get medium-high priority
  return 0.8;
}

/**
 * Escape XML special characters
 */
function escapeXml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
