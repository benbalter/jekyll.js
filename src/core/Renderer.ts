import { Liquid } from 'liquidjs';
import { Site } from './Site';
import { Document } from './Document';
import { logger } from '../utils/logger';
import { TemplateError, parseErrorLocation } from '../utils/errors';
import { processMarkdown } from './markdown';
import slugifyLib from 'slugify';
import { format, parseISO, formatISO, formatRFC7231, isValid } from 'date-fns';

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
      cache: process.env.NODE_ENV === 'production',
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
        logger.warn(`date_to_xmlschema filter: ${error instanceof Error ? error.message : 'Invalid date'}`);
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
        logger.warn(`date_to_rfc822 filter: ${error instanceof Error ? error.message : 'Invalid date'}`);
        return '';
      }
    });

    this.liquid.registerFilter('date_to_string', (date: any) => {
      if (!date) return '';
      try {
        const d = this.parseDate(date);
        return format(d, 'dd MMM yyyy');
      } catch (error) {
        logger.warn(`date_to_string filter: ${error instanceof Error ? error.message : 'Invalid date'}`);
        return '';
      }
    });

    this.liquid.registerFilter('date_to_long_string', (date: any) => {
      if (!date) return '';
      try {
        const d = this.parseDate(date);
        return format(d, 'dd MMMM yyyy');
      } catch (error) {
        logger.warn(`date_to_long_string filter: ${error instanceof Error ? error.message : 'Invalid date'}`);
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

    this.liquid.registerFilter('where_exp', (array: any[], _variable: string, _expression: string) => {
      if (!Array.isArray(array)) return [];
      // TODO: Implement full expression evaluation
      // For now, this is a placeholder that returns the full array
      // A complete implementation would parse and evaluate the expression
      logger.warn('where_exp filter has limited support - returning all items');
      return array;
    });

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

    this.liquid.registerFilter('group_by_exp', (array: any[], _variable: string, _expression: string) => {
      if (!Array.isArray(array)) return [];
      // TODO: Implement full expression evaluation for grouping
      // For now, this is a placeholder that returns empty array
      logger.warn('group_by_exp filter is not yet implemented - returning empty array');
      return [];
    });

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
    this.liquid.registerFilter('array_to_sentence_string', (array: any[], connector: string = 'and') => {
      if (!Array.isArray(array)) return '';
      if (array.length === 0) return '';
      if (array.length === 1) return String(array[0]);
      if (array.length === 2) return `${array[0]} ${connector} ${array[1]}`;
      
      const last = array[array.length - 1];
      const rest = array.slice(0, -1);
      return `${rest.join(', ')}, ${connector} ${last}`;
    });

    // String filters
    this.liquid.registerFilter('markdownify', async (input: string) => {
      if (!input) return '';
      try {
        return await processMarkdown(String(input));
      } catch (error) {
        logger.warn(`markdownify filter failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return input;
      }
    });

    this.liquid.registerFilter('smartify', (input: string) => {
      if (!input) return '';
      return String(input)
        .replace(/\.\.\./g, '…')
        .replace(/--/g, '—')
        .replace(/''/g, '"')    // double single quotes first
        .replace(/``/g, '"')    // double backticks next
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
  }

  /**
   * Register Jekyll-compatible Liquid tags
   * Note: Some tags are built into liquidjs, this method adds Jekyll-specific ones
   */
  private registerTags(): void {
    // The 'include' tag is handled by liquidjs with jekyllInclude option
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
        const escapeHtml = (str: string) => String(str)
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
        
        throw new TemplateError(
          `Liquid template error: ${error.message}`,
          {
            ...location,
            cause: error,
          }
        );
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
        
        throw new TemplateError(
          `Failed to render file: ${error.message}`,
          {
            file: filepath,
            ...location,
            cause: error,
          }
        );
      }
      throw error;
    }
  }

  /**
   * Render a document with its content and layout
   * @param document Document to render
   * @returns Rendered HTML output
   */
  async renderDocument(document: Document): Promise<string> {
    // Create context with document data and site data
    const siteData = this.site.toJSON();
    const context = {
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
        ...siteData.config,  // Flatten config into site for Jekyll compatibility
        config: siteData.config,  // Also keep config for backward compatibility
        pages: siteData.pages,
        posts: siteData.posts,
        collections: siteData.collections,
        source: siteData.source,
        destination: siteData.destination,
      },
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
        content = await processMarkdown(content);
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
    context.page.content = content;

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
        throw new TemplateError(
          error.message,
          {
            file: layout.relativePath,
            line: error.line,
            column: error.column,
            templateName: error.templateName || layout.basename,
            cause: error, // Chain the original error
          }
        );
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
}
