import { existsSync, readdirSync, statSync, readFileSync } from 'fs';
import { join, resolve, extname, dirname, basename } from 'path';
import { Document, DocumentType } from './Document';
import { StaticFile } from './StaticFile';
import { JekyllConfig, loadConfig } from '../config';
import { ThemeManager } from './ThemeManager';
import { logger } from '../utils/logger';
import { FileSystemError } from '../utils/errors';
import yaml from 'js-yaml';

/**
 * Site configuration interface
 * @deprecated Since v0.1.0. Use JekyllConfig from '../config' instead.
 * SiteConfig is now just an alias to JekyllConfig with no functional differences.
 * This alias will be removed in v1.0.0.
 * Migration: import { JekyllConfig } from '../config' or from the main index
 */
export type SiteConfig = JekyllConfig;

/**
 * Factory function to create a Site from a configuration file
 * @param configPath Path to _config.yml (defaults to _config.yml in current directory)
 * @param verbose Whether to print verbose output
 * @returns A new Site instance
 */
export function createSiteFromConfig(
  configPath: string = '_config.yml',
  verbose: boolean = false
): Site {
  const config = loadConfig(configPath, verbose);
  const source = config.source || dirname(resolve(configPath));
  return new Site(source, config);
}

/**
 * Site class represents a Jekyll site and manages all documents
 */
export class Site {
  /** Site configuration */
  public readonly config: SiteConfig;

  /** Source directory path */
  public readonly source: string;

  /** Destination directory path */
  public readonly destination: string;

  /** All pages in the site */
  public readonly pages: Document[] = [];

  /** All posts in the site */
  public readonly posts: Document[] = [];

  /** Collections mapped by collection name */
  public readonly collections: Map<string, Document[]> = new Map();

  /** All layouts in the site */
  public readonly layouts: Map<string, Document> = new Map();

  /** All includes in the site */
  public readonly includes: Map<string, Document> = new Map();

  /** Static files (non-Jekyll files) - now contains StaticFile objects with metadata */
  public readonly static_files: StaticFile[] = [];

  /** Theme manager for handling theme files */
  public readonly themeManager: ThemeManager;

  /** Data files from _data directory */
  public data: Record<string, any> = {};

  /**
   * Create a new Site
   * @param source Source directory path
   * @param config Site configuration
   */
  constructor(source: string, config: SiteConfig = {}) {
    this.source = resolve(source);

    // Validate that source directory exists
    if (!existsSync(this.source)) {
      throw new FileSystemError(`Source directory does not exist: ${this.source}`, {
        file: this.source,
      });
    }

    // Merge default excludes with user-provided excludes
    const defaultExcludes = [
      '_site',
      '.sass-cache',
      '.jekyll-cache',
      '.jekyll-metadata',
      'node_modules',
      'vendor',
    ];
    const mergedExcludes = [...defaultExcludes, ...(config.exclude || [])];

    this.config = {
      ...config,
      source: this.source,
      destination: config.destination || join(this.source, '_site'),
      exclude: mergedExcludes,
      include: config.include || [],
    };
    this.destination = resolve(this.config.destination as string);

    // Initialize theme manager
    this.themeManager = new ThemeManager(this.source, this.config);
  }

  /**
   * Read and process all files in the site
   */
  public async read(): Promise<void> {
    // Read layouts first (they're needed for other documents)
    this.readLayouts();

    // Read includes
    this.readIncludes();

    // Read data files
    this.readData();

    // Read posts
    this.readPosts();

    // Read collections
    this.readCollections();

    // Read pages (do this last to avoid picking up collection docs as pages)
    this.readPages();

    // Read static files
    this.readStaticFiles();
  }

  /**
   * Read all layouts from _layouts directory (site and theme)
   * Site layouts take precedence over theme layouts
   */
  private readLayouts(): void {
    // Get all layout directories (site first, then theme)
    const layoutDirs = this.themeManager.getLayoutDirectories();

    // Read layouts from all directories
    // Site layouts (first in array) will be processed first and added to the map.
    // Theme layouts will only be added if not already present (override mechanism).
    for (const layoutsDir of layoutDirs) {
      const files = this.walkDirectory(layoutsDir);
      for (const file of files) {
        const doc = new Document(file, this.source, DocumentType.LAYOUT);
        // Site layouts take precedence, so only add if not already present
        if (!this.layouts.has(doc.basename)) {
          this.layouts.set(doc.basename, doc);
        }
      }
    }
  }

  /**
   * Read all includes from _includes directory (site and theme)
   * Site includes take precedence over theme includes
   */
  private readIncludes(): void {
    // Get all include directories (site first, then theme)
    const includeDirs = this.themeManager.getIncludeDirectories();

    // Read includes from all directories
    // Site includes (first in array) will be processed first and added to the map.
    // Theme includes will only be added if not already present (override mechanism).
    for (const includesDir of includeDirs) {
      const files = this.walkDirectory(includesDir);
      for (const file of files) {
        const doc = new Document(file, this.source, DocumentType.INCLUDE);
        const relativePath = file.substring(includesDir.length + 1);
        // Site includes take precedence, so only add if not already present
        if (!this.includes.has(relativePath)) {
          this.includes.set(relativePath, doc);
        }
      }
    }
  }

  /**
   * Read all data files from _data directory
   */
  private readData(): void {
    const dataDir = join(this.source, this.config.data_dir || '_data');
    if (!existsSync(dataDir)) {
      return;
    }

    this.data = this.readDataDirectory(dataDir, dataDir);
  }

  /**
   * Recursively read data files from a directory
   * @param dir Directory to read
   * @param baseDir Base data directory for computing relative paths
   * @returns Object containing parsed data files
   */
  private readDataDirectory(dir: string, baseDir: string): Record<string, any> {
    const data: Record<string, any> = {};

    if (!existsSync(dir)) {
      return data;
    }

    const entries = readdirSync(dir);

    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stats = statSync(fullPath);

      if (stats.isDirectory()) {
        // Skip excluded directories
        if (this.shouldExclude(fullPath)) {
          continue;
        }

        // Recursively read subdirectory
        const subData = this.readDataDirectory(fullPath, baseDir);
        if (Object.keys(subData).length > 0) {
          data[entry] = subData;
        }
      } else if (stats.isFile()) {
        // Skip excluded files
        if (this.shouldExclude(fullPath)) {
          continue;
        }

        // Parse data file
        const parsedData = this.parseDataFile(fullPath);
        if (parsedData !== null) {
          // Use filename without extension as key
          const key = basename(entry, extname(entry));
          data[key] = parsedData;
        }
      }
    }

    return data;
  }

  /**
   * Parse a data file (YAML, JSON, etc.)
   * @param filePath Path to the data file
   * @returns Parsed data or null if file cannot be parsed
   */
  private parseDataFile(filePath: string): any {
    const ext = extname(filePath).toLowerCase();

    try {
      const content = readFileSync(filePath, 'utf-8');

      switch (ext) {
        case '.yml':
        case '.yaml':
          return yaml.load(content);
        case '.json':
          return JSON.parse(content);
        // CSV and TSV can be added in the future
        default:
          return null;
      }
    } catch (error) {
      // Log error but don't fail the build
      console.warn(
        `Warning: Failed to parse data file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return null;
    }
  }

  /**
   * Read all posts from _posts directory
   */
  private readPosts(): void {
    const postsDir = join(this.source, '_posts');
    if (!existsSync(postsDir)) {
      return;
    }

    const files = this.walkDirectory(postsDir);
    for (const file of files) {
      if (this.isMarkdownOrHtml(file)) {
        const doc = new Document(file, this.source, DocumentType.POST, undefined, this.config);
        this.posts.push(doc);
      }
    }

    // Sort posts by date (newest first)
    this.posts.sort((a, b) => {
      const dateA = a.date?.getTime() || 0;
      const dateB = b.date?.getTime() || 0;
      return dateB - dateA;
    });
  }

  /**
   * Read all collections defined in config
   */
  private readCollections(): void {
    if (!this.config.collections) {
      return;
    }

    for (const collectionName of Object.keys(this.config.collections)) {
      const collectionDir = join(this.source, `_${collectionName}`);
      if (!existsSync(collectionDir)) {
        continue;
      }

      const files = this.walkDirectory(collectionDir);
      const documents: Document[] = [];

      for (const file of files) {
        if (this.isMarkdownOrHtml(file)) {
          const doc = new Document(
            file,
            this.source,
            DocumentType.COLLECTION,
            collectionName,
            this.config
          );
          documents.push(doc);
        }
      }

      this.collections.set(collectionName, documents);
    }
  }

  /**
   * Read all pages from the source directory
   * Pages are any markdown or HTML files not in special directories
   */
  private readPages(): void {
    const files = this.walkDirectory(this.source, true);

    for (const file of files) {
      if (this.isMarkdownOrHtml(file) && !this.isSpecialDirectory(file)) {
        const doc = new Document(file, this.source, DocumentType.PAGE, undefined, this.config);
        this.pages.push(doc);
      }
    }
  }

  /**
   * Read all static files from the source directory
   * Static files are non-Jekyll files (not markdown, HTML, SASS, or in special directories)
   */
  private readStaticFiles(): void {
    const files = this.walkDirectory(this.source, true);

    for (const file of files) {
      // Skip markdown, HTML, and SASS files - they're processed by Jekyll
      if (this.isMarkdownOrHtml(file)) {
        continue;
      }

      // Skip SASS/SCSS files - they're processed by the SASS processor
      const ext = extname(file).toLowerCase();
      if (['.scss', '.sass'].includes(ext)) {
        continue;
      }

      // Skip files in special directories (underscore-prefixed)
      if (this.isSpecialDirectory(file)) {
        continue;
      }

      // This is a static file
      try {
        const staticFile = new StaticFile(file, this.source);
        this.static_files.push(staticFile);
      } catch (error) {
        // Log warning but don't fail - some files might have permission issues
        logger.warn(`Failed to read static file ${file}`, {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }

  /**
   * Walk a directory recursively and return all file paths
   * @param dir Directory to walk
   * @param shallow If true, don't recurse into subdirectories that start with underscore
   */
  private walkDirectory(dir: string, shallow = false): string[] {
    const files: string[] = [];

    if (!existsSync(dir)) {
      return files;
    }

    const entries = readdirSync(dir);

    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stats = statSync(fullPath);

      if (stats.isDirectory()) {
        // Skip excluded directories
        if (this.shouldExclude(fullPath)) {
          continue;
        }

        // For shallow walks, skip underscore directories except at root
        const rootDir = resolve(this.config.source ?? process.cwd());
        const currentDir = resolve(dir);
        if (shallow && entry.startsWith('_') && currentDir !== rootDir) {
          continue;
        }

        files.push(...this.walkDirectory(fullPath, shallow));
      } else if (stats.isFile()) {
        // Skip excluded files
        if (this.shouldExclude(fullPath)) {
          continue;
        }

        files.push(fullPath);
      }
    }

    return files;
  }

  /**
   * Check if a file path should be excluded based on config
   */
  private shouldExclude(path: string): boolean {
    const relativePath = path.substring(this.source.length + 1);
    const excludePatterns = this.config.exclude || [];

    for (const pattern of excludePatterns) {
      // Simple pattern matching - exact match or starts with
      if (relativePath === pattern || relativePath.startsWith(pattern + '/')) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if a file is in a special Jekyll directory
   */
  private isSpecialDirectory(path: string): boolean {
    const relativePath = path.substring(this.source.length + 1);
    const parts = relativePath.split('/');

    // Check if any part of the path is a special directory (underscore-prefixed).
    // Note: _posts is already handled by directory walking logic and does not reach here.
    for (const part of parts) {
      if (part.startsWith('_')) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if a file is markdown or HTML
   */
  private isMarkdownOrHtml(path: string): boolean {
    const ext = extname(path).toLowerCase();
    return ['.md', '.markdown', '.html', '.htm'].includes(ext);
  }

  /**
   * Get all documents in the site
   */
  public getAllDocuments(): Document[] {
    const allDocs: Document[] = [
      ...this.pages,
      ...this.posts,
      ...Array.from(this.layouts.values()),
      ...Array.from(this.includes.values()),
    ];

    // Add collection documents
    for (const docs of this.collections.values()) {
      allDocs.push(...docs);
    }

    return allDocs;
  }

  /**
   * Get a layout by name
   */
  public getLayout(name: string): Document | undefined {
    return this.layouts.get(name);
  }

  /**
   * Get an include by path
   */
  public getInclude(path: string): Document | undefined {
    return this.includes.get(path);
  }

  /**
   * Get documents from a collection
   */
  public getCollection(name: string): Document[] {
    return this.collections.get(name) || [];
  }

  /**
   * Convert the site to a JSON representation
   */
  public toJSON(): Record<string, any> {
    return {
      config: this.config,
      source: this.source,
      destination: this.destination,
      data: this.data,
      pages: this.pages.map((p) => p.toJSON()),
      posts: this.posts.map((p) => p.toJSON()),
      static_files: this.static_files.map((sf) => sf.toJSON()),
      collections: Object.fromEntries(
        Array.from(this.collections.entries()).map(([name, docs]) => [
          name,
          docs.map((d) => d.toJSON()),
        ])
      ),
      layouts: Object.fromEntries(
        Array.from(this.layouts.entries()).map(([name, doc]) => [name, doc.toJSON()])
      ),
      includes: Object.fromEntries(
        Array.from(this.includes.entries()).map(([name, doc]) => [name, doc.toJSON()])
      ),
    };
  }
}
