/**
 * Sitemap Plugin for Jekyll.js
 *
 * Implements jekyll-sitemap functionality
 * Generates a sitemap.xml file for search engines
 * Uses the 'sitemap' npm package for XML generation
 *
 * @see https://github.com/jekyll/jekyll-sitemap
 * @see https://github.com/ekalinin/sitemap.js
 */

import { SitemapStream, streamToPromise, EnumChangefreq, SitemapItemLoose } from 'sitemap';
import { Readable } from 'stream';
import { Plugin, GeneratorPlugin, GeneratorResult, GeneratorPriority } from './types';
import { Renderer } from '../core/Renderer';
import { Site } from '../core/Site';
import { Document } from '../core/Document';

/**
 * Valid changefreq values per sitemap specification
 */
const VALID_CHANGEFREQ_VALUES = [
  'always',
  'hourly',
  'daily',
  'weekly',
  'monthly',
  'yearly',
  'never',
] as const;

/**
 * Sitemap Plugin implementation
 * Implements both Plugin and GeneratorPlugin interfaces
 */
export class SitemapPlugin implements Plugin, GeneratorPlugin {
  name = 'jekyll-sitemap';
  priority = GeneratorPriority.LOWEST; // Run last so all URLs are generated

  register(_renderer: Renderer, _site: Site): void {
    // No-op: sitemap generation is handled via the GeneratorPlugin interface
  }

  /**
   * Generator interface - generates sitemap.xml file
   */
  async generate(site: Site, _renderer: Renderer): Promise<GeneratorResult> {
    const content = await this.generateSitemap(site);
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
   * Collect and convert documents to sitemap items
   */
  private collectSitemapItems(site: Site): {
    items: SitemapItemLoose[];
    hostname: string;
  } {
    const config = site.config;
    const baseUrl = config.url || '';
    const baseurl = config.baseurl || '';
    const hostname = `${baseUrl}${baseurl}`;

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

    // Convert documents to sitemap items
    const items: SitemapItemLoose[] = documents.map((doc) => {
      const url = doc.url || '';
      const lastmod = doc.data.last_modified_at || doc.date;
      const rawChangefreq = doc.data.sitemap?.changefreq || getDefaultChangefreq(doc);
      const changefreq = validateChangefreq(rawChangefreq);
      const priority =
        doc.data.sitemap?.priority !== undefined
          ? doc.data.sitemap.priority
          : getDefaultPriority(doc);

      const item: SitemapItemLoose = {
        url,
        changefreq,
        priority,
      };

      if (lastmod) {
        item.lastmod = new Date(lastmod).toISOString().split('T')[0];
      }

      return item;
    });

    return { items, hostname };
  }

  /**
   * Generate the sitemap XML content using the sitemap library's streaming API
   */
  async generateSitemap(site: Site): Promise<string> {
    const { items, hostname } = this.collectSitemapItems(site);

    // If no items, return an empty sitemap
    if (items.length === 0) {
      return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n</urlset>';
    }

    // Use the sitemap library with streaming
    try {
      const stream = new SitemapStream({
        hostname,
        lastmodDateOnly: true,
        xmlns: {
          news: false,
          video: false,
          xhtml: false,
          image: false,
        },
      });
      const data = await streamToPromise(Readable.from(items).pipe(stream));
      return data.toString();
    } catch (err) {
      throw new Error(
        `Sitemap generation failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }
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
 * Validate and normalize changefreq value
 * Returns a valid EnumChangefreq value, defaulting to 'weekly' for invalid inputs
 */
function validateChangefreq(value: string): EnumChangefreq {
  const normalized = value.toLowerCase();
  if (VALID_CHANGEFREQ_VALUES.includes(normalized as (typeof VALID_CHANGEFREQ_VALUES)[number])) {
    return normalized as EnumChangefreq;
  }
  // Default to 'weekly' for invalid values
  return EnumChangefreq.WEEKLY;
}
