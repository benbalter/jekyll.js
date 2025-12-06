import { Liquid } from 'liquidjs';
import { Site } from './Site';
import { Document } from './Document';
import { Paginator } from './Paginator';
import { logger } from '../utils/logger';
import { TemplateError, parseErrorLocation } from '../utils/errors';
import { processMarkdown, initMarkdownProcessor, MarkdownOptions } from './markdown';
import { escapeHtml } from '../utils/html';
import { normalizePathSeparators } from '../utils/path-security';
import slugifyLib from 'slugify';
import { format, parseISO, formatISO, formatRFC7231, isValid } from 'date-fns';
import strftime from 'strftime';
import striptags from 'striptags';
import { smartypantsu } from 'smartypants';
import { dirname, join, resolve, normalize, relative } from 'path';
import { readFileSync, existsSync, statSync } from 'fs';
import { PluginRegistry, Hooks } from '../plugins';

// Cached syntax highlighting module to avoid repeated dynamic imports
let syntaxHighlightingModule: typeof import('../plugins/syntax-highlighting') | null = null;

/**
 * Get the syntax highlighting module, caching the import
 */
async function getSyntaxHighlightingModule(): Promise<typeof import('../plugins/syntax-highlighting')> {
  if (!syntaxHighlightingModule) {
    syntaxHighlightingModule = await import('../plugins/syntax-highlighting');
  }
  return syntaxHighlightingModule;
}

/**
 * Renderer configuration options
 */
export interface RendererOptions {
  /** Root directory for includes */
  root?: string;

  /** Layout directory (or array of directories) */
  layoutsDir?: string | string[];

  /** Includes directory (or array of directories) */
  includesDir?: string | string[];

  /** Enable strict mode for variables */
  strictVariables?: boolean;

  /** Enable strict mode for filters */
  strictFilters?: boolean;
}

/**
 * Options for slugify filter
 */
interface SlugifyOptions {
  lower?: boolean;
  strict?: boolean;
  trim?: boolean;
  replacement?: string;
  remove?: RegExp;
}

/**
 * Renderer class wraps liquidjs and provides Jekyll-compatible rendering
 */
export class Renderer {
  private liquid: Liquid;
  private site: Site;
  /** Markdown processing options (set based on enabled plugins) */
  private markdownOptions: MarkdownOptions = {};
  /** Cached site data to avoid repeated serialization */
  private cachedSiteData: Record<string, unknown> | null = null;
  /** Promise for background markdown processor initialization */
  private markdownInitPromise: Promise<void> | null = null;

  /**
   * Create a new Renderer instance
   * @param site Site instance
   * @param options Renderer options
   */
  constructor(site: Site, options: RendererOptions = {}) {
    this.site = site;

    // Initialize liquidjs with Jekyll-compatible settings
    this.liquid = new Liquid({
      root: options.root || site.source,
      layouts: options.layoutsDir,
      partials: options.includesDir,
      extname: '.html',
      strictVariables: options.strictVariables ?? false,
      strictFilters: options.strictFilters ?? false,
      cache: true, // Enable template caching for better performance
      jekyllInclude: true, // Use Jekyll-style includes
    });

    // Register Jekyll-compatible filters
    this.registerFilters();

    // Register Jekyll-compatible tags
    this.registerTags();

    // Auto-enable syntax highlighting based on site configuration
    if (site.config.modern?.syntaxHighlighting?.enabled) {
      this.enableSyntaxHighlighting({
        theme: site.config.modern.syntaxHighlighting.theme,
      });
    }
  }

  /**
   * Ensure site data is cached and return it
   * @returns Cached site data object
   */
  private ensureSiteDataCached(): Record<string, unknown> {
    if (!this.cachedSiteData) {
      const siteData = this.site.toJSON();
      this.cachedSiteData = {
        ...siteData.config, // Flatten config into site for Jekyll compatibility
        config: siteData.config, // Also keep config for backward compatibility
        data: siteData.data, // Add data files
        pages: siteData.pages,
        posts: siteData.posts,
        static_files: siteData.static_files, // Add static files
        collections: siteData.collections,
        source: siteData.source,
        destination: siteData.destination,
      };
    }
    return this.cachedSiteData!;
  }

  /**
   * Helper method to parse date input consistently
   * @param date Date input (string or Date object)
   * @returns Parsed Date object, or throws error for invalid input
   */
  private parseDate(date: any): Date {
    // Handle null, undefined, or empty string
    if (date == null || date === '') {
      throw new Error('Invalid date input: date is null, undefined, or empty');
    }

    // Parse string dates using parseISO, otherwise create Date object
    const parsed = typeof date === 'string' ? parseISO(date) : new Date(date);

    // Validate the resulting date
    if (!isValid(parsed)) {
      throw new Error(`Invalid date input: unable to parse "${date}"`);
    }

    return parsed;
  }

  /**
   * Register Jekyll-compatible Liquid filters
   */
  private registerFilters(): void {
    // Date formatting filters - using date-fns library
    this.liquid.registerFilter('date_to_xmlschema', (date: any) => {
      if (!date) return '';
      try {
        const d = this.parseDate(date);
        // Use formatISO which always outputs in UTC with Z suffix
        return formatISO(d, { format: 'extended' });
      } catch (error) {
        logger.warn(
          `date_to_xmlschema filter: ${error instanceof Error ? error.message : 'Invalid date'}`
        );
        return '';
      }
    });

    this.liquid.registerFilter('date_to_rfc822', (date: any) => {
      if (!date) return '';
      try {
        const d = this.parseDate(date);
        // Use formatRFC7231 which always outputs in GMT
        return formatRFC7231(d);
      } catch (error) {
        logger.warn(
          `date_to_rfc822 filter: ${error instanceof Error ? error.message : 'Invalid date'}`
        );
        return '';
      }
    });

    this.liquid.registerFilter('date_to_string', (date: any) => {
      if (!date) return '';
      try {
        const d = this.parseDate(date);
        return format(d, 'dd MMM yyyy');
      } catch (error) {
        logger.warn(
          `date_to_string filter: ${error instanceof Error ? error.message : 'Invalid date'}`
        );
        return '';
      }
    });

    this.liquid.registerFilter('date_to_long_string', (date: any) => {
      if (!date) return '';
      try {
        const d = this.parseDate(date);
        return format(d, 'dd MMMM yyyy');
      } catch (error) {
        logger.warn(
          `date_to_long_string filter: ${error instanceof Error ? error.message : 'Invalid date'}`
        );
        return '';
      }
    });

    // URL filters
    this.liquid.registerFilter('relative_url', (input: string) => {
      if (!input) return '';
      const baseurl = this.site.config.baseurl || '';
      // Ensure input starts with /
      const path = input.startsWith('/') ? input : `/${input}`;
      // If no baseurl, just return the normalized path
      if (!baseurl) return path;
      // Combine baseurl and path, ensuring single slash
      return `${baseurl}${path}`;
    });

    this.liquid.registerFilter('absolute_url', (input: string) => {
      if (!input) return '';
      const url = this.site.config.url || '';
      const baseurl = this.site.config.baseurl || '';
      // Ensure input starts with /
      const path = input.startsWith('/') ? input : `/${input}`;
      return `${url}${baseurl}${path}`;
    });

    // strip_index filter - strips trailing /index.html or /index.htm from URLs
    // This is a Jekyll-specific filter for clean URL formatting
    this.liquid.registerFilter('strip_index', (input: string) => {
      if (!input) return '';
      // Only strip index.html or index.htm at the very end of the string
      // This preserves index.html in the middle of a path
      return String(input).replace(/\/index\.html?$/i, '/');
    });

    // Array filters
    this.liquid.registerFilter('where', (array: any[], key: string, value?: any) => {
      if (!Array.isArray(array)) return [];
      if (value === undefined) {
        // If no value provided, filter for truthy values
        return array.filter((item) => item && item[key]);
      }
      return array.filter((item) => item && item[key] === value);
    });

    // Note: where_exp filter uses liquidjs built-in implementation which fully supports
    // Jekyll-compatible expression evaluation (e.g., item.property == value, contains, and/or)

    this.liquid.registerFilter('group_by', (array: any[], property: string) => {
      if (!Array.isArray(array)) return [];
      const groups = new Map<any, any[]>();

      for (const item of array) {
        const key = item[property];
        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key)?.push(item);
      }

      return Array.from(groups.entries()).map(([name, items]) => ({
        name,
        items,
        size: items.length,
      }));
    });

    // Note: group_by_exp filter uses liquidjs built-in implementation which fully supports
    // Jekyll-compatible expression evaluation for grouping

    this.liquid.registerFilter('xml_escape', (input: string) => {
      if (!input) return '';
      return String(input)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
      // Note: &apos; escaping removed for Jekyll compatibility
    });

    this.liquid.registerFilter('cgi_escape', (input: string) => {
      if (!input) return '';
      return encodeURIComponent(String(input));
    });

    this.liquid.registerFilter('uri_escape', (input: string) => {
      if (!input) return '';
      return encodeURI(String(input));
    });

    // Number filters
    this.liquid.registerFilter('number_of_words', (input: string) => {
      if (!input) return 0;
      const trimmed = String(input).trim();
      if (trimmed === '') return 0;
      return trimmed.split(/\s+/).length;
    });

    // Array manipulation
    this.liquid.registerFilter(
      'array_to_sentence_string',
      (array: any[], connector: string = 'and') => {
        if (!Array.isArray(array)) return '';
        if (array.length === 0) return '';
        if (array.length === 1) return String(array[0]);
        if (array.length === 2) return `${array[0]} ${connector} ${array[1]}`;

        const last = array[array.length - 1];
        const rest = array.slice(0, -1);
        return `${rest.join(', ')}, ${connector} ${last}`;
      }
    );

    // String filters
    this.liquid.registerFilter('markdownify', async (input: string) => {
      if (!input) return '';
      try {
        return await processMarkdown(String(input), this.markdownOptions);
      } catch (error) {
        logger.warn(
          `markdownify filter failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        return input;
      }
    });

    // String filter for converting ASCII punctuation to smart typography
    // Uses the smartypants library (https://github.com/othree/smartypants.js)
    // which is a port of the original SmartyPants Perl library
    this.liquid.registerFilter('smartify', (input: string) => {
      if (!input) return '';
      // Use smartypantsu for Unicode output (instead of HTML entities)
      return smartypantsu(String(input));
    });

    this.liquid.registerFilter('slugify', (input: string, mode: string = 'default') => {
      if (!input) return '';

      // Use slugify library with Jekyll-compatible modes
      const options: SlugifyOptions = {
        lower: true,
        strict: false,
        trim: true,
      };

      if (mode === 'raw') {
        // Raw mode: only replace spaces, keep everything else
        options.strict = false;
        options.replacement = '-';
      } else if (mode === 'pretty') {
        // Pretty mode: allow word chars, spaces, and hyphens
        options.strict = false;
        options.remove = /[^\w\s-]/g;
      } else if (mode === 'ascii') {
        // ASCII mode: only ASCII alphanumeric characters
        options.strict = true;
      } else {
        // Default mode: similar to pretty
        options.strict = false;
        options.remove = /[^\w\s-]/g;
      }

      return slugifyLib(String(input), options);
    });

    // JSON filter
    this.liquid.registerFilter('jsonify', (input: any) => {
      return JSON.stringify(input);
    });

    // Inspect filter for debugging
    this.liquid.registerFilter('inspect', (input: any) => {
      return JSON.stringify(input, null, 2);
    });

    // Array manipulation filters
    this.liquid.registerFilter('sort', (array: any[], property?: string) => {
      if (!Array.isArray(array)) return array;
      const arr = [...array]; // Create a copy to avoid mutating original

      if (property) {
        // Sort by property
        return arr.sort((a, b) => {
          const aVal = a?.[property];
          const bVal = b?.[property];
          if (aVal === bVal) return 0;
          if (aVal == null) return 1;
          if (bVal == null) return -1;
          return aVal > bVal ? 1 : -1;
        });
      }

      // Default sort
      return arr.sort();
    });

    this.liquid.registerFilter('uniq', (array: any[]) => {
      if (!Array.isArray(array)) return array;
      return Array.from(new Set(array));
    });

    this.liquid.registerFilter('sample', (array: any[], count?: number) => {
      if (!Array.isArray(array) || array.length === 0) return count ? [] : null;

      if (count !== undefined) {
        // Return multiple samples using Fisher-Yates shuffle
        const numSamples = Math.min(Math.max(0, count), array.length);
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled.slice(0, numSamples);
      }

      // Return single random item
      return array[Math.floor(Math.random() * array.length)];
    });

    this.liquid.registerFilter('pop', (array: any[], count?: number) => {
      if (!Array.isArray(array)) return array;
      const arr = [...array]; // Create a copy to avoid mutating original

      if (count !== undefined) {
        if (count <= 0) return arr;
        return arr.slice(0, -count);
      }

      arr.pop();
      return arr;
    });

    this.liquid.registerFilter('push', (array: any[], item: any) => {
      if (!Array.isArray(array)) return [item];
      return [...array, item];
    });

    this.liquid.registerFilter('shift', (array: any[], count?: number) => {
      if (!Array.isArray(array)) return array;
      const arr = [...array]; // Create a copy to avoid mutating original

      if (count !== undefined) {
        const normalizedCount = Math.max(0, count);
        return arr.slice(normalizedCount);
      }

      arr.shift();
      return arr;
    });

    this.liquid.registerFilter('unshift', (array: any[], item: any) => {
      if (!Array.isArray(array)) return [item];
      return [item, ...array];
    });

    // Additional string filters
    this.liquid.registerFilter('normalize_whitespace', (input: string) => {
      if (!input) return '';
      return String(input).replace(/\s+/g, ' ').trim();
    });

    this.liquid.registerFilter('newline_to_br', (input: string) => {
      if (!input) return '';
      // Match Jekyll's output format with space and slash for XHTML compatibility
      return String(input).replace(/\n/g, '<br />\n');
    });

    this.liquid.registerFilter('strip_html', (input: string) => {
      if (!input) return '';
      // Use striptags library for proper HTML parsing and removal
      // Handles edge cases: self-closing tags, nested tags, malformed HTML,
      // HTML comments, and preserves HTML entities properly
      return striptags(String(input));
    });

    this.liquid.registerFilter('strip_newlines', (input: string) => {
      if (!input) return '';
      return String(input).replace(/\n/g, '');
    });

    // Number/Math filters
    this.liquid.registerFilter('to_integer', (input: any) => {
      const num = parseInt(String(input), 10);
      return isNaN(num) ? 0 : num;
    });

    this.liquid.registerFilter('abs', (input: number) => {
      const num = Number(input);
      return isNaN(num) ? 0 : Math.abs(num);
    });

    this.liquid.registerFilter('at_least', (input: number, min: number) => {
      const num = Number(input);
      const minimum = Number(min);
      if (isNaN(num)) return minimum;
      if (isNaN(minimum)) return num;
      return Math.max(num, minimum);
    });

    this.liquid.registerFilter('at_most', (input: number, max: number) => {
      const num = Number(input);
      const maximum = Number(max);
      if (isNaN(num)) return maximum;
      if (isNaN(maximum)) return num;
      return Math.min(num, maximum);
    });

    // Modern enhancements - opt-in features that maintain backwards compatibility

    /**
     * Calculate estimated reading time for content
     * Returns the number of minutes to read the content
     * Based on average reading speed of 200 words per minute
     * @example {{ content | reading_time }} => 5
     * @example {{ content | reading_time: 250 }} => 4 (custom WPM)
     */
    this.liquid.registerFilter('reading_time', (input: string, wordsPerMinute: number = 200) => {
      if (!input) return 0;
      const text = striptags(String(input));
      const words = text
        .trim()
        .split(/\s+/)
        .filter((word) => word.length > 0).length;
      const wpm = Number(wordsPerMinute) || 200;
      const minutes = Math.ceil(words / wpm);
      return minutes < 1 ? 1 : minutes;
    });

    /**
     * Generate a table of contents from HTML content
     * Parses h2-h4 headings and returns an array of TOC entries
     * @example {% assign toc = content | toc %}
     */
    this.liquid.registerFilter('toc', (input: string) => {
      if (!input) return [];
      // Match h2-h4 headings, capturing optional id attribute and content (including nested HTML)
      const headingRegex = /<h([2-4])(?:\s+id="([^"]*)")?[^>]*>([\s\S]*?)<\/h\1>/gi;
      const toc: Array<{ level: number; id: string; text: string }> = [];
      let match: RegExpExecArray | null;
      while ((match = headingRegex.exec(String(input))) !== null) {
        const levelStr = match[1];
        const contentStr = match[3];
        if (levelStr && contentStr) {
          const level = parseInt(levelStr, 10);
          // Strip HTML tags to get plain text for the TOC entry
          const text = striptags(contentStr).trim();
          if (text) {
            // Use existing id or generate from text
            const id = match[2] || slugifyLib(text, { lower: true, strict: true });
            toc.push({ level, id, text });
          }
        }
      }
      return toc;
    });

    /**
     * Add anchor links to headings in HTML content
     * Adds id attributes and anchor links to h2-h4 headings
     * @example {{ content | heading_anchors }}
     */
    this.liquid.registerFilter('heading_anchors', (input: string) => {
      if (!input) return '';
      // Match h2-h4 headings, capturing optional id attribute and content (including nested HTML)
      return String(input).replace(
        /<h([2-4])(\s+id="([^"]*)")?([^>]*)>([\s\S]*?)<\/h\1>/gi,
        (_match, level, _idAttr, existingId, attrs, content) => {
          // Strip HTML to get plain text for ID generation
          const plainText = striptags(content).trim();
          const id = existingId || slugifyLib(plainText, { lower: true, strict: true });
          // Escape the ID to prevent XSS (slug should already be safe, but double-check)
          const escapedId = id.replace(/[<>"'&]/g, '');
          // Preserve the original content with its HTML
          return `<h${level} id="${escapedId}"${attrs}>${content} <a href="#${escapedId}" class="anchor" aria-hidden="true">#</a></h${level}>`;
        }
      );
    });

    /**
     * Process external links to add target="_blank" and rel="noopener noreferrer"
     * Only affects links that point to external domains
     * @example {{ content | external_links }}
     * @example {{ content | external_links: "example.com" }} (specify site domain)
     */
    this.liquid.registerFilter('external_links', (input: string, siteDomain?: string) => {
      if (!input) return '';
      const domain = siteDomain || this.site.config.url?.replace(/^https?:\/\//, '') || '';

      // Match <a> tags with href starting with http:// or https://
      return String(input).replace(
        /<a\s+([^>]*?)href=["'](https?:\/\/)([^"']+)["']([^>]*)>/gi,
        (match, beforeHref, protocol, href, afterHref) => {
          // Extract the domain from the href
          const linkDomain = href.split('/')[0].toLowerCase();

          // Check if it's an internal link (same domain)
          if (domain && linkDomain === domain.toLowerCase()) {
            // Internal link, don't modify
            return match;
          }

          // External link - build new attributes
          let attributes = `${beforeHref}href="${protocol}${href}"${afterHref}`;

          // Add target="_blank" if not already present
          if (!/target\s*=/i.test(attributes)) {
            attributes += ' target="_blank"';
          }

          // Add rel="noopener noreferrer" if not already present
          if (!/rel\s*=/i.test(attributes)) {
            attributes += ' rel="noopener noreferrer"';
          }

          return `<a ${attributes.trim()}>`;
        }
      );
    });

    /**
     * Truncate text to a specified number of words and add ellipsis
     * More intelligent than the built-in truncate filter
     * @example {{ content | truncate_words: 50 }}
     * @example {{ content | truncate_words: 50, "..." }}
     */
    this.liquid.registerFilter(
      'truncate_words',
      (input: string, words: number = 50, ellipsis: string = '...') => {
        if (!input) return '';
        const text = striptags(String(input));
        const wordArray = text.trim().split(/\s+/);
        const limit = Number(words) || 50;
        if (wordArray.length <= limit) {
          return text;
        }
        return wordArray.slice(0, limit).join(' ') + ellipsis;
      }
    );

    /**
     * Generate excerpt from content if not already defined
     * Extracts the first paragraph or first N words
     * @example {{ content | auto_excerpt }}
     * @example {{ content | auto_excerpt: 100 }} (first 100 words)
     */
    this.liquid.registerFilter('auto_excerpt', (input: string, wordLimit?: number) => {
      if (!input) return '';
      const text = striptags(String(input));

      if (wordLimit) {
        // Word-based excerpt
        const words = text.trim().split(/\s+/);
        const limit = Number(wordLimit) || 50;
        return words.slice(0, limit).join(' ') + (words.length > limit ? '...' : '');
      }

      // Paragraph-based excerpt (first paragraph)
      const paragraphs = text.split(/\n\s*\n/);
      const firstParagraph = paragraphs[0]?.trim() || '';
      return firstParagraph;
    });
    // sort_natural - Natural sort (case-insensitive alphabetical)
    this.liquid.registerFilter('sort_natural', (array: any[], property?: string) => {
      if (!Array.isArray(array)) return array;
      const arr = [...array]; // Create a copy to avoid mutating original

      const collator = new Intl.Collator(undefined, {
        numeric: true,
        sensitivity: 'base',
      });

      if (property) {
        // Sort by property (natural, case-insensitive)
        return arr.sort((a, b) => {
          const aVal = a?.[property];
          const bVal = b?.[property];
          if (aVal == null && bVal == null) return 0;
          if (aVal == null) return 1;
          if (bVal == null) return -1;
          return collator.compare(String(aVal), String(bVal));
        });
      }

      // Default natural sort
      return arr.sort((a, b) => collator.compare(String(a), String(b)));
    });

    // find - Find first element matching property value
    this.liquid.registerFilter('find', (array: any[], property: string, value: any) => {
      if (!Array.isArray(array)) return null;
      return array.find((item) => item?.[property] === value) || null;
    });

    // find_exp - Find first element matching expression
    // NOTE: Expression evaluation is not yet fully implemented.
    // This filter will log a warning and return the first element that matches basic truthiness.
    this.liquid.registerFilter('find_exp', (array: any[], variable: string, expression: string) => {
      if (!Array.isArray(array)) return null;
      // Log a warning that full expression evaluation is not supported
      logger.warn(
        `find_exp filter: Full expression evaluation not supported. Expression '${expression}' on variable '${variable}' will not be evaluated. Consider using the 'find' filter instead.`
      );
      // Return first item as a fallback - users should use 'find' filter for property matching
      return array.length > 0 ? array[0] : null;
    });

    // truncate - Truncate string to specified length
    this.liquid.registerFilter(
      'truncate',
      (input: string, length: number = 50, ellipsis: string = '...') => {
        if (!input) return '';
        const str = String(input);
        const len = Number(length) || 50;
        const suffix = ellipsis != null ? String(ellipsis) : '...';

        if (str.length <= len) return str;

        // Jekyll truncates at length including ellipsis
        const truncateLength = Math.max(0, len - suffix.length);
        return str.substring(0, truncateLength) + suffix;
      }
    );

    // truncatewords - Truncate string to specified word count
    this.liquid.registerFilter(
      'truncatewords',
      (input: string, words: number = 15, ellipsis: string = '...') => {
        if (!input) return '';
        const str = String(input);
        const wordCount = Number(words) || 15;
        const suffix = ellipsis != null ? String(ellipsis) : '...';

        const wordArray = str.split(/\s+/);
        if (wordArray.length <= wordCount) return str;

        return wordArray.slice(0, wordCount).join(' ') + suffix;
      }
    );

    // escape_once - HTML escape without double-escaping
    // This is designed to match Jekyll/Ruby's behavior where already-escaped entities
    // are preserved and raw HTML characters are escaped
    this.liquid.registerFilter('escape_once', (input: string) => {
      if (!input) return '';
      const str = String(input);

      // Use a single pass approach to avoid double-escaping issues:
      // Replace only unescaped HTML special characters
      // Already-escaped entities like &amp; should remain unchanged
      return str
        .replace(/[&<>"]/g, (char) => {
          switch (char) {
            case '&':
              // Don't escape if it's already part of an HTML entity
              return '&amp;';
            case '<':
              return '&lt;';
            case '>':
              return '&gt;';
            case '"':
              return '&quot;';
            default:
              return char;
          }
        })
        .replace(/&amp;(amp|lt|gt|quot);/g, '&$1;'); // Restore double-escaped entities
    });

    // Math filters
    this.liquid.registerFilter('plus', (input: number, operand: number) => {
      const a = Number(input);
      const b = Number(operand);
      if (isNaN(a)) return b;
      if (isNaN(b)) return a;
      return a + b;
    });

    this.liquid.registerFilter('minus', (input: number, operand: number) => {
      const a = Number(input);
      const b = Number(operand);
      if (isNaN(a)) return -b;
      if (isNaN(b)) return a;
      return a - b;
    });

    this.liquid.registerFilter('times', (input: number, operand: number) => {
      const a = Number(input);
      const b = Number(operand);
      if (isNaN(a) || isNaN(b)) return 0;
      return a * b;
    });

    this.liquid.registerFilter('divided_by', (input: number, operand: number) => {
      const a = Number(input);
      const b = Number(operand);
      if (isNaN(a) || isNaN(b) || b === 0) return 0;
      // Jekyll always uses floor division, returning an integer result
      return Math.floor(a / b);
    });

    this.liquid.registerFilter('modulo', (input: number, operand: number) => {
      const a = Number(input);
      const b = Number(operand);
      if (isNaN(a) || isNaN(b) || b === 0) return 0;
      return a % b;
    });

    this.liquid.registerFilter('round', (input: number, precision: number = 0) => {
      const num = Number(input);
      const p = Number(precision) || 0;
      if (isNaN(num)) return 0;
      const factor = Math.pow(10, p);
      return Math.round(num * factor) / factor;
    });

    this.liquid.registerFilter('ceil', (input: number) => {
      const num = Number(input);
      if (isNaN(num)) return 0;
      return Math.ceil(num);
    });

    this.liquid.registerFilter('floor', (input: number) => {
      const num = Number(input);
      if (isNaN(num)) return 0;
      return Math.floor(num);
    });

    // Additional string filters for Jekyll compatibility
    this.liquid.registerFilter('upcase', (input: string) => {
      if (!input) return '';
      return String(input).toUpperCase();
    });

    this.liquid.registerFilter('downcase', (input: string) => {
      if (!input) return '';
      return String(input).toLowerCase();
    });

    this.liquid.registerFilter('capitalize', (input: string) => {
      if (!input) return '';
      const str = String(input);
      // Jekyll's capitalize converts entire string to lowercase, then capitalizes first letter
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    });

    this.liquid.registerFilter('strip', (input: string) => {
      if (!input) return '';
      return String(input).trim();
    });

    this.liquid.registerFilter('lstrip', (input: string) => {
      if (!input) return '';
      return String(input).replace(/^\s+/, '');
    });

    this.liquid.registerFilter('rstrip', (input: string) => {
      if (!input) return '';
      return String(input).replace(/\s+$/, '');
    });

    this.liquid.registerFilter('prepend', (input: string, prefix: string) => {
      return (prefix || '') + (input || '');
    });

    this.liquid.registerFilter('append', (input: string, suffix: string) => {
      return (input || '') + (suffix || '');
    });

    this.liquid.registerFilter('remove', (input: string, substring: string) => {
      if (!input || !substring) return input || '';
      return String(input).split(substring).join('');
    });

    this.liquid.registerFilter('remove_first', (input: string, substring: string) => {
      if (!input || !substring) return input || '';
      const str = String(input);
      const index = str.indexOf(substring);
      if (index === -1) return str;
      return str.substring(0, index) + str.substring(index + substring.length);
    });

    this.liquid.registerFilter(
      'replace',
      (input: string, substring: string, replacement: string = '') => {
        if (!input || !substring) return input || '';
        return String(input).split(substring).join(replacement);
      }
    );

    this.liquid.registerFilter(
      'replace_first',
      (input: string, substring: string, replacement: string = '') => {
        if (!input || !substring) return input || '';
        const str = String(input);
        const index = str.indexOf(substring);
        if (index === -1) return str;
        return str.substring(0, index) + replacement + str.substring(index + substring.length);
      }
    );

    this.liquid.registerFilter('split', (input: string, separator: string = ' ') => {
      if (!input) return [];
      return String(input).split(separator);
    });

    // Array filters
    this.liquid.registerFilter('join', (array: any[], separator: string = ' ') => {
      if (!Array.isArray(array)) return String(array || '');
      return array.join(separator);
    });

    this.liquid.registerFilter('first', (array: any[]) => {
      if (!Array.isArray(array)) return null;
      return array.length > 0 ? array[0] : null;
    });

    this.liquid.registerFilter('last', (array: any[]) => {
      if (!Array.isArray(array)) return null;
      return array.length > 0 ? array[array.length - 1] : null;
    });

    this.liquid.registerFilter('reverse', (array: any[]) => {
      if (!Array.isArray(array)) return array;
      return [...array].reverse();
    });

    this.liquid.registerFilter('size', (input: any) => {
      if (Array.isArray(input)) return input.length;
      if (typeof input === 'string') return input.length;
      if (input && typeof input === 'object') return Object.keys(input).length;
      return 0;
    });

    this.liquid.registerFilter('compact', (array: any[]) => {
      if (!Array.isArray(array)) return array;
      return array.filter((item) => item != null);
    });

    this.liquid.registerFilter('concat', (array: any[], other: any[]) => {
      if (!Array.isArray(array)) return other || [];
      if (!Array.isArray(other)) return array;
      return [...array, ...other];
    });

    this.liquid.registerFilter('map', (array: any[], property: string) => {
      if (!Array.isArray(array)) return [];
      return array.map((item) => item?.[property]);
    });

    // Date filter (using strftime library for Ruby-compatible date formatting)
    this.liquid.registerFilter('date', (input: any, formatStr: string = '%Y-%m-%d') => {
      if (!input) return '';
      try {
        const d = this.parseDate(input);
        // Use strftime library directly for Ruby-compatible date formatting
        return strftime(formatStr, d);
      } catch (error) {
        logger.warn(`date filter: ${error instanceof Error ? error.message : 'Invalid date'}`);
        return '';
      }
    });

    // default filter - return default value if input is nil or empty
    // Note: In Jekyll, `false` is a valid value and should NOT trigger the default
    this.liquid.registerFilter('default', (input: any, defaultValue: any = '') => {
      // Only nil (null/undefined) and empty string should use default
      if (input == null || input === '') {
        return defaultValue;
      }
      if (Array.isArray(input) && input.length === 0) {
        return defaultValue;
      }
      // Empty hash/object also uses default, but not false or 0
      if (typeof input === 'object' && !Array.isArray(input) && Object.keys(input).length === 0) {
        return defaultValue;
      }
      return input;
    });
  }

  /**
   * Register Jekyll-compatible Liquid tags
   * Note: Some tags are built into liquidjs, this method adds Jekyll-specific ones
   */
  private registerTags(): void {
    // The 'include' tag is handled by liquidjs with jekyllInclude option
    // Register 'include_cached' as an alias for 'include' for Jekyll compatibility
    // In Jekyll, include_cached is a caching version of include, but since liquidjs
    // already has caching enabled, we can simply alias it to the built-in include tag
    const includeTag = this.liquid.tags['include'];
    if (includeTag) {
      this.liquid.registerTag('include_cached', includeTag);
    } else {
      logger.warn(
        'Could not register include_cached tag: built-in include tag not found in liquidjs'
      );
    }

    // The 'highlight' tag always uses Shiki for syntax highlighting (like Jekyll's Rouge)
    // This preserves backwards compatibility - {% highlight %} tags should always highlight
    const site = this.site; // Capture site reference for use in tag

    this.liquid.registerTag('highlight', {
      parse: function (tagToken: any, remainTokens: any) {
        // Sanitize language to prevent XSS
        this.language = String(tagToken.args.trim()).replace(/[^a-zA-Z0-9_-]/g, '');
        this.templates = [];

        // Parse until we find the endhighlight tag
        const stream = this.liquid.parser.parseStream(remainTokens);
        stream
          .on('tag:endhighlight', () => stream.stop())
          .on('template', (tpl: any) => this.templates.push(tpl))
          .on('end', () => {
            throw new Error('tag "highlight" not closed with endhighlight');
          })
          .start();
      },
      render: async function (ctx: any, emitter: any): Promise<void> {
        // Render template content using a temporary emitter to collect the output
        const { toPromise } = await import('liquidjs');
        const r = this.liquid.renderer;

        // Create a new emitter to collect the rendered content
        const collectingEmitter = {
          buffer: '',
          write: function (chunk: string) {
            this.buffer += chunk;
          },
          break: () => {},
          continue: () => {},
        };

        // Render templates into the collecting emitter
        const iterator = r.renderTemplates(this.templates, ctx, collectingEmitter);
        await toPromise(iterator);
        const content = collectingEmitter.buffer;

        // Always use Shiki for syntax highlighting (backwards compatible with Jekyll's Rouge)
        // Use theme from config if available, otherwise default to github-light
        const syntaxHighlightingConfig = site.config.modern?.syntaxHighlighting;
        const theme = syntaxHighlightingConfig?.theme || 'github-light';
        let result: string;

        try {
          // Use cached module import for better performance
          const syntaxModule = await getSyntaxHighlightingModule();
          const highlighted = await syntaxModule.highlightCode(content, this.language, {
            theme: theme as any,
          });
          result = `<div class="highlight">${highlighted}</div>`;
        } catch (_error) {
          // Fall back to basic highlighting on error
          const escapedContent = escapeHtml(content);
          result = `<div class="highlight"><pre class="highlight"><code class="language-${this.language}">${escapedContent}</code></pre></div>`;
        }

        emitter.write(result);
      },
    });

    // link tag - generates URL for any page, post, collection document, or static file
    // Usage: {% link _posts/2024-01-15-my-post.md %} or {% link about.md %}
    // The path is relative to the site source directory and includes file extension
    this.liquid.registerTag('link', {
      parse(token: any) {
        // Sanitize path to prevent XSS - allow path separators and dots
        this.path = String(token.args.trim()).replace(/[<>"']/g, '');
      },
      render: function (ctx: any) {
        const path = this.path;

        // Get site data from context
        const site =
          ctx.environments?.site || ctx.site || ctx.scopes?.[0]?.site || ctx.globals?.site;
        if (!site) {
          throw new Error(`link tag: site data not found in context for path '${path}'`);
        }

        // Normalize path separators for comparison
        const normalizedPath = normalizePathSeparators(path);

        // Search in pages
        if (site.pages) {
          for (const page of site.pages) {
            const pagePath = normalizePathSeparators(page.relativePath || page.path || '');
            if (pagePath === normalizedPath) {
              if (page.url) {
                return page.url;
              }
            }
          }
        }

        // Search in posts
        if (site.posts) {
          for (const post of site.posts) {
            const postPath = normalizePathSeparators(post.relativePath || post.path || '');
            // Posts are typically in _posts/ directory
            if (postPath === normalizedPath || `_posts/${postPath}` === normalizedPath) {
              if (post.url) {
                return post.url;
              }
            }
          }
        }

        // Search in collections
        if (site.collections) {
          const collections =
            site.collections instanceof Map
              ? Object.fromEntries(site.collections)
              : site.collections;
          for (const [collectionName, docs] of Object.entries(collections)) {
            if (Array.isArray(docs)) {
              for (const doc of docs) {
                const docPath = normalizePathSeparators(doc.relativePath || doc.path || '');
                if (
                  docPath === normalizedPath ||
                  `_${collectionName}/${docPath}` === normalizedPath
                ) {
                  if (doc.url) {
                    return doc.url;
                  }
                }
              }
            }
          }
        }

        // Search in static files
        if (site.static_files) {
          for (const staticFile of site.static_files) {
            // Static files may have different path structures:
            // - Original StaticFile object: has relativePath property
            // - Serialized JSON (from toJSON): has 'path' property which is the URL (e.g., "/assets/style.css")
            let filePath = staticFile.relativePath
              ? normalizePathSeparators(staticFile.relativePath)
              : '';

            // If relativePath not available, reconstruct from URL
            // In serialized JSON, staticFile.path is the URL, not a file path
            if (!filePath && staticFile.path) {
              // Remove leading slash from URL to get relative path for comparison
              filePath = staticFile.path.replace(/^\//g, '');
            }

            if (filePath === normalizedPath) {
              // Return URL - prefer staticFile.url getter, or the serialized path (which is already a URL)
              const url = staticFile.url || staticFile.path || `/${normalizedPath}`;
              return url.startsWith('/') ? url : `/${url}`;
            }
          }
        }

        // File not found - throw error as Jekyll does
        throw new Error(
          `link tag: Could not find document '${path}' in pages, posts, collections, or static files. ` +
            `Make sure the file exists and the path is relative to the site source.`
        );
      },
    });

    // post_url tag - generates URL for a post
    // Usage: {% post_url 2024-01-15-my-post %} or {% post_url subfolder/2024-01-15-my-post %}
    // The identifier is YYYY-MM-DD-title format, without extension
    this.liquid.registerTag('post_url', {
      parse(token: any) {
        // Sanitize postName to prevent XSS - allow path separators, digits, and hyphens
        this.postName = String(token.args.trim()).replace(/[<>"']/g, '');
      },
      render: function (ctx: any) {
        const postIdentifier = this.postName;

        // Get site data from context
        const site =
          ctx.environments?.site || ctx.site || ctx.scopes?.[0]?.site || ctx.globals?.site;
        if (!site) {
          throw new Error(`post_url tag: site data not found in context for '${postIdentifier}'`);
        }

        if (!site.posts || !Array.isArray(site.posts)) {
          throw new Error(`post_url tag: no posts found in site for '${postIdentifier}'`);
        }

        // Normalize path separators
        const normalizedIdentifier = normalizePathSeparators(postIdentifier);

        // Check if identifier includes a subdirectory
        const hasSubdir = normalizedIdentifier.includes('/');
        const identifierParts = hasSubdir
          ? normalizedIdentifier.split('/')
          : [normalizedIdentifier];
        const slug = identifierParts[identifierParts.length - 1];
        const subdir = hasSubdir ? identifierParts.slice(0, -1).join('/') : null;

        // Search for matching post
        for (const post of site.posts) {
          // Get the basename without extension from the post's path
          const postPath = normalizePathSeparators(post.relativePath || post.path || '');

          // Remove _posts/ prefix if present
          const normalizedPostPath = postPath.replace(/^_posts\//, '');

          // Get the filename without extension
          const pathParts = normalizedPostPath.split('/');
          const filename = pathParts[pathParts.length - 1];
          const postSubdir = pathParts.length > 1 ? pathParts.slice(0, -1).join('/') : null;

          // Remove extension to get the identifier
          const filenameWithoutExt = filename?.replace(/\.[^.]+$/, '') || '';

          // Match: check if filename (without extension) matches the slug
          // and if subdirectory matches (if provided)
          if (filenameWithoutExt === slug) {
            // If subdir is specified, it must match
            if (subdir !== null && postSubdir !== subdir) {
              continue;
            }

            if (post.url) {
              return post.url;
            }
          }
        }

        // Post not found - throw error as Jekyll does
        throw new Error(
          `post_url tag: Could not find post '${postIdentifier}'. ` +
            `Use the format YYYY-MM-DD-title (e.g., 2024-01-15-my-post) without file extension. ` +
            `For posts in subdirectories, use subfolder/YYYY-MM-DD-title.`
        );
      },
    });

    // include_relative tag - includes file relative to current file
    this.liquid.registerTag('include_relative', {
      parse(token: any) {
        // Parse the file path from arguments
        // Support both quoted and unquoted paths
        const args = token.args.trim();
        const match = args.match(/^["']?([^"'\s]+)["']?/);
        if (!match) {
          throw new Error('include_relative tag requires a file path argument');
        }
        // Store the raw path - validation happens during render
        this.includePath = match[1];
      },
      render: async function (ctx: any, emitter: any) {
        try {
          // Get the current page path from context
          const page = ctx.environments?.page || ctx.page || ctx.scopes?.[0]?.page;
          if (!page || !page.path) {
            throw new Error('include_relative: current page path not found in context');
          }

          // Get the site source path
          const site = ctx.environments?.site || ctx.site || ctx.scopes?.[0]?.site;
          const sourcePath = site?.source || '.';
          const absoluteSourcePath = resolve(sourcePath);

          // Resolve the include path relative to the current page's directory
          const pagePath = page.path;
          const pageDir = dirname(pagePath);
          const relativePath = normalize(join(pageDir, this.includePath));

          // Resolve to absolute path
          const absolutePath = normalize(resolve(absoluteSourcePath, relativePath));

          // Security check: Ensure the resolved path is within the site source directory
          // This prevents directory traversal attacks
          // path.relative() returns a path starting with '..' if the target is outside the base
          const relativeToSource = relative(absoluteSourcePath, absolutePath);
          if (relativeToSource.startsWith('..')) {
            throw new Error(
              `include_relative: Path '${this.includePath}' resolves outside the site source directory`
            );
          }

          // Check file existence and readability before attempting to read
          if (!existsSync(absolutePath)) {
            throw new Error(`include_relative: File not found: '${this.includePath}'`);
          }

          // Check if it's a file and not a directory
          let stats;
          try {
            stats = statSync(absolutePath);
          } catch (statError) {
            // Handle permission errors on stat
            if ((statError as NodeJS.ErrnoException).code === 'EACCES') {
              throw new Error(`include_relative: Permission denied: '${this.includePath}'`);
            }
            // Re-throw other stat errors
            throw new Error(
              `include_relative: Failed to access file '${this.includePath}': ${statError instanceof Error ? statError.message : 'Unknown error'}`
            );
          }

          if (!stats.isFile()) {
            throw new Error(`include_relative: Path is not a file: '${this.includePath}'`);
          }

          // Read and render the file
          let content: string;
          try {
            content = readFileSync(absolutePath, 'utf-8');
          } catch (readError) {
            // Provide specific error for read failures
            if ((readError as NodeJS.ErrnoException).code === 'EACCES') {
              throw new Error(
                `include_relative: Permission denied reading file: '${this.includePath}'`
              );
            }
            throw new Error(
              `include_relative: Failed to read file '${this.includePath}': ${readError instanceof Error ? readError.message : 'Unknown error'}`
            );
          }

          // Render the included content with the current context
          // Note: Jekyll's include_relative has full access to the current context
          // This is consistent with Jekyll's behavior where included files can access all variables
          const html = await this.liquid.parseAndRender(content, ctx);
          emitter.write(html);
        } catch (error) {
          // Re-throw our specific error messages without wrapping them
          if (error instanceof Error && error.message.startsWith('include_relative:')) {
            throw error;
          }
          // For other errors (like Liquid rendering errors), wrap them
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          throw new Error(
            `include_relative: Failed to include '${this.includePath}': ${errorMessage}`
          );
        }
      },
    });
  }

  /**
   * Render a template string with the given context
   * @param template Template string
   * @param context Context data
   * @returns Rendered output
   */
  async render(template: string, context: Record<string, any> = {}): Promise<string> {
    try {
      return await this.liquid.parseAndRender(template, context);
    } catch (error) {
      if (error instanceof Error) {
        // Extract line/column information if available
        const location = parseErrorLocation(error.message);

        throw new TemplateError(`Liquid template error: ${error.message}`, {
          ...location,
          cause: error,
        });
      }
      throw error;
    }
  }

  /**
   * Render a file with the given context
   * @param filepath File path relative to root
   * @param context Context data
   * @returns Rendered output
   */
  async renderFile(filepath: string, context: Record<string, any> = {}): Promise<string> {
    try {
      return await this.liquid.renderFile(filepath, context);
    } catch (error) {
      if (error instanceof Error) {
        // Extract line/column information if available
        const location = parseErrorLocation(error.message);

        throw new TemplateError(`Failed to render file: ${error.message}`, {
          file: filepath,
          ...location,
          cause: error,
        });
      }
      throw error;
    }
  }

  /**
   * Render a document with its content and layout
   * @param document Document to render
   * @param additionalContext Optional additional context to merge (e.g., paginator)
   * @returns Rendered HTML output
   */
  async renderDocument(
    document: Document,
    additionalContext?: Record<string, unknown>
  ): Promise<string> {
    // Get cached site data
    const siteData = this.ensureSiteDataCached();

    // Create context with document data and cached site data
    const context: Record<string, unknown> = {
      page: {
        ...document.data,
        title: document.title,
        date: document.date,
        url: document.url,
        path: document.relativePath,
        content: document.content,
        categories: document.categories,
        tags: document.tags,
      },
      site: siteData,
      ...additionalContext,
    };

    // First render the document content (processes Liquid tags)
    let content: string;
    try {
      content = await this.render(document.content, context);
    } catch (error) {
      if (error instanceof TemplateError) {
        // Preserve the original error by re-throwing it with updated file context
        throw new TemplateError(error.message, {
          file: document.relativePath,
          line: error.line,
          column: error.column,
          templateName: error.templateName,
          cause: error, // Chain the original error
        });
      }
      throw error;
    }

    // Trigger documents:pre_render hook before conversion
    // Note: Content is provided for inspection but modifications will not be captured;
    // use documents:post_render hook to modify content
    await Hooks.trigger('documents', 'pre_render', {
      document,
      site: this.site,
      renderer: this,
      content,
    });

    // Helper to check if document is markdown using config's markdown_ext
    const markdownExtConfig = this.site.config.markdown_ext || 'markdown,mkdown,mkdn,mkd,md';
    const markdownExtensions = markdownExtConfig
      .split(',')
      .map((e) => '.' + e.trim().toLowerCase());
    const isMarkdownDocument = (ext: string): boolean =>
      markdownExtensions.includes(ext.toLowerCase());

    // Check if there's a custom converter plugin for this document type
    const converter = PluginRegistry.findConverter(document.extname.toLowerCase());
    if (converter) {
      try {
        content = await converter.convert(content, document, this.site);
      } catch (err) {
        logger.warn(
          `Failed to convert '${document.relativePath}' using converter '${converter.name}': ${err instanceof Error ? err.message : String(err)}. Falling back to default processing.`,
          { file: document.relativePath }
        );
        // Fall back to built-in markdown processing if converter fails
        if (isMarkdownDocument(document.extname)) {
          try {
            content = await processMarkdown(content, this.markdownOptions);
          } catch (mdErr) {
            logger.warn(
              `Failed to process markdown for '${document.relativePath}': ${mdErr instanceof Error ? mdErr.message : String(mdErr)}.`,
              { file: document.relativePath }
            );
          }
        }
      }
    } else {
      // Use built-in markdown processing if no custom converter
      if (isMarkdownDocument(document.extname)) {
        try {
          content = await processMarkdown(content, this.markdownOptions);
        } catch (err) {
          // Log the error but don't fail the build - markdown processing can be fragile
          // The content remains as-is (Liquid-rendered), which may already contain HTML
          logger.warn(
            `Failed to process markdown for '${document.relativePath}': ${err instanceof Error ? err.message : String(err)}. Document will be rendered with Liquid-processed content only.`,
            { file: document.relativePath }
          );
        }
      }
    }

    // Trigger documents:post_render hook after conversion but before layout
    // Hooks can modify the content by updating hookContext.content
    const postRenderContext = {
      document,
      site: this.site,
      renderer: this,
      content,
    };
    await Hooks.trigger('documents', 'post_render', postRenderContext);
    // Capture any content modifications made by hooks
    content = postRenderContext.content ?? content;

    // Update context with rendered content
    (context.page as Record<string, unknown>).content = content;

    // If document has a layout, render with layout
    if (document.layout) {
      const layout = this.site.getLayout(document.layout);
      if (layout) {
        try {
          content = await this.renderWithLayout(content, layout, context);
        } catch (error) {
          if (error instanceof TemplateError) {
            // Preserve the original error by re-throwing it with updated context
            throw new TemplateError(
              `Error rendering document with layout '${document.layout}': ${error.message}`,
              {
                file: document.relativePath,
                line: error.line,
                column: error.column,
                templateName: error.templateName || document.layout,
                cause: error, // Chain the original error
              }
            );
          }
          throw error;
        }
      } else {
        logger.warn(
          `Layout '${document.layout}' not found for document '${document.relativePath}'. The document will be rendered without a layout.`
        );
      }
    }

    return content;
  }

  /**
   * Render a document with a paginator object for pagination
   * @param document Document to render (typically index page)
   * @param paginator Paginator object with pagination data
   * @returns Rendered HTML string
   */
  async renderDocumentWithPaginator(document: Document, paginator: Paginator): Promise<string> {
    // Transform paginator posts to include computed properties
    const paginatorContext = {
      paginator: {
        ...paginator,
        posts: paginator.posts.map((post: Document) => ({
          ...post.data,
          title: post.title,
          date: post.date,
          url: post.url,
          path: post.relativePath,
          content: post.content,
          categories: post.categories,
          tags: post.tags,
        })),
      },
    };

    return this.renderDocument(document, paginatorContext);
  }

  /**
   * Render content with a layout
   * @param content Content to wrap in layout
   * @param layout Layout document
   * @param context Render context
   * @param visited Set of visited layout names to prevent circular references
   * @returns Rendered output
   */
  private async renderWithLayout(
    content: string,
    layout: Document,
    context: Record<string, any>,
    visited: Set<string> = new Set()
  ): Promise<string> {
    // Check for circular layout references
    if (visited.has(layout.basename)) {
      throw new TemplateError(
        `Circular layout reference detected: ${Array.from(visited).join(' -> ')} -> ${layout.basename}`,
        {
          file: layout.relativePath,
          templateName: layout.basename,
        }
      );
    }
    visited.add(layout.basename);

    // Add content to context
    context.content = content;

    // Render the layout
    let rendered: string;
    try {
      rendered = await this.render(layout.content, context);
    } catch (error) {
      if (error instanceof TemplateError) {
        // Preserve the original error by re-throwing it with layout context
        throw new TemplateError(error.message, {
          file: layout.relativePath,
          line: error.line,
          column: error.column,
          templateName: error.templateName || layout.basename,
          cause: error, // Chain the original error
        });
      }
      throw error;
    }

    // If the layout itself has a layout, recursively render
    if (layout.layout) {
      const parentLayout = this.site.getLayout(layout.layout);
      if (parentLayout) {
        rendered = await this.renderWithLayout(rendered, parentLayout, context, visited);
      }
    }

    return rendered;
  }

  /**
   * Get the underlying Liquid instance for advanced usage
   * This allows plugins to register custom filters and tags
   */
  getLiquid(): Liquid {
    return this.liquid;
  }

  /**
   * Register a custom filter
   * @param name Filter name
   * @param filter Filter function
   */
  registerFilter(name: string, filter: (...args: any[]) => any): void {
    this.liquid.registerFilter(name, filter);
  }

  /**
   * Register a custom tag
   * @param name Tag name
   * @param tag Tag implementation
   */
  registerTag(name: string, tag: any): void {
    this.liquid.registerTag(name, tag);
  }

  /**
   * Enable emoji processing in markdown (for jemoji plugin)
   * When enabled, :emoji: codes in markdown are automatically converted to unicode
   */
  enableEmojiProcessing(): void {
    this.markdownOptions.emoji = true;
  }

  /**
   * Enable GitHub-style @mentions in markdown (for jekyll-mentions plugin)
   * When enabled, @mentions are automatically converted to links
   * Note: Only @mentions are processed, not issues, PRs, or commits
   * @param options Optional settings (mentionStrong wraps mentions in strong tags)
   */
  enableGitHubMentions(options?: { repository?: string; mentionStrong?: boolean }): void {
    this.markdownOptions.githubMentions = options || true;
  }

  /**
   * Enable syntax highlighting for code blocks in markdown
   * When enabled, code blocks are highlighted using Shiki
   * @param options Optional settings (theme for highlighting)
   */
  enableSyntaxHighlighting(options?: { theme?: string }): void {
    this.markdownOptions.syntaxHighlighting = options || true;
  }

  /**
   * Get current markdown processing options
   */
  getMarkdownOptions(): MarkdownOptions {
    return { ...this.markdownOptions };
  }

  /**
   * Invalidate the cached site data.
   * Call this if the site data has changed and needs to be re-serialized.
   */
  invalidateSiteCache(): void {
    this.cachedSiteData = null;
  }

  /**
   * Pre-cache site data for better performance during batch rendering.
   * Call this before rendering multiple documents to avoid lazy initialization overhead.
   */
  preloadSiteData(): void {
    this.ensureSiteDataCached();
  }

  /**
   * Start loading markdown modules in the background without blocking.
   * This enables parallel initialization with other startup tasks like reading site files.
   * Call waitForMarkdownProcessor() before rendering to ensure initialization is complete.
   */
  startMarkdownProcessorInit(): void {
    if (!this.markdownInitPromise) {
      this.markdownInitPromise = initMarkdownProcessor(this.markdownOptions);
    }
  }

  /**
   * Wait for the background markdown processor initialization to complete.
   * If startMarkdownProcessorInit() was not called, this will initialize synchronously.
   * Resets the promise after completion to allow retrying in watch mode or after errors.
   * @returns Promise that resolves when initialization is complete
   */
  async waitForMarkdownProcessor(): Promise<void> {
    if (this.markdownInitPromise) {
      try {
        await this.markdownInitPromise;
      } finally {
        this.markdownInitPromise = null;
      }
    } else {
      await initMarkdownProcessor(this.markdownOptions);
    }
  }

  /**
   * Pre-initialize the markdown processor for optimal performance.
   * This loads all required remark modules and creates a cached frozen processor.
   * Call this before rendering documents to avoid cold-start latency on first markdown render.
   * @returns Promise that resolves when initialization is complete
   */
  async initializeMarkdownProcessor(): Promise<void> {
    await this.waitForMarkdownProcessor();
  }
}
