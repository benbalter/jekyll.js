import { Document, DocumentType } from './Document';
import { SiteConfig } from './Site';
import { extname, basename, dirname } from 'path';

/**
 * UrlGenerator handles URL and permalink generation for documents
 */
export class UrlGenerator {
  private config: SiteConfig;

  /**
   * Create a new UrlGenerator
   * @param config Site configuration
   */
  constructor(config: SiteConfig) {
    this.config = config;
  }

  /**
   * Generate URL for a document
   * @param document Document to generate URL for
   * @returns Generated URL
   */
  generateUrl(document: Document): string {
    // If document has a custom permalink, use it
    if (document.permalink) {
      return this.processPermalink(document.permalink, document);
    }

    // Generate URL based on document type
    switch (document.type) {
      case DocumentType.POST:
        return this.generatePostUrl(document);
      case DocumentType.PAGE:
        return this.generatePageUrl(document);
      case DocumentType.COLLECTION:
        return this.generateCollectionUrl(document);
      default:
        return this.generatePageUrl(document);
    }
  }

  /**
   * Generate output path for a document
   * @param document Document to generate path for
   * @returns Relative path in destination directory
   */
  generateOutputPath(document: Document): string {
    // Use existing URL if set, otherwise generate it
    const url = document.url || this.generateUrl(document);
    
    // Remove leading slash
    const urlPath = url.startsWith('/') ? url.substring(1) : url;
    
    // If URL is empty (root index), return index.html
    if (!urlPath || urlPath === '') {
      return 'index.html';
    }
    
    // If URL ends with .html, use as-is
    if (urlPath.endsWith('.html') || urlPath.endsWith('.htm')) {
      return urlPath;
    }
    
    // If URL ends with /, add index.html
    if (urlPath.endsWith('/')) {
      return urlPath + 'index.html';
    }
    
    // Otherwise, add /index.html
    return urlPath + '/index.html';
  }

  /**
   * Generate URL for a post
   */
  private generatePostUrl(document: Document): string {
    const date = document.date;
    if (!date) {
      throw new Error(`Post ${document.relativePath} has no date`);
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    // Extract title from basename (remove date prefix for posts)
    const titleMatch = document.basename.match(/^\d{4}-\d{2}-\d{2}-(.*)/);
    const slug = titleMatch?.[1] || document.basename;

    // Use permalink style from config or default 'date' style
    const style = this.config.permalink || 'date';

    switch (style) {
      case 'date':
        return `/${year}/${month}/${day}/${slug}.html`;
      case 'pretty':
        return `/${year}/${month}/${day}/${slug}/`;
      case 'ordinal': {
        const dayOfYear = this.getDayOfYear(date);
        return `/${year}/${String(dayOfYear).padStart(3, '0')}/${slug}.html`;
      }
      case 'weekdate': {
        const week = this.getWeekNumber(date);
        return `/${year}/W${String(week).padStart(2, '0')}/${date.getDay()}/${slug}.html`;
      }
      case 'none':
        return `/${slug}.html`;
      default:
        // Custom permalink pattern
        if (typeof style === 'string') {
          return this.processPermalink(style, document);
        }
        return `/${year}/${month}/${day}/${slug}.html`;
    }
  }

  /**
   * Generate URL for a page
   */
  private generatePageUrl(document: Document): string {
    const relativePath = document.relativePath;
    const ext = extname(relativePath);
    
    // Remove source directory prefixes if any
    let urlPath = relativePath;
    
    // Handle index files specially
    const base = basename(relativePath, ext);
    if (base === 'index') {
      const dir = dirname(relativePath);
      return dir === '.' ? '/' : `/${dir}/`;
    }
    
    // Convert extension to .html
    if (ext === '.md' || ext === '.markdown') {
      urlPath = relativePath.substring(0, relativePath.length - ext.length) + '.html';
    }
    
    // Ensure leading slash
    return urlPath.startsWith('/') ? urlPath : '/' + urlPath;
  }

  /**
   * Generate URL for a collection document
   */
  private generateCollectionUrl(document: Document): string {
    if (!document.collection) {
      throw new Error('Collection document missing collection name');
    }

    const collectionConfig = this.config.collections?.[document.collection];
    
    // Check if collection has custom permalink
    if (collectionConfig?.permalink) {
      return this.processPermalink(collectionConfig.permalink, document);
    }

    // Default collection URL format
    const ext = extname(document.relativePath);
    const base = basename(document.relativePath, ext);
    
    return `/${document.collection}/${base}.html`;
  }

  /**
   * Process a permalink pattern with placeholders
   * @param pattern Permalink pattern
   * @param document Document to generate permalink for
   * @returns Processed permalink
   */
  private processPermalink(pattern: string, document: Document): string {
    const date = document.date || new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    const second = String(date.getSeconds()).padStart(2, '0');

    // Extract title/slug from basename
    let slug = document.basename;
    if (document.type === DocumentType.POST) {
      const titleMatch = document.basename.match(/^\d{4}-\d{2}-\d{2}-(.*)/);
      slug = titleMatch?.[1] || document.basename;
    }

    // Process categories
    const categories = document.categories.join('/');

    // Replace placeholders
    let result = pattern
      .replace(':year', String(year))
      .replace(':month', month)
      .replace(':i_month', String(date.getMonth() + 1))
      .replace(':day', day)
      .replace(':i_day', String(date.getDate()))
      .replace(':hour', hour)
      .replace(':minute', minute)
      .replace(':second', second)
      .replace(':title', slug)
      .replace(':slug', slug)
      .replace(':categories', categories)
      .replace(':collection', document.collection || '');

    // Handle short year
    const shortYear = String(year).substring(2);
    result = result.replace(':short_year', shortYear);

    // Handle y_day (day of year)
    const dayOfYear = this.getDayOfYear(date);
    result = result.replace(':y_day', String(dayOfYear).padStart(3, '0'));

    // Handle week number
    const week = this.getWeekNumber(date);
    result = result.replace(':week', String(week).padStart(2, '0'));

    // Handle short month
    const shortMonth = date.toLocaleDateString('en-US', { month: 'short' }).toLowerCase();
    result = result.replace(':short_month', shortMonth);

    // Handle long month
    const longMonth = date.toLocaleDateString('en-US', { month: 'long' }).toLowerCase();
    result = result.replace(':long_month', longMonth);

    // Ensure leading slash
    if (!result.startsWith('/')) {
      result = '/' + result;
    }

    return result;
  }

  /**
   * Get day of year (1-365/366)
   */
  private getDayOfYear(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
  }

  /**
   * Get ISO week number
   */
  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }
}
