import { readFileSync, statSync } from 'fs';
import { basename, extname, relative } from 'path';
import matter from 'gray-matter';
import { FrontMatterError, FileSystemError } from '../utils/errors';
import { JekyllConfig, applyFrontMatterDefaults } from '../config';

/**
 * Document type enum
 */
export enum DocumentType {
  PAGE = 'page',
  POST = 'post',
  COLLECTION = 'collection',
  LAYOUT = 'layout',
  INCLUDE = 'include',
}

/**
 * Front matter data interface
 */
export interface FrontMatter {
  [key: string]: any;
}

/**
 * Document class represents a single file in the Jekyll site
 * This includes pages, posts, collection documents, layouts, and includes
 */
export class Document {
  /** Absolute path to the file */
  public readonly path: string;

  /** Relative path from the site source */
  public readonly relativePath: string;

  /** Type of document */
  public readonly type: DocumentType;

  /** Front matter data parsed from the file */
  public readonly data: FrontMatter;

  /** Raw content (without front matter) */
  public readonly content: string;

  /** File extension */
  public readonly extname: string;

  /** Base name without extension */
  public readonly basename: string;

  /** File modification time */
  public readonly mtime: Date;

  /** Collection name (if this is a collection document) */
  public readonly collection?: string;

  /** URL for the generated page (backing field) */
  private _url?: string;

  /** Cached JSON representation (invalidated when url changes) */
  private _jsonCache: Record<string, any> | null = null;

  /**
   * Create a new Document
   * @param path Absolute path to the file
   * @param sourcePath Source directory path for calculating relative paths
   * @param type Type of document
   * @param collection Optional collection name
   * @param config Optional site configuration for applying front matter defaults
   */
  constructor(
    path: string,
    sourcePath: string,
    type: DocumentType,
    collection?: string,
    config?: JekyllConfig
  ) {
    this.path = path;
    this.relativePath = relative(sourcePath, path);
    this.type = type;
    this.collection = collection;
    this.extname = extname(path);
    this.basename = basename(path, this.extname);

    // Get file stats
    try {
      const stats = statSync(path);
      this.mtime = stats.mtime;
    } catch (error) {
      throw new FileSystemError(`Failed to read file stats`, {
        file: this.relativePath,
        cause: error instanceof Error ? error : undefined,
      });
    }

    // Parse the file
    try {
      // Use encoding from config, defaulting to 'utf-8' (Jekyll default)
      const encoding = config?.encoding || 'utf-8';
      const fileContent = readFileSync(path, encoding);
      const parsed = matter(fileContent);

      // Apply front matter defaults if config is provided
      if (config) {
        // Determine the document type string for matching
        let docTypeStr: string = type;
        if (type === DocumentType.COLLECTION && collection) {
          docTypeStr = collection; // Use collection name for collection documents
        }

        this.data = applyFrontMatterDefaults(this.relativePath, docTypeStr, parsed.data, config);
      } else {
        this.data = parsed.data;
      }

      // Trim leading whitespace from content to match Jekyll's behavior
      // Jekyll strips leading newlines/whitespace between front matter and content
      this.content = parsed.content.trimStart();
    } catch (error) {
      if (error instanceof Error) {
        // Check if it's a YAML parsing error (from js-yaml via gray-matter)
        if ((error as any).name === 'YAMLException') {
          throw new FrontMatterError(`Failed to parse front matter: ${error.message}`, {
            file: this.relativePath,
            cause: error,
          });
        }

        // Generic file read error
        throw new FileSystemError(`Failed to read file: ${error.message}`, {
          file: this.relativePath,
          cause: error,
        });
      }
      throw error;
    }
  }

  /**
   * URL for the generated page
   * Setting the URL invalidates the cached JSON representation
   */
  get url(): string | undefined {
    return this._url;
  }

  set url(value: string | undefined) {
    this._url = value;
    // Invalidate JSON cache when URL changes
    this._jsonCache = null;
  }

  /**
   * Check if the document has front matter
   */
  get hasFrontMatter(): boolean {
    return Object.keys(this.data).length > 0;
  }

  /**
   * Get the title of the document
   * Looks for 'title' in front matter, falls back to basename
   */
  get title(): string {
    return this.data.title || this.basename;
  }

  /**
   * Get the date from front matter or filename (for posts)
   * Returns a Date object where the calendar date (year, month, day) is preserved
   * regardless of the local timezone by storing the date as UTC midnight.
   */
  get date(): Date | undefined {
    if (this.data.date) {
      // Front matter dates: Parse and convert to UTC midnight to ensure
      // consistent calendar date regardless of timezone
      const parsed = new Date(this.data.date);
      if (!isNaN(parsed.getTime())) {
        // Use the parsed date's UTC components to create a new date at UTC midnight
        return new Date(
          Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate())
        );
      }
      return undefined;
    }

    // For posts, try to extract date from filename (YYYY-MM-DD-title format)
    if (this.type === DocumentType.POST) {
      const match = this.basename.match(/^(\d{4})-(\d{2})-(\d{2})-/);
      if (match && match[1] && match[2] && match[3]) {
        const year = match[1];
        const month = match[2];
        const day = match[3];
        // Use Date.UTC to ensure the date represents midnight UTC on the specified date
        // This prevents timezone-related date shifts when using getFullYear/Month/Date later
        return new Date(Date.UTC(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10)));
      }
    }

    return undefined;
  }

  /**
   * Check if the document is published
   * Documents are published unless explicitly marked as draft or published: false
   */
  get published(): boolean {
    if (this.data.published === false) {
      return false;
    }
    if (this.data.draft === true) {
      return false;
    }
    return true;
  }

  /**
   * Get the layout name from front matter
   */
  get layout(): string | undefined {
    return this.data.layout;
  }

  /**
   * Get permalink from front matter
   */
  get permalink(): string | undefined {
    return this.data.permalink;
  }

  /**
   * Get categories from front matter
   */
  get categories(): string[] {
    if (Array.isArray(this.data.categories)) {
      return this.data.categories;
    }
    if (typeof this.data.category === 'string') {
      return [this.data.category];
    }
    if (typeof this.data.categories === 'string') {
      return this.data.categories.trim() ? this.data.categories.split(/\s+/) : [];
    }
    return [];
  }

  /**
   * Get tags from front matter
   */
  get tags(): string[] {
    if (Array.isArray(this.data.tags)) {
      return this.data.tags;
    }
    if (typeof this.data.tag === 'string') {
      return [this.data.tag];
    }
    if (typeof this.data.tags === 'string') {
      return this.data.tags.trim() ? this.data.tags.split(/\s+/) : [];
    }
    return [];
  }

  /**
   * Convert the document to a JSON representation.
   * The result is cached for performance - repeated calls return the same object.
   * The cache is automatically invalidated when the URL is set.
   */
  toJSON(): Record<string, any> {
    // Return cached JSON if available
    if (this._jsonCache) {
      return this._jsonCache;
    }

    // Create and cache the JSON representation
    this._jsonCache = {
      // In Jekyll, page.path is the relative path (e.g., "about.md")
      path: this.relativePath,
      // Keep relativePath for backward compatibility
      relativePath: this.relativePath,
      type: this.type,
      collection: this.collection,
      extname: this.extname,
      basename: this.basename,
      title: this.title,
      date: this.date?.toISOString(),
      published: this.published,
      layout: this.layout,
      permalink: this.permalink,
      categories: this.categories,
      tags: this.tags,
      url: this.url,
      // Include content for templates that need to access page.content
      content: this.content,
      data: { ...this.data },
    };

    return this._jsonCache;
  }
}
