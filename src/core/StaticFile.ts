import { statSync } from 'fs';
import { basename, extname, relative, dirname } from 'path';
import { FileSystemError } from '../utils/errors';

/**
 * StaticFile class represents a static file (non-Jekyll processed) in the site
 * 
 * Static files are files that don't have front matter and are copied as-is to the destination.
 * This includes images, fonts, JavaScript files, CSS files, PDFs, etc.
 * 
 * @see https://jekyllrb.com/docs/static-files/
 */
export class StaticFile {
  /** Absolute path to the file */
  public readonly path: string;

  /** Relative path from the site source */
  public readonly relativePath: string;

  /** File extension (including the dot) */
  public readonly extname: string;

  /** Base name without extension */
  public readonly basename: string;

  /** File name with extension */
  public readonly name: string;

  /** File modification time */
  public readonly modified_time: Date;

  /** File size in bytes */
  public readonly size: number;

  /** Collection name (if this static file is in a collection directory) */
  public readonly collection?: string;

  /**
   * Create a new StaticFile
   * @param filePath Absolute path to the file
   * @param sourcePath Source directory path for calculating relative paths
   * @param collection Optional collection name
   */
  constructor(filePath: string, sourcePath: string, collection?: string) {
    this.path = filePath;
    this.relativePath = relative(sourcePath, filePath);
    this.extname = extname(filePath);
    this.basename = basename(filePath, this.extname);
    this.name = basename(filePath);
    this.collection = collection;

    // Get file stats
    try {
      const stats = statSync(filePath);
      this.modified_time = stats.mtime;
      this.size = stats.size;
    } catch (error) {
      throw new FileSystemError(`Failed to read file stats`, {
        file: this.relativePath,
        cause: error instanceof Error ? error : undefined,
      });
    }
  }

  /**
   * Get the destination path relative to the destination directory
   * This is the same as the relative path for most static files
   */
  get destinationRelativePath(): string {
    return this.relativePath;
  }

  /**
   * Get the URL for this static file
   * Converts the relative path to a URL path
   */
  get url(): string {
    // Convert backslashes to forward slashes for URL
    const urlPath = this.relativePath.replace(/\\/g, '/');
    return urlPath.startsWith('/') ? urlPath : `/${urlPath}`;
  }

  /**
   * Get the directory containing this file (relative to source)
   */
  get directory(): string {
    const dir = dirname(this.relativePath);
    return dir === '.' ? '' : dir.replace(/\\/g, '/');
  }

  /**
   * Convert the static file to a JSON representation
   * This is used to expose static files in Liquid templates as site.static_files
   */
  toJSON(): Record<string, unknown> {
    return {
      path: this.url,
      modified_time: this.modified_time.toISOString(),
      name: this.name,
      basename: this.basename,
      extname: this.extname,
      collection: this.collection,
    };
  }
}
