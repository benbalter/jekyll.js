import { readFileSync, statSync } from 'fs';
import { readFile, stat } from 'fs/promises';
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

  /** URL for the generated page */
  public url?: string;

  /**
   * Create a new Document (synchronous constructor for backward compatibility)
   * @param path Absolute path to the file
   * @param sourcePath Source directory path for calculating relative paths
   * @param type Type of document
   * @param collection Optional collection name
   * @param config Optional site configuration for applying front matter defaults
   * @deprecated Use Document.create() for async file operations
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
   * Create a new Document asynchronously
   * This is the preferred method for creating Documents as it uses async I/O
   * @param path Absolute path to the file
   * @param sourcePath Source directory path for calculating relative paths
   * @param type Type of document
   * @param collection Optional collection name
   * @param config Optional site configuration for applying front matter defaults
   * @returns Promise resolving to a new Document instance
   */
  static async create(
    filePath: string,
    sourcePath: string,
    type: DocumentType,
    collection?: string,
    config?: JekyllConfig
  ): Promise<Document> {
    const relPath = relative(sourcePath, filePath);

    // Get file stats asynchronously
    let mtime: Date;
    try {
      const stats = await stat(filePath);
      mtime = stats.mtime;
    } catch (error) {
      throw new FileSystemError(`Failed to read file stats`, {
        file: relPath,
        cause: error instanceof Error ? error : undefined,
      });
    }

    // Read and parse the file asynchronously
    let data: FrontMatter;
    let content: string;
    try {
      // Use encoding from config, defaulting to 'utf-8' (Jekyll default)
      const encoding = config?.encoding || 'utf-8';
      const fileContent = await readFile(filePath, encoding);
      const parsed = matter(fileContent);

      // Apply front matter defaults if config is provided
      if (config) {
        // Determine the document type string for matching
        let docTypeStr: string = type;
        if (type === DocumentType.COLLECTION && collection) {
          docTypeStr = collection; // Use collection name for collection documents
        }

        data = applyFrontMatterDefaults(relPath, docTypeStr, parsed.data, config);
      } else {
        data = parsed.data;
      }

      // Trim leading whitespace from content to match Jekyll's behavior
      // Jekyll strips leading newlines/whitespace between front matter and content
      content = parsed.content.trimStart();
    } catch (error) {
      if (error instanceof Error) {
        // Check if it's a YAML parsing error (from js-yaml via gray-matter)
        if ((error as any).name === 'YAMLException') {
          throw new FrontMatterError(`Failed to parse front matter: ${error.message}`, {
            file: relPath,
            cause: error,
          });
        }

        // Generic file read error
        throw new FileSystemError(`Failed to read file: ${error.message}`, {
          file: relPath,
          cause: error,
        });
      }
      throw error;
    }

    // Create Document using internal factory
    return Document.fromData(filePath, sourcePath, type, collection, mtime, data, content);
  }

  /**
   * Internal factory method to create a Document from pre-loaded data
   * @internal
   */
  private static fromData(
    filePath: string,
    sourcePath: string,
    type: DocumentType,
    collection: string | undefined,
    mtime: Date,
    data: FrontMatter,
    content: string
  ): Document {
    // Create a plain object and set the prototype to Document.prototype
    // This avoids calling the constructor which would re-read the file
    const doc = Object.create(Document.prototype) as Document;

    // Use Object.defineProperty to set readonly properties
    Object.defineProperty(doc, 'path', { value: filePath, writable: false, enumerable: true });
    Object.defineProperty(doc, 'relativePath', {
      value: relative(sourcePath, filePath),
      writable: false,
      enumerable: true,
    });
    Object.defineProperty(doc, 'type', { value: type, writable: false, enumerable: true });
    Object.defineProperty(doc, 'collection', {
      value: collection,
      writable: false,
      enumerable: true,
    });
    Object.defineProperty(doc, 'extname', {
      value: extname(filePath),
      writable: false,
      enumerable: true,
    });
    Object.defineProperty(doc, 'basename', {
      value: basename(filePath, extname(filePath)),
      writable: false,
      enumerable: true,
    });
    Object.defineProperty(doc, 'mtime', { value: mtime, writable: false, enumerable: true });
    Object.defineProperty(doc, 'data', { value: data, writable: false, enumerable: true });
    Object.defineProperty(doc, 'content', { value: content, writable: false, enumerable: true });

    return doc;
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
   */
  get date(): Date | undefined {
    if (this.data.date) {
      return new Date(this.data.date);
    }

    // For posts, try to extract date from filename (YYYY-MM-DD-title format)
    if (this.type === DocumentType.POST) {
      const match = this.basename.match(/^(\d{4})-(\d{2})-(\d{2})-/);
      if (match) {
        const [, year, month, day] = match;
        return new Date(`${year}-${month}-${day}`);
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
   * Convert the document to a JSON representation
   */
  toJSON(): Record<string, any> {
    return {
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
      data: this.data,
    };
  }
}
