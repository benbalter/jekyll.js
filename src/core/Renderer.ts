import { Liquid } from 'liquidjs';
import { Site } from './Site';
import { Document } from './Document';

/**
 * Renderer class handles Liquid template rendering with Jekyll compatibility
 */
export class Renderer {
  private liquid: Liquid;
  private site: Site;

  /**
   * Create a new Renderer
   * @param site Site instance for accessing layouts and includes
   */
  constructor(site: Site) {
    this.site = site;
    this.liquid = new Liquid({
      root: site.source,
      extname: '',
      cache: false,
      strictFilters: false,
      strictVariables: false,
    });

    this.registerFilters();
    this.registerTags();
  }

  /**
   * Register Jekyll-compatible filters
   */
  private registerFilters(): void {
    // Date filters
    this.liquid.registerFilter('date_to_xmlschema', (date: Date | string) => {
      const d = typeof date === 'string' ? new Date(date) : date;
      return d.toISOString();
    });

    this.liquid.registerFilter('date_to_rfc822', (date: Date | string) => {
      const d = typeof date === 'string' ? new Date(date) : date;
      return d.toUTCString();
    });

    this.liquid.registerFilter('date_to_string', (date: Date | string) => {
      const d = typeof date === 'string' ? new Date(date) : date;
      return d.toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    });

    this.liquid.registerFilter('date_to_long_string', (date: Date | string) => {
      const d = typeof date === 'string' ? new Date(date) : date;
      return d.toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    });

    // String filters
    this.liquid.registerFilter('slugify', (str: string) => {
      return str
        .toString()
        .toLowerCase()
        .trim()
        .replace(/[\s_]+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '-')
        .replace(/^-+|-+$/g, '');
    });

    this.liquid.registerFilter('markdownify', (str: string) => {
      // Note: This is a simplified implementation for basic markdown-like formatting.
      // For production use, a proper markdown processor like 'marked' should be used.
      // This handles only the most basic inline formatting.
      return str
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');
    });

    // Array filters
    this.liquid.registerFilter('array_to_sentence_string', (arr: any[]) => {
      if (!Array.isArray(arr) || arr.length === 0) return '';
      if (arr.length === 1) return arr[0].toString();
      if (arr.length === 2) return arr.join(' and ');
      return arr.slice(0, -1).join(', ') + ', and ' + arr[arr.length - 1];
    });

    this.liquid.registerFilter('where', (arr: any[], property: string, value: any) => {
      if (!Array.isArray(arr)) return [];
      return arr.filter(item => item[property] === value);
    });

    this.liquid.registerFilter('where_exp', (arr: any[], property: string, operator: string, value: any) => {
      if (!Array.isArray(arr)) return [];
      return arr.filter(item => {
        const itemValue = item[property];
        switch (operator) {
          case '==': return itemValue == value;
          case '!=': return itemValue != value;
          case '>': return itemValue > value;
          case '<': return itemValue < value;
          case '>=': return itemValue >= value;
          case '<=': return itemValue <= value;
          default: return false;
        }
      });
    });

    this.liquid.registerFilter('group_by', (arr: any[], property: string) => {
      if (!Array.isArray(arr)) return [];
      const grouped = arr.reduce((acc, item) => {
        const key = item[property];
        if (!acc[key]) acc[key] = { name: key, items: [] };
        acc[key].items.push(item);
        return acc;
      }, {} as Record<string, { name: string; items: any[] }>);
      return Object.values(grouped);
    });

    // URL filters
    this.liquid.registerFilter('relative_url', (url: string) => {
      const baseurl = this.site.config.baseurl || '';
      if (!url) return baseurl;
      if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//')) {
        return url;
      }
      return baseurl + (url.startsWith('/') ? url : '/' + url);
    });

    this.liquid.registerFilter('absolute_url', (url: string) => {
      const siteUrl = this.site.config.url || '';
      const baseurl = this.site.config.baseurl || '';
      if (!url) return siteUrl + baseurl;
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
      }
      return siteUrl + baseurl + (url.startsWith('/') ? url : '/' + url);
    });

    // XML escape
    this.liquid.registerFilter('xml_escape', (str: string) => {
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    });

    this.liquid.registerFilter('cgi_escape', (str: string) => {
      return encodeURIComponent(str);
    });

    this.liquid.registerFilter('uri_escape', (str: string) => {
      return encodeURI(str);
    });

    // Number of words
    this.liquid.registerFilter('number_of_words', (str: string) => {
      return str.trim().split(/\s+/).length;
    });
  }

  /**
   * Register Jekyll-compatible tags
   */
  private registerTags(): void {
    // The 'include' tag is handled by liquidjs built-in functionality
    // We just need to set up the include path correctly, which is done in constructor
  }

  /**
   * Render a document's content with its front matter data
   * @param document Document to render
   * @param additionalContext Additional context variables
   * @returns Rendered HTML content
   */
  async renderDocument(
    document: Document,
    additionalContext: Record<string, any> = {}
  ): Promise<string> {
    const context = this.buildContext(document, additionalContext);
    
    try {
      // First render the document content
      let content = await this.liquid.parseAndRender(document.content, context);

      // If the document has a layout, apply it
      if (document.layout) {
        content = await this.applyLayout(document.layout, content, context);
      }

      return content;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(
          `Failed to render ${document.relativePath}: ${error.message}`
        );
      }
      throw error;
    }
  }

  /**
   * Apply a layout to content, handling nested layouts
   * @param layoutName Name of the layout
   * @param content Content to wrap in layout
   * @param context Template context
   * @returns Rendered content with layout applied
   */
  private async applyLayout(
    layoutName: string,
    content: string,
    context: Record<string, any>
  ): Promise<string> {
    const layout = this.site.getLayout(layoutName);
    if (!layout) {
      throw new Error(`Layout "${layoutName}" not found`);
    }

    // Add content to context
    const layoutContext = {
      ...context,
      content,
    };

    // Render the layout
    let rendered = await this.liquid.parseAndRender(layout.content, layoutContext);

    // If the layout has a parent layout, apply it recursively
    if (layout.layout) {
      rendered = await this.applyLayout(layout.layout, rendered, context);
    }

    return rendered;
  }

  /**
   * Build the template context for rendering
   * @param document Document being rendered
   * @param additionalContext Additional context variables
   * @returns Complete context object
   */
  private buildContext(
    document: Document,
    additionalContext: Record<string, any> = {}
  ): Record<string, any> {
    return {
      // Site-wide variables
      site: {
        ...this.site.config,
        time: new Date(),
        pages: this.site.pages.map(p => this.documentToContext(p)),
        posts: this.site.posts.map(p => this.documentToContext(p)),
        collections: Object.fromEntries(
          Array.from(this.site.collections.entries()).map(([name, docs]) => [
            name,
            docs.map(d => this.documentToContext(d)),
          ])
        ),
      },
      // Page/document variables
      page: this.documentToContext(document),
      // Additional context
      ...additionalContext,
    };
  }

  /**
   * Convert a Document to a context object for templates
   * @param document Document to convert
   * @returns Context representation of the document
   */
  private documentToContext(document: Document): Record<string, any> {
    return {
      ...document.data,
      url: document.url,
      title: document.title,
      date: document.date,
      content: document.content,
      excerpt: this.extractExcerpt(document.content),
      path: document.path,
      collection: document.collection,
      categories: document.categories,
      tags: document.tags,
    };
  }

  /**
   * Extract an excerpt from content (first paragraph)
   * @param content Content to extract excerpt from
   * @returns Excerpt text
   */
  private extractExcerpt(content: string): string {
    // Simple excerpt extraction - first paragraph or 150 chars
    const paragraphs = content.split('\n\n');
    const firstPara = paragraphs[0] || '';
    return firstPara.length > 150 ? firstPara.substring(0, 150) + '...' : firstPara;
  }

  /**
   * Render an include file
   * @param includePath Path to the include file (relative to _includes)
   * @param context Template context
   * @returns Rendered include content
   */
  async renderInclude(
    includePath: string,
    context: Record<string, any> = {}
  ): Promise<string> {
    const include = this.site.getInclude(includePath);
    if (!include) {
      throw new Error(`Include "${includePath}" not found`);
    }

    return this.liquid.parseAndRender(include.content, context);
  }
}
