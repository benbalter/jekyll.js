import { Liquid } from 'liquidjs';
import { Site } from './Site';
import { Document } from './Document';
import { Paginator } from './Paginator';
import { logger } from '../utils/logger';
import { TemplateError, parseErrorLocation } from '../utils/errors';
import { processMarkdown, MarkdownOptions } from './markdown';
import slugifyLib from 'slugify';
import { format, parseISO, formatISO, formatRFC7231, isValid } from 'date-fns';
import striptags from 'striptags';
import { dirname, join, resolve, normalize, relative } from 'path';
import { readFileSync, existsSync, statSync } from 'fs';

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

    // Array filters
    this.liquid.registerFilter('where', (array: any[], key: string, value?: any) => {
      if (!Array.isArray(array)) return [];
      if (value === undefined) {
        // If no value provided, filter for truthy values
        return array.filter((item) => item && item[key]);
      }
      return array.filter((item) => item && item[key] === value);
    });

    this.liquid.registerFilter(
      'where_exp',
      (array: any[], _variable: string, _expression: string) => {
        if (!Array.isArray(array)) return [];
        // TODO: Implement full expression evaluation
        // For now, this is a placeholder that returns the full array
        // A complete implementation would parse and evaluate the expression
        logger.warn('where_exp filter has limited support - returning all items');
        return array;
      }
    );

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

    this.liquid.registerFilter(
      'group_by_exp',
      (array: any[], _variable: string, _expression: string) => {
        if (!Array.isArray(array)) return [];
        // TODO: Implement full expression evaluation for grouping
        // For now, this is a placeholder that returns empty array
        logger.warn('group_by_exp filter is not yet implemented - returning empty array');
        return [];
      }
    );

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

    this.liquid.registerFilter('smartify', (input: string) => {
      if (!input) return '';
      return String(input)
        .replace(/\.\.\./g, '…')
        .replace(/--/g, '—')
        .replace(/''/g, '"') // double single quotes first
        .replace(/``/g, '"') // double backticks next
        .replace(/'/g, '\u2019') // then remaining single quotes
        .replace(/`/g, '\u2018'); // then remaining backticks
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
      return String(input).replace(/\n/g, '<br>\n');
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

    // Date filter (using date-fns format)
    this.liquid.registerFilter('date', (input: any, formatStr: string = '%Y-%m-%d') => {
      if (!input) return '';
      try {
        const d = this.parseDate(input);
        // Convert Ruby strftime format to date-fns format
        const dateFormat = this.strftimeToDateFns(formatStr);
        return format(d, dateFormat);
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
   * Convert Ruby strftime format to date-fns format
   * @param strftime Ruby strftime format string
   * @returns date-fns compatible format string
   */
  private strftimeToDateFns(strftime: string): string {
    const conversions: Record<string, string> = {
      '%Y': 'yyyy', // 4-digit year
      '%y': 'yy', // 2-digit year
      '%m': 'MM', // Month (01-12)
      '%B': 'MMMM', // Full month name
      '%b': 'MMM', // Abbreviated month name
      '%d': 'dd', // Day of month (01-31)
      '%e': 'd', // Day of month (1-31)
      '%H': 'HH', // Hour (00-23)
      '%I': 'hh', // Hour (01-12)
      '%M': 'mm', // Minute (00-59)
      '%S': 'ss', // Second (00-59)
      '%p': 'a', // AM/PM
      '%A': 'EEEE', // Full weekday name
      '%a': 'EEE', // Abbreviated weekday name
      '%j': 'DDD', // Day of year (001-366)
      '%w': 'e', // Day of week (0-6)
      '%Z': 'zzz', // Timezone name
      '%z': 'xxx', // Timezone offset
      '%%': '%', // Literal %
    };

    let result = strftime;
    for (const [pattern, replacement] of Object.entries(conversions)) {
      // Escape special regex characters in the pattern
      // In this case, patterns like '%Y' only have '%' which needs escaping
      const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\%]/g, '\\$&');
      result = result.replace(new RegExp(escapedPattern, 'g'), replacement);
    }
    return result;
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

    // The 'highlight' tag would require custom implementation with a syntax highlighter
    // For now, we'll add a basic highlight tag that just wraps content

    this.liquid.registerTag('highlight', {
      parse(token: any) {
        // Sanitize language to prevent XSS
        this.language = String(token.args.trim()).replace(/[^a-zA-Z0-9_-]/g, '');
      },
      render: async function* (_ctx: any): any {
        const content = yield this.liquid.renderer.renderTemplates(this.templates, _ctx);
        // Escape HTML special characters in content to prevent XSS
        const escapeHtml = (str: string) =>
          String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
        const escapedContent = escapeHtml(content);
        return `<div class="highlight"><pre class="highlight"><code class="language-${this.language}">${escapedContent}</code></pre></div>`;
      },
    });

    // link tag for linking to posts
    this.liquid.registerTag('link', {
      parse(token: any) {
        // Sanitize path to prevent XSS
        this.path = String(token.args.trim()).replace(/[<>"']/g, '');
      },
      render: function (_ctx: any) {
        // Simplified - would need to resolve post paths
        return this.path;
      },
    });

    // post_url tag
    this.liquid.registerTag('post_url', {
      parse(token: any) {
        // Sanitize postName to prevent XSS
        this.postName = String(token.args.trim()).replace(/[<>"']/g, '');
      },
      render: function (_ctx: any) {
        // Simplified - would need to resolve post URLs from site
        return `/${this.postName}`;
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
    // Create context with document data and site data
    const siteData = this.site.toJSON();
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
      site: {
        ...siteData.config, // Flatten config into site for Jekyll compatibility
        config: siteData.config, // Also keep config for backward compatibility
        data: siteData.data, // Add data files
        pages: siteData.pages,
        posts: siteData.posts,
        static_files: siteData.static_files, // Add static files
        collections: siteData.collections,
        source: siteData.source,
        destination: siteData.destination,
      },
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

    // If document is markdown, convert to HTML
    const isMarkdown = ['.md', '.markdown'].includes(document.extname.toLowerCase());
    if (isMarkdown) {
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
   * Get current markdown processing options
   */
  getMarkdownOptions(): MarkdownOptions {
    return { ...this.markdownOptions };
  }
}
