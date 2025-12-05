import { existsSync, readdirSync, statSync, readFileSync, openSync, readSync, closeSync } from 'fs';
import { join, resolve, extname, dirname, basename, relative } from 'path';
import { Document, DocumentType } from './Document';
import { StaticFile } from './StaticFile';
import { JekyllConfig, loadConfig } from '../config';
import { ThemeManager } from './ThemeManager';
import { logger } from '../utils/logger';
import { FileSystemError } from '../utils/errors';
import { walkDirectoryAsync } from '../utils/parallel-fs';
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
    // Ruby Jekyll default excludes: https://github.com/jekyll/jekyll/blob/master/lib/jekyll/configuration.rb
    const defaultExcludes = [
      '.sass-cache',
      '.jekyll-cache',
      'gemfiles',
      'Gemfile',
      'Gemfile.lock',
      'node_modules',
      'vendor/bundle/',
      'vendor/cache/',
      'vendor/gems/',
      'vendor/ruby/',
    ];
    const mergedExcludes = [...defaultExcludes, ...(config.exclude || [])];

    // Resolve destination path
    const resolvedDest = config.destination
      ? resolve(config.destination)
      : join(this.source, '_site');

    // Auto-exclude destination directory if it's inside source (Ruby Jekyll behavior)
    const relativeDest = relative(this.source, resolvedDest);
    if (relativeDest.length > 0 && !relativeDest.startsWith('..')) {
      if (!mergedExcludes.includes(relativeDest)) {
        mergedExcludes.push(relativeDest);
      }
    }

    this.config = {
      ...config,
      source: this.source,
      destination: resolvedDest,
      exclude: mergedExcludes,
      include: config.include || [],
    };
    this.destination = resolve(this.config.destination as string);

    // Initialize theme manager
    this.themeManager = new ThemeManager(this.source, this.config);
  }

  /**
   * Read and process all files in the site
   * Uses parallel file operations for better performance on large sites
   */
  public async read(): Promise<void> {
    // Phase 1: Read layouts and includes in parallel (they may be needed for other documents)
    // These must complete before processing documents that depend on them
    await Promise.all([this.readLayoutsAsync(), this.readIncludesAsync()]);

    // Phase 2: Read data files (synchronous since they're typically small)
    this.readData();

    // Phase 3: Read posts, collections, pages, and static files in parallel
    // These are independent of each other
    await Promise.all([
      this.readPostsAsync(),
      this.readCollectionsAsync(),
      this.readPagesAsync(),
      this.readStaticFilesAsync(),
    ]);
  }

  /**
   * Read all layouts from _layouts directory (site and theme) - async version
   * Site layouts take precedence over theme layouts
   */
  private async readLayoutsAsync(): Promise<void> {
    // Get all layout directories (site first, then theme)
    const layoutDirs = this.themeManager.getLayoutDirectories();

    // Process all layout directories in parallel
    const layoutPromises = layoutDirs.map(async (layoutsDir) => {
      const files = await this.walkSiteDirectoryAsync(layoutsDir);
      return { layoutsDir, files };
    });

    const layoutResults = await Promise.all(layoutPromises);

    // Process files (maintaining site-first precedence)
    for (const { files } of layoutResults) {
      // Create documents in parallel batches
      const docs = await this.createDocumentsParallel(
        files,
        DocumentType.LAYOUT,
        undefined,
        undefined
      );
      for (const doc of docs) {
        // Site layouts take precedence, so only add if not already present
        if (!this.layouts.has(doc.basename)) {
          this.layouts.set(doc.basename, doc);
        }
      }
    }
  }

  /**
   * Read all includes from _includes directory (site and theme) - async version
   * Site includes take precedence over theme includes
   */
  private async readIncludesAsync(): Promise<void> {
    // Get all include directories (site first, then theme)
    const includeDirs = this.themeManager.getIncludeDirectories();

    // Process all include directories in parallel
    const includePromises = includeDirs.map(async (includesDir) => {
      const files = await this.walkSiteDirectoryAsync(includesDir);
      return { includesDir, files };
    });

    const includeResults = await Promise.all(includePromises);

    // Process files (maintaining site-first precedence)
    for (const { includesDir, files } of includeResults) {
      // Create documents in parallel batches
      const docs = await this.createDocumentsParallel(
        files,
        DocumentType.INCLUDE,
        undefined,
        undefined
      );
      for (let i = 0; i < docs.length; i++) {
        const doc = docs[i];
        if (!doc) continue;
        const file = files[i];
        if (!file) continue;
        const relativePath = file.substring(includesDir.length + 1);
        // Site includes take precedence, so only add if not already present
        if (!this.includes.has(relativePath)) {
          this.includes.set(relativePath, doc);
        }
      }
    }
  }

  /**
   * Read all posts from _posts directory - async version
   */
  private async readPostsAsync(): Promise<void> {
    const postsDir = join(this.source, '_posts');
    if (!existsSync(postsDir)) {
      return;
    }

    const files = await this.walkSiteDirectoryAsync(postsDir);
    const markdownFiles = files.filter((file) => this.isMarkdownOrHtml(file));

    // Create documents in parallel batches
    const docs = await this.createDocumentsParallel(
      markdownFiles,
      DocumentType.POST,
      undefined,
      this.config
    );

    this.posts.push(...docs);

    // Sort posts by date (newest first)
    this.posts.sort((a, b) => {
      const dateA = a.date?.getTime() || 0;
      const dateB = b.date?.getTime() || 0;
      return dateB - dateA;
    });
  }

  /**
   * Read all collections defined in config - async version
   */
  private async readCollectionsAsync(): Promise<void> {
    if (!this.config.collections) {
      return;
    }

    const collectionNames = Object.keys(this.config.collections);

    // Process all collections in parallel
    const collectionPromises = collectionNames.map(async (collectionName) => {
      const collectionDir = join(this.source, `_${collectionName}`);
      if (!existsSync(collectionDir)) {
        return { collectionName, documents: [] };
      }

      const files = await this.walkSiteDirectoryAsync(collectionDir);
      const markdownFiles = files.filter((file) => this.isMarkdownOrHtml(file));

      // Create documents in parallel batches
      const documents = await this.createDocumentsParallel(
        markdownFiles,
        DocumentType.COLLECTION,
        collectionName,
        this.config
      );

      return { collectionName, documents };
    });

    const results = await Promise.all(collectionPromises);

    for (const { collectionName, documents } of results) {
      if (documents.length > 0) {
        this.collections.set(collectionName, documents);
      }
    }
  }

  /**
   * Read all pages from the source directory - async version
   * Pages are any markdown or HTML files not in special directories,
   * OR any other files that have YAML front matter (following Jekyll behavior)
   */
  private async readPagesAsync(): Promise<void> {
    const files = await this.walkSiteDirectoryAsync(this.source, true);
    const pageFiles = files.filter((file) => {
      // Skip files in special directories (underscore-prefixed)
      if (this.isSpecialDirectory(file)) {
        return false;
      }

      // Skip SASS/SCSS files - they're processed by the SASS processor
      const ext = extname(file).toLowerCase();
      if (['.scss', '.sass'].includes(ext)) {
        return false;
      }

      // Include markdown/HTML files
      if (this.isMarkdownOrHtml(file)) {
        return true;
      }

      // Include any other file that has front matter (Jekyll behavior)
      // This allows .txt, .xml, .json, etc. with front matter to be processed through Liquid
      return this.hasFrontMatter(file);
    });

    // Create documents in parallel batches
    const docs = await this.createDocumentsParallel(
      pageFiles,
      DocumentType.PAGE,
      undefined,
      this.config
    );

    this.pages.push(...docs);
  }

  /**
   * Read all static files from the source directory - async version
   * Static files are non-Jekyll files (not markdown, HTML, SASS, or in special directories)
   * AND do not have YAML front matter
   */
  private async readStaticFilesAsync(): Promise<void> {
    const files = await this.walkSiteDirectoryAsync(this.source, true);

    // Filter to static files only
    const staticFilePaths = files.filter((file) => {
      // Skip markdown, HTML, and SASS files - they're processed by Jekyll
      if (this.isMarkdownOrHtml(file)) {
        return false;
      }

      // Skip SASS/SCSS files - they're processed by the SASS processor
      const ext = extname(file).toLowerCase();
      if (['.scss', '.sass'].includes(ext)) {
        return false;
      }

      // Skip files in special directories (underscore-prefixed)
      if (this.isSpecialDirectory(file)) {
        return false;
      }

      // Skip files with front matter - they're treated as pages and processed through Liquid
      if (this.hasFrontMatter(file)) {
        return false;
      }

      return true;
    });

    // Create static files in parallel batches
    const staticFiles = await this.createStaticFilesParallel(staticFilePaths);
    this.static_files.push(...staticFiles);
  }

  /**
   * Create documents in batches for error handling and progress tracking.
   *
   * Note: While this method uses async/await and Promise.all, the Document constructor
   * uses synchronous I/O (readFileSync, statSync). This means file reads still happen
   * sequentially on the main thread. True parallelism would require refactoring
   * Document to use async I/O (fs/promises). The batching provides error isolation
   * and allows for potential future async refactoring.
   *
   * @param files Array of file paths
   * @param type Document type
   * @param collection Optional collection name
   * @param config Optional config for front matter defaults
   * @returns Array of created documents
   */
  private async createDocumentsParallel(
    files: string[],
    type: DocumentType,
    collection?: string,
    config?: JekyllConfig
  ): Promise<Document[]> {
    const BATCH_SIZE = 50;
    const documents: Document[] = [];

    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(async (file) => {
        try {
          return new Document(file, this.source, type, collection, config);
        } catch (error) {
          logger.warn(`Failed to create document ${file}`, {
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          return null;
        }
      });

      const results = await Promise.all(batchPromises);
      documents.push(...results.filter((doc): doc is Document => doc !== null));
    }

    return documents;
  }

  /**
   * Create static files in batches for error handling and progress tracking.
   *
   * Note: While this method uses async/await and Promise.all, the StaticFile constructor
   * uses synchronous I/O (statSync). This means stat calls still happen sequentially
   * on the main thread. True parallelism would require refactoring StaticFile to use
   * async I/O (fs/promises). The batching provides error isolation and allows for
   * potential future async refactoring.
   *
   * @param files Array of file paths
   * @returns Array of created static files
   */
  private async createStaticFilesParallel(files: string[]): Promise<StaticFile[]> {
    const BATCH_SIZE = 100;
    const staticFiles: StaticFile[] = [];

    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(async (file) => {
        try {
          return new StaticFile(file, this.source);
        } catch (error) {
          logger.warn(`Failed to read static file ${file}`, {
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          return null;
        }
      });

      const results = await Promise.all(batchPromises);
      staticFiles.push(...results.filter((sf): sf is StaticFile => sf !== null));
    }

    return staticFiles;
  }

  /**
   * Walk a directory recursively and return all file paths - async version
   * Uses the shared walkDirectoryAsync from parallel-fs for better code reuse
   * @param dir Directory to walk
   * @param shallow If true, don't recurse into subdirectories that start with underscore
   */
  private walkSiteDirectoryAsync(dir: string, shallow = false): Promise<string[]> {
    const rootDir = resolve(this.config.source ?? process.cwd());
    return walkDirectoryAsync(dir, {
      shouldExclude: (path: string) => this.shouldExclude(path),
      shallow,
      rootDir,
    });
  }

  /**
   * Read all data files from _data directory (site and theme)
   * Site data takes precedence over theme data
   */
  private readData(): void {
    // First read theme data if available
    // Note: skipExclude=true for theme data since exclude patterns only apply to site files
    const themeDataDir = this.themeManager.getThemeDataDirectory();
    let themeData: Record<string, any> = {};

    if (themeDataDir && existsSync(themeDataDir)) {
      themeData = this.readDataDirectory(themeDataDir, themeDataDir, true);
    }

    // Then read site data (apply exclude patterns)
    const siteDataDir = join(this.source, this.config.data_dir || '_data');
    let siteData: Record<string, any> = {};

    if (existsSync(siteDataDir)) {
      siteData = this.readDataDirectory(siteDataDir, siteDataDir, false);
    }

    // Merge theme data with site data (site takes precedence)
    this.data = this.mergeData(themeData, siteData);
  }

  /**
   * Deep merge two data objects, with the second object taking precedence
   * @param base Base data object (theme data)
   * @param override Override data object (site data)
   * @returns Merged data object
   */
  private mergeData(base: Record<string, any>, override: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = { ...base };

    for (const key of Object.keys(override)) {
      const baseValue = base[key];
      const overrideValue = override[key];

      // If both values are plain objects (not arrays), deep merge them
      if (
        baseValue &&
        overrideValue &&
        typeof baseValue === 'object' &&
        typeof overrideValue === 'object' &&
        !Array.isArray(baseValue) &&
        !Array.isArray(overrideValue)
      ) {
        result[key] = this.mergeData(baseValue, overrideValue);
      } else {
        // Otherwise, override takes precedence
        result[key] = overrideValue;
      }
    }

    return result;
  }

  /**
   * Recursively read data files from a directory
   * @param dir Directory to read
   * @param baseDir Base data directory for computing relative paths
   * @param skipExclude Whether to skip exclusion checks (true for theme data)
   * @returns Object containing parsed data files
   */
  private readDataDirectory(
    dir: string,
    baseDir: string,
    skipExclude: boolean = false
  ): Record<string, any> {
    const data: Record<string, any> = {};

    if (!existsSync(dir)) {
      return data;
    }

    const entries = readdirSync(dir);

    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stats = statSync(fullPath);

      if (stats.isDirectory()) {
        // Skip excluded directories (only for site data, not theme data)
        if (!skipExclude && this.shouldExclude(fullPath)) {
          continue;
        }

        // Recursively read subdirectory
        const subData = this.readDataDirectory(fullPath, baseDir, skipExclude);
        if (Object.keys(subData).length > 0) {
          data[entry] = subData;
        }
      } else if (stats.isFile()) {
        // Skip excluded files (only for site data, not theme data)
        if (!skipExclude && this.shouldExclude(fullPath)) {
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
   * Check if a file path should be excluded based on config
   * Jekyll (Ruby) default behavior:
   * - Files starting with '.', '#', or '~' are excluded by default
   * - The 'include' config can override this to explicitly include hidden files
   * - The 'exclude' config excludes additional files
   */
  private shouldExclude(path: string): boolean {
    const relativePath = path.substring(this.source.length + 1);
    const excludePatterns = this.config.exclude || [];
    const includePatterns = this.config.include || [];

    // Get the filename or directory name
    const parts = relativePath.split('/');
    const firstPart = parts[0] || '';

    // Check if path starts with a hidden file marker (dot, hash, or tilde)
    // These are excluded by default in Jekyll unless explicitly included
    const isHiddenByDefault = firstPart.startsWith('.') || firstPart.startsWith('#') || firstPart.startsWith('~');

    if (isHiddenByDefault) {
      // Check if explicitly included
      const isExplicitlyIncluded = includePatterns.some((pattern) => {
        const normalizedPattern = pattern.startsWith('/') ? pattern.slice(1) : pattern;
        return relativePath === normalizedPattern || relativePath.startsWith(normalizedPattern + '/');
      });

      if (!isExplicitlyIncluded) {
        return true; // Exclude hidden files by default
      }
    }

    // Check against exclude patterns
    for (const pattern of excludePatterns) {
      // Normalize pattern - remove leading slash if present
      // Jekyll (Ruby) treats patterns with and without leading slashes the same
      const normalizedPattern = pattern.startsWith('/') ? pattern.slice(1) : pattern;

      // Simple pattern matching - exact match or starts with
      if (relativePath === normalizedPattern || relativePath.startsWith(normalizedPattern + '/')) {
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
   * Check if a file has YAML front matter
   * Front matter starts with --- on the first line and has a closing ---
   * For efficiency, we only read the first 4KB of the file to detect front matter
   */
  private hasFrontMatter(filePath: string): boolean {
    let fd: number | null = null;
    try {
      // Read only the first 4KB - this is enough to detect front matter
      // Front matter is typically small (metadata only)
      const buffer = Buffer.alloc(4096);
      fd = openSync(filePath, 'r');
      const bytesRead = readSync(fd, buffer, 0, 4096, 0);
      const content = buffer.toString('utf-8', 0, bytesRead);

      // Check for front matter structure: starts with --- and has closing ---
      const trimmed = content.trimStart();
      if (!trimmed.startsWith('---')) {
        return false;
      }

      // Find the closing --- (must be on its own line after the opening ---)
      const lines = trimmed.split('\n');
      if (lines.length < 2) {
        return false;
      }

      // Look for closing --- after the first line
      for (let i = 1; i < lines.length; i++) {
        if (lines[i]?.trim() === '---') {
          return true;
        }
      }

      return false;
    } catch {
      return false;
    } finally {
      if (fd !== null) {
        try {
          closeSync(fd);
        } catch {
          // Ignore close errors
        }
      }
    }
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
