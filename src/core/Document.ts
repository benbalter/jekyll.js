import { readFileSync, statSync } from 'fs';
import { basename, extname, relative } from 'path';
import matter from 'gray-matter';
import { FrontMatterError, FileSystemError } from '../utils/errors';

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
   * Create a new Document
   * @param path Absolute path to the file
   * @param sourcePath Source directory path for calculating relative paths
   * @param type Type of document
   * @param collection Optional collection name
   */
  constructor(
    path: string,
    sourcePath: string,
    type: DocumentType,
    collection?: string
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
      const fileContent = readFileSync(path, 'utf-8');
      const parsed = matter(fileContent);

      this.data = parsed.data;
      this.content = parsed.content;
    } catch (error) {
      if (error instanceof Error) {
        // Check if it's a YAML parsing error
        if (error.message.includes('can not read') || 
            error.message.includes('duplicated mapping key') ||
            error.message.includes('unexpected')) {
          throw new FrontMatterError(
            `Failed to parse front matter: ${error.message}`,
            {
              file: this.relativePath,
              cause: error,
            }
          );
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
      path: this.path,
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
      data: this.data,
    };
  }
}
