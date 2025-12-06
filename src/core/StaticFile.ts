import { statSync } from 'fs';
import { stat } from 'fs/promises';
import { basename, extname, relative, dirname } from 'path';
import { FileSystemError } from '../utils/errors';
import { normalizePathSeparators } from '../utils/path-security';

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

  /** Cached JSON representation for performance.
   * Since all StaticFile properties are immutable, the cache never needs invalidation. */
  private _jsonCache: Record<string, unknown> | null = null;

  /**
   * Create a new StaticFile (synchronous constructor for backward compatibility)
   * @param filePath Absolute path to the file
   * @param sourcePath Source directory path for calculating relative paths
   * @param collection Optional collection name
   * @deprecated Use StaticFile.create() for async file operations
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
   * Create a new StaticFile asynchronously
   * This is the preferred method for creating StaticFiles as it uses async I/O
   * @param filePath Absolute path to the file
   * @param sourcePath Source directory path for calculating relative paths
   * @param collection Optional collection name
   * @returns Promise resolving to a new StaticFile instance
   */
  static async create(
    filePath: string,
    sourcePath: string,
    collection?: string
  ): Promise<StaticFile> {
    const relPath = relative(sourcePath, filePath);

    // Get file stats asynchronously
    let mtime: Date;
    let size: number;
    try {
      const stats = await stat(filePath);
      mtime = stats.mtime;
      size = stats.size;
    } catch (error) {
      throw new FileSystemError(`Failed to read file stats`, {
        file: relPath,
        cause: error instanceof Error ? error : undefined,
      });
    }

    // Create StaticFile using internal factory
    return StaticFile.fromData(filePath, sourcePath, collection, mtime, size);
  }

  /**
   * Internal factory method to create a StaticFile from pre-loaded data
   * @internal
   */
  private static fromData(
    filePath: string,
    sourcePath: string,
    collection: string | undefined,
    mtime: Date,
    size: number
  ): StaticFile {
    // Create a plain object and set the prototype to StaticFile.prototype
    // This avoids calling the constructor which would re-stat the file
    const sf = Object.create(StaticFile.prototype) as StaticFile;

    // Use Object.defineProperty to set readonly properties
    Object.defineProperty(sf, 'path', { value: filePath, writable: false, enumerable: true });
    Object.defineProperty(sf, 'relativePath', {
      value: relative(sourcePath, filePath),
      writable: false,
      enumerable: true,
    });
    Object.defineProperty(sf, 'extname', {
      value: extname(filePath),
      writable: false,
      enumerable: true,
    });
    Object.defineProperty(sf, 'basename', {
      value: basename(filePath, extname(filePath)),
      writable: false,
      enumerable: true,
    });
    Object.defineProperty(sf, 'name', {
      value: basename(filePath),
      writable: false,
      enumerable: true,
    });
    Object.defineProperty(sf, 'collection', {
      value: collection,
      writable: false,
      enumerable: true,
    });
    Object.defineProperty(sf, 'modified_time', { value: mtime, writable: false, enumerable: true });
    Object.defineProperty(sf, 'size', { value: size, writable: false, enumerable: true });

    // Initialize private property to match constructor/field initializers
    // Object.create() does not run field initializers, so we must set it explicitly
    (sf as any)._jsonCache = null;

    return sf;
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
    const urlPath = normalizePathSeparators(this.relativePath);
    return urlPath.startsWith('/') ? urlPath : `/${urlPath}`;
  }

  /**
   * Get the directory containing this file (relative to source)
   */
  get directory(): string {
    const dir = dirname(this.relativePath);
    return dir === '.' ? '' : normalizePathSeparators(dir);
  }

  /**
   * Convert the static file to a JSON representation.
   * This is used to expose static files in Liquid templates as site.static_files.
   * The result is cached for performance - repeated calls return the same object.
   */
  toJSON(): Record<string, unknown> {
    if (this._jsonCache) {
      return this._jsonCache;
    }

    this._jsonCache = {
      path: this.url,
      modified_time: this.modified_time.toISOString(),
      name: this.name,
      basename: this.basename,
      extname: this.extname,
      collection: this.collection,
    };

    return this._jsonCache;
  }
}
