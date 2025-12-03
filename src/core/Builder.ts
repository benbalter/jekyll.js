import { Site } from './Site';
import { Renderer } from './Renderer';
import { Document, DocumentType } from './Document';
import { generatePagination, getPaginatedFilePath } from './Paginator';
import { SassProcessor } from './SassProcessor';
import { logger } from '../utils/logger';
import { BuildError, FileSystemError, JekyllError } from '../utils/errors';
import { PerformanceTimer, BuildTimings } from '../utils/timer';
import {
  mkdirSync,
  writeFileSync,
  existsSync,
  readdirSync,
  statSync,
  copyFileSync,
  readFileSync,
} from 'fs';
import { join, dirname, extname, basename, relative, sep } from 'path';
import { rmSync } from 'fs';
import { registerPlugins } from '../plugins';
import { CacheManager } from './CacheManager';
import matter from 'gray-matter';

/**
 * Normalize path separators to forward slashes for consistent comparison
 * @param path Path to normalize
 * @returns Path with forward slashes
 */
function normalizePath(path: string): string {
  return path.split(sep).join('/');
}

/**
 * Check if a path matches or is inside a keep pattern
 * @param path Path to check (forward-slash normalized)
 * @param pattern Keep pattern to match against (forward-slash normalized)
 * @returns True if path matches or is inside the pattern
 */
function pathMatchesOrInside(path: string, pattern: string): boolean {
  return path === pattern || path.startsWith(pattern + '/');
}

/**
 * Builder options interface
 */
export interface BuilderOptions {
  /** Whether to show drafts (unpublished posts) */
  showDrafts?: boolean;

  /** Whether to show future-dated posts */
  showFuture?: boolean;

  /** Clean destination directory before build */
  clean?: boolean;

  /** Verbose output */
  verbose?: boolean;

  /** Enable incremental builds */
  incremental?: boolean;

  /** Enable performance timing for benchmarks */
  timing?: boolean;
}

/**
 * Builder class orchestrates the static site build process
 */
export class Builder {
  private site: Site;
  private renderer: Renderer;
  private sassProcessor: SassProcessor;
  private options: BuilderOptions;
  private cacheManager: CacheManager;
  private timer: PerformanceTimer | null = null;

  /**
   * Create a new Builder instance
   * @param site Site instance
   * @param options Builder options
   */
  constructor(site: Site, options: BuilderOptions = {}) {
    this.site = site;

    // Get layout and include directories from site (includes theme directories)
    const layoutDirs = site.themeManager.getLayoutDirectories();
    const includeDirs = site.themeManager.getIncludeDirectories();

    this.renderer = new Renderer(site, {
      layoutsDir:
        layoutDirs.length > 0
          ? layoutDirs
          : [join(site.source, site.config.layouts_dir || '_layouts')],
      includesDir:
        includeDirs.length > 0
          ? includeDirs
          : [join(site.source, site.config.includes_dir || '_includes')],
    });

    // Initialize SASS processor
    this.sassProcessor = new SassProcessor({
      source: site.source,
      config: site.config,
    });

    this.options = {
      showDrafts: false,
      showFuture: false,
      clean: true,
      verbose: false,
      incremental: false,
      timing: false,
      ...options,
    };

    // Initialize timer if timing is enabled
    if (this.options.timing) {
      this.timer = new PerformanceTimer();
    }

    // Configure logger based on options
    logger.setVerbose(this.options.verbose || false);

    // Initialize cache manager
    this.cacheManager = new CacheManager(site.source);

    // Register plugins
    registerPlugins(this.renderer, this.site);
  }

  /**
   * Build the entire site
   * @returns Build timings if timing is enabled, otherwise undefined
   */
  async build(): Promise<BuildTimings | undefined> {
    logger.section('Building Site');

    // Start the timer if timing is enabled
    if (this.timer) {
      this.timer.start();
    }

    try {
      // Read all site files
      logger.info('Reading site files...');
      if (this.timer) {
        await this.timer.timeAsync(
          'Read site files',
          () => this.site.read(),
          () =>
            `${this.site.pages.length} pages, ${this.site.posts.length} posts, ${this.site.static_files.length} static files`
        );
      } else {
        await this.site.read();
      }
      logger.debug(`Found ${this.site.pages.length} pages, ${this.site.posts.length} posts`, {
        collections: Array.from(this.site.collections.keys()).join(', '),
      });

      // Clean destination directory if needed (skip for incremental)
      if (this.options.clean && !this.options.incremental) {
        if (this.timer) {
          this.timer.timeSync('Clean destination', () => this.cleanDestination());
        } else {
          this.cleanDestination();
        }
      }

      // Ensure destination exists
      try {
        mkdirSync(this.site.destination, { recursive: true });
      } catch (error) {
        throw new FileSystemError('Failed to create destination directory', {
          file: this.site.destination,
          cause: error instanceof Error ? error : undefined,
        });
      }

      // Generate URLs for all documents
      logger.info('Generating URLs...');
      if (this.timer) {
        this.timer.timeSync('Generate URLs', () => this.generateUrls());
      } else {
        this.generateUrls();
      }

      // Determine what needs to be rebuilt
      let pagesToRender = this.site.pages;
      let postsToRender = this.site.posts;
      let collectionsToRender = new Map(this.site.collections);

      if (this.options.incremental) {
        const cacheStats = this.cacheManager.getStats();
        logger.info(`Using incremental build (${cacheStats.fileCount} files cached)`);

        // Filter documents that need rebuilding
        pagesToRender = this.filterChangedDocuments(this.site.pages);
        postsToRender = this.filterChangedDocuments(this.site.posts);

        // Filter collection documents
        collectionsToRender = new Map();
        for (const [name, docs] of this.site.collections) {
          const changedDocs = this.filterChangedDocuments(docs);
          if (changedDocs.length > 0) {
            collectionsToRender.set(name, changedDocs);
          }
        }

        const totalToRender =
          pagesToRender.length +
          postsToRender.length +
          Array.from(collectionsToRender.values()).reduce((sum, docs) => sum + docs.length, 0);

        if (totalToRender === 0) {
          logger.success('No changes detected, skipping build');
          // Save cache in case it was newly initialized or loaded from old version
          this.cacheManager.save();
          return this.timer?.getTimings();
        }

        logger.info(`Rebuilding ${totalToRender} changed files`);
      }

      // Render pages
      if (this.timer) {
        await this.timer.timeAsync(
          'Render pages',
          () => this.renderPages(pagesToRender),
          () => `${pagesToRender.length} pages`
        );
      } else {
        await this.renderPages(pagesToRender);
      }

      // Render posts
      if (this.timer) {
        await this.timer.timeAsync(
          'Render posts',
          () => this.renderPosts(postsToRender),
          () => `${this.getFilteredPosts(postsToRender).length} posts`
        );
      } else {
        await this.renderPosts(postsToRender);
      }

      // Render pagination pages if enabled
      if (this.timer) {
        await this.timer.timeAsync('Render pagination', () => this.renderPagination());
      } else {
        await this.renderPagination();
      }

      // Render collections
      if (this.timer) {
        const collectionCount = Array.from(collectionsToRender.values()).reduce(
          (sum, docs) => sum + docs.length,
          0
        );
        await this.timer.timeAsync(
          'Render collections',
          () => this.renderCollections(collectionsToRender),
          () => `${collectionCount} documents`
        );
      } else {
        await this.renderCollections(collectionsToRender);
      }

      // Process SASS/SCSS files
      if (this.timer) {
        this.timer.timeSync('Process SASS/SCSS', () => this.processSassFiles());
      } else {
        this.processSassFiles();
      }

      // Copy static files
      if (this.timer) {
        this.timer.timeSync(
          'Copy static files',
          () => this.copyStaticFiles(),
          () => `${this.site.static_files.length} files`
        );
      } else {
        this.copyStaticFiles();
      }

      // Generate plugin output files (sitemap, feed, etc.)
      // In incremental mode, only regenerate if documents were rebuilt
      const totalRendered =
        pagesToRender.length +
        postsToRender.length +
        Array.from(collectionsToRender.values()).reduce((sum, docs) => sum + docs.length, 0);
      if (!this.options.incremental || totalRendered > 0) {
        if (this.timer) {
          this.timer.timeSync('Generate plugin files', () => this.generatePluginFiles());
        } else {
          this.generatePluginFiles();
        }
      }

      // Save cache if incremental mode is enabled
      if (this.options.incremental) {
        this.cacheManager.save();
      }

      logger.success(`Site built successfully to ${this.site.destination}`);

      // Return timings if timing is enabled
      return this.timer?.getTimings();
    } catch (error) {
      // Re-throw specific errors as-is, or log and exit
      if (error instanceof JekyllError) {
        throw error; // Already has proper context
      }
      // Only wrap unknown errors
      throw new BuildError('Build failed', {
        cause: error instanceof Error ? error : undefined,
      });
    }
  }

  /**
   * Clean the destination directory, respecting keep_files configuration
   * Files and directories listed in keep_files will not be deleted
   */
  private cleanDestination(): void {
    if (!existsSync(this.site.destination)) {
      return;
    }

    const keepFiles = this.site.config.keep_files || [];

    // If no keep_files, do a simple recursive delete
    if (keepFiles.length === 0) {
      logger.info(`Cleaning destination directory: ${this.site.destination}`);
      try {
        rmSync(this.site.destination, { recursive: true, force: true });
      } catch (error) {
        throw new FileSystemError('Failed to clean destination directory', {
          file: this.site.destination,
          cause: error instanceof Error ? error : undefined,
        });
      }
      return;
    }

    // Selective cleaning: delete everything except keep_files
    logger.info(
      `Cleaning destination directory (keeping: ${keepFiles.join(', ')}): ${this.site.destination}`
    );
    this.cleanDirectorySelectively(this.site.destination, keepFiles);
  }

  /**
   * Recursively clean a directory while preserving files/dirs in keep_files
   * @param dir Directory to clean
   * @param keepFiles Files/directories to keep (relative to destination)
   * @param relativePath Current relative path from destination
   */
  private cleanDirectorySelectively(
    dir: string,
    keepFiles: string[],
    relativePath: string = ''
  ): void {
    if (!existsSync(dir)) {
      return;
    }

    // Normalize keep patterns to use forward slashes
    const normalizedKeepFiles = keepFiles.map(normalizePath);

    const entries = readdirSync(dir);

    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const relPath = relativePath ? join(relativePath, entry) : entry;
      const normalizedRelPath = normalizePath(relPath);

      // Check if this path should be kept
      const shouldKeep = normalizedKeepFiles.some((keepPattern) => {
        // Path matches or is inside a kept directory
        if (pathMatchesOrInside(normalizedRelPath, keepPattern)) {
          return true;
        }
        // keepPattern is inside relPath (so relPath dir contains a keep file)
        if (pathMatchesOrInside(keepPattern, normalizedRelPath)) {
          return true;
        }
        return false;
      });

      if (shouldKeep) {
        // Check if this is a directory that contains something to keep
        const containsKeptFile = normalizedKeepFiles.some(
          (keepPattern) =>
            pathMatchesOrInside(keepPattern, normalizedRelPath) && keepPattern !== normalizedRelPath
        );

        if (containsKeptFile && statSync(fullPath).isDirectory()) {
          // Recurse into the directory
          this.cleanDirectorySelectively(fullPath, keepFiles, relPath);
        }
        // Otherwise, keep the entire file/directory
        continue;
      }

      // Delete this entry
      try {
        rmSync(fullPath, { recursive: true, force: true });
      } catch (error) {
        logger.warn(
          `Failed to delete ${relPath}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  }

  /**
   * Generate URLs for all documents based on permalinks and conventions
   */
  private generateUrls(): void {
    // Generate URLs for pages
    for (const page of this.site.pages) {
      page.url = this.generateUrl(page);
    }

    // Generate URLs for posts
    for (const post of this.site.posts) {
      post.url = this.generateUrl(post);
    }

    // Generate URLs for collection documents
    for (const [collectionName, documents] of this.site.collections) {
      const collectionConfig = this.site.config.collections?.[collectionName];
      const outputCollection = collectionConfig?.output !== false;

      if (outputCollection) {
        for (const doc of documents) {
          doc.url = this.generateUrl(doc);
        }
      }
    }
  }

  /**
   * Generate URL for a document
   */
  private generateUrl(doc: Document): string {
    // Use permalink if specified
    if (doc.permalink) {
      return this.normalizeUrl(doc.permalink);
    }

    // Generate URL based on document type
    switch (doc.type) {
      case DocumentType.POST:
        return this.generatePostUrl(doc);
      case DocumentType.PAGE:
        return this.generatePageUrl(doc);
      case DocumentType.COLLECTION:
        return this.generateCollectionUrl(doc);
      default:
        return '/';
    }
  }

  /**
   * Generate URL for a post
   */
  private generatePostUrl(post: Document): string {
    const date = post.date || new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    // Get slug from basename (remove date prefix for posts)
    let slug = post.basename;
    const dateMatch = slug.match(/^\d{4}-\d{2}-\d{2}-(.*)/);
    if (dateMatch && dateMatch[1]) {
      slug = dateMatch[1];
    }

    // Apply permalink pattern (default: /:categories/:year/:month/:day/:title.html)
    const categories = post.categories.join('/');
    const categoryPath = categories ? `/${categories}` : '';

    return this.normalizeUrl(`${categoryPath}/${year}/${month}/${day}/${slug}.html`);
  }

  /**
   * Generate URL for a page
   */
  private generatePageUrl(page: Document): string {
    // Get relative path from source
    let urlPath = page.relativePath;

    // Remove extension and handle index files
    const ext = extname(urlPath);
    const base = basename(urlPath, ext);
    const dir = dirname(urlPath);

    if (base === 'index') {
      urlPath = dir === '.' ? '/' : `/${dir}/`;
    } else {
      urlPath = dir === '.' ? `/${base}.html` : `/${dir}/${base}.html`;
    }

    return this.normalizeUrl(urlPath);
  }

  /**
   * Generate URL for a collection document
   */
  private generateCollectionUrl(doc: Document): string {
    if (!doc.collection) {
      return '/';
    }

    const slug = doc.basename;
    return this.normalizeUrl(`/${doc.collection}/${slug}.html`);
  }

  /**
   * Normalize URL (ensure it starts with / and has correct slashes)
   */
  private normalizeUrl(url: string): string {
    // Ensure starts with /
    if (!url.startsWith('/')) {
      url = '/' + url;
    }

    // Replace backslashes with forward slashes
    url = url.replace(/\\/g, '/');

    // Remove double slashes
    url = url.replace(/\/+/g, '/');

    return url;
  }

  /**
   * Render all pages
   */
  private async renderPages(pages?: Document[]): Promise<void> {
    const pagesToRender = pages || this.site.pages;
    logger.info(`Rendering ${pagesToRender.length} pages...`);

    await Promise.all(pagesToRender.map((page) => this.renderDocument(page)));
  }

  /**
   * Get filtered posts based on draft and future post options
   * @param posts Optional array of posts to filter (defaults to all site posts)
   * @returns Filtered array of posts
   */
  private getFilteredPosts(posts?: Document[]): Document[] {
    const postsToFilter = posts || this.site.posts;
    return postsToFilter.filter((post) => {
      // Filter unpublished posts unless showDrafts is enabled
      if (!post.published && !this.options.showDrafts) {
        return false;
      }
      // Filter future posts unless showFuture is enabled
      if (!this.options.showFuture && post.date && post.date > new Date()) {
        return false;
      }
      return true;
    });
  }

  /**
   * Render all posts
   * @param posts Optional array of posts to render (for incremental builds)
   */
  private async renderPosts(posts?: Document[]): Promise<void> {
    const filteredPosts = this.getFilteredPosts(posts);

    logger.info(`Rendering ${filteredPosts.length} posts...`);

    await Promise.all(filteredPosts.map((post) => this.renderDocument(post)));
  }

  /**
   * Render pagination pages if pagination is enabled
   */
  private async renderPagination(): Promise<void> {
    // Check if pagination is enabled
    const perPage = this.site.config.paginate;
    if (!perPage || perPage <= 0) {
      return;
    }

    // Get filtered posts for pagination
    const posts = this.getFilteredPosts();

    // Generate pagination data
    const paginators = generatePagination(posts, this.site.config);

    if (paginators.length === 0) {
      return;
    }

    logger.info(`Generating ${paginators.length} pagination pages...`);

    // Find the index page that should be used for pagination
    // Pagination requires an index.html or index.md in the source root
    const indexPage = this.site.pages.find((page) => {
      const baseName = basename(page.relativePath, extname(page.relativePath));
      return baseName === 'index' && dirname(page.relativePath) === '.';
    });

    if (!indexPage) {
      logger.warn('Pagination enabled but no index page found. Skipping pagination.');
      return;
    }

    // Get pagination path pattern
    const paginatePath = this.site.config.paginate_path || '/page:num/';

    // Render each paginated page in parallel
    await Promise.all(
      paginators.map(async (paginator) => {
        // Render the page with the paginator object in context
        const html = await this.renderer.renderDocumentWithPaginator(indexPage, paginator);

        // Get output path for this paginated page
        const filePath = getPaginatedFilePath(paginator.page, paginatePath);
        const outputPath = join(this.site.destination, filePath);

        // Ensure directory exists
        try {
          mkdirSync(dirname(outputPath), { recursive: true });
        } catch (error) {
          throw new FileSystemError('Failed to create pagination output directory', {
            file: dirname(outputPath),
            cause: error instanceof Error ? error : undefined,
          });
        }

        // Write file
        try {
          writeFileSync(outputPath, html, 'utf-8');
        } catch (error) {
          throw new FileSystemError('Failed to write pagination file', {
            file: outputPath,
            cause: error instanceof Error ? error : undefined,
          });
        }

        logger.debug(`Rendered pagination page ${paginator.page} → ${filePath}`);
      })
    );
  }

  /**
   * Render all collections
   */
  private async renderCollections(collections?: Map<string, Document[]>): Promise<void> {
    const collectionsToRender = collections || this.site.collections;

    const collectionPromises: Promise<void[]>[] = [];

    for (const [collectionName, documents] of collectionsToRender) {
      const collectionConfig = this.site.config.collections?.[collectionName];
      const outputCollection = collectionConfig?.output !== false;

      if (!outputCollection) {
        logger.debug(`Skipping collection '${collectionName}' (output: false)`);
        continue;
      }

      logger.info(`Rendering ${documents.length} documents from collection '${collectionName}'...`);

      collectionPromises.push(Promise.all(documents.map((doc) => this.renderDocument(doc))));
    }

    await Promise.all(collectionPromises);
  }

  /**
   * Render a single document and write to destination
   */
  private async renderDocument(doc: Document): Promise<void> {
    try {
      // Render the document
      const html = await this.renderer.renderDocument(doc);

      // Get output path
      const outputPath = this.getOutputPath(doc);

      // Ensure directory exists
      try {
        mkdirSync(dirname(outputPath), { recursive: true });
      } catch (error) {
        throw new FileSystemError('Failed to create output directory', {
          file: dirname(outputPath),
          cause: error instanceof Error ? error : undefined,
        });
      }

      // Write file
      try {
        writeFileSync(outputPath, html, 'utf-8');
      } catch (error) {
        throw new FileSystemError('Failed to write output file', {
          file: outputPath,
          cause: error instanceof Error ? error : undefined,
        });
      }

      // Update cache with document and its dependencies
      if (this.options.incremental) {
        const dependencies: string[] = [];

        // Track layout dependency
        if (doc.layout) {
          const layout = this.site.getLayout(doc.layout);
          if (layout) {
            dependencies.push(layout.relativePath);
          }
        }

        // Update cache
        this.cacheManager.updateFile(doc.path, doc.relativePath, dependencies);
      }

      logger.debug(
        `Rendered: ${doc.relativePath} → ${relative(this.site.destination, outputPath)}`
      );
    } catch (error) {
      // Wrap error with document context for structured error handling
      // The build() method will handle final error logging
      throw new BuildError(
        `Failed to render document: ${error instanceof Error ? error.message : String(error)}`,
        {
          file: doc.relativePath,
          cause: error instanceof Error ? error : undefined,
        }
      );
    }
  }

  /**
   * Get output file path for a document
   */
  private getOutputPath(doc: Document): string {
    if (!doc.url) {
      throw new Error(`Document ${doc.relativePath} has no URL`);
    }

    // Convert URL to file path
    let filePath = doc.url;

    // Remove leading slash
    if (filePath.startsWith('/')) {
      filePath = filePath.substring(1);
    }

    // If URL ends with / or is empty (root), use index.html
    if (filePath.endsWith('/') || filePath === '') {
      filePath = join(filePath, 'index.html');
    }

    return join(this.site.destination, filePath);
  }

  /**
   * Process SASS/SCSS files and compile them to CSS
   */
  private processSassFiles(): void {
    const sassFiles = this.findSassFiles(this.site.source);

    if (sassFiles.length === 0) {
      return;
    }

    logger.info(`Processing ${sassFiles.length} SASS/SCSS files...`);

    for (const file of sassFiles) {
      try {
        // Read the file
        const fileContent = readFileSync(file, 'utf-8');

        // Parse front matter
        const parsed = matter(fileContent);

        // Only process files with front matter (Jekyll convention)
        // We detect front matter by comparing content to original: if gray-matter removed
        // delimiters (---), the content will differ from the original file content.
        // This approach correctly identifies both empty front matter (---\n---) and
        // front matter with data, while skipping files with no delimiters at all.
        const hasFrontMatter = fileContent.trimStart().startsWith('---');
        if (!hasFrontMatter) {
          logger.debug(`Skipping ${relative(this.site.source, file)} (no front matter)`);
          continue;
        }

        // Compile SASS/SCSS
        const css = this.sassProcessor.process(file, parsed.content);

        // Determine output path (replace .scss/.sass with .css)
        const relativePath = relative(this.site.source, file);
        const outputPath = relativePath.replace(/\.(scss|sass)$/, '.css');
        const destPath = join(this.site.destination, outputPath);

        // Ensure directory exists
        mkdirSync(dirname(destPath), { recursive: true });

        // Write CSS file
        writeFileSync(destPath, css, 'utf-8');

        logger.debug(`Compiled: ${relativePath} → ${outputPath}`);
      } catch (error) {
        logger.warn(`Failed to process SASS file: ${relative(this.site.source, file)}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /**
   * Find all SASS/SCSS files in the site (excluding _sass directory)
   * @param dir Directory to search
   * @param files Accumulator for found files
   * @param isRoot Whether this is the root source directory
   */
  private findSassFiles(dir: string, files: string[] = [], isRoot: boolean = true): string[] {
    if (!existsSync(dir)) {
      return files;
    }

    const entries = readdirSync(dir);

    for (const entry of entries) {
      const fullPath = join(dir, entry);

      // Skip if excluded
      if (this.shouldExclude(fullPath)) {
        continue;
      }

      const stats = statSync(fullPath);

      if (stats.isDirectory()) {
        // Skip Jekyll special directories (underscore-prefixed) only at root level
        // This prevents processing _sass, _layouts, _includes, etc. at the root,
        // but allows processing nested directories like css/_nested
        if (isRoot && this.isJekyllDirectory(entry)) {
          continue;
        }

        // Recurse into directory (no longer at root level)
        this.findSassFiles(fullPath, files, false);
      } else if (stats.isFile()) {
        const ext = extname(fullPath).toLowerCase();
        if (['.scss', '.sass'].includes(ext)) {
          files.push(fullPath);
        }
      }
    }

    return files;
  }

  /**
   * Copy static files (non-Jekyll files) to destination
   * Uses the static_files array from Site and skips unchanged files for optimization
   */
  private copyStaticFiles(): void {
    const staticFiles = this.site.static_files;

    logger.info(`Copying ${staticFiles.length} static files...`);

    let copiedCount = 0;
    let skippedCount = 0;

    for (const staticFile of staticFiles) {
      const destPath = join(this.site.destination, staticFile.destinationRelativePath);

      try {
        // Ensure directory exists
        mkdirSync(dirname(destPath), { recursive: true });

        // Check if destination file exists and has same or newer modification time
        if (existsSync(destPath)) {
          const destStats = statSync(destPath);
          // Skip if destination is newer than or same age as source
          if (destStats.mtime >= staticFile.modified_time) {
            skippedCount++;
            logger.debug(`Skipped (unchanged): ${staticFile.relativePath}`);
            continue;
          }
        }

        // Copy file
        copyFileSync(staticFile.path, destPath);
        copiedCount++;

        logger.debug(`Copied: ${staticFile.relativePath}`);
      } catch (error) {
        logger.warn(`Failed to copy static file: ${staticFile.relativePath}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (skippedCount > 0) {
      logger.debug(`Static files: ${copiedCount} copied, ${skippedCount} skipped (unchanged)`);
    }
  }

  /**
   * Check if a path should be excluded
   */
  private shouldExclude(path: string): boolean {
    const relativePath = relative(this.site.source, path);
    const excludePatterns = this.site.config.exclude || [];

    for (const pattern of excludePatterns) {
      if (relativePath === pattern || relativePath.startsWith(pattern + '/')) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if a directory name is a special directory that should be excluded
   * Includes Jekyll directories (underscore-prefixed) and version control
   */
  private isJekyllDirectory(name: string): boolean {
    return name.startsWith('_') || name === '.git';
  }

  /**
   * Generate plugin output files (sitemap, feed, etc.)
   */
  private generatePluginFiles(): void {
    const configuredPlugins = this.site.config.plugins || [];

    // Generate sitemap if plugin is enabled
    if (configuredPlugins.length === 0 || configuredPlugins.includes('jekyll-sitemap')) {
      const sitemapPlugin = (this.site as any)._sitemapPlugin;
      if (sitemapPlugin) {
        try {
          const sitemapContent = sitemapPlugin.generateSitemap(this.site);
          const sitemapPath = join(this.site.destination, 'sitemap.xml');
          writeFileSync(sitemapPath, sitemapContent, 'utf-8');
          logger.debug('Generated sitemap.xml');
        } catch (error) {
          logger.warn('Failed to generate sitemap', {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    // Generate feed if plugin is enabled
    if (configuredPlugins.length === 0 || configuredPlugins.includes('jekyll-feed')) {
      const feedPlugin = (this.site as any)._feedPlugin;
      if (feedPlugin) {
        try {
          const feedContent = feedPlugin.generateFeed(this.site);
          const feedPath = this.site.config.feed?.path || '/feed.xml';
          const feedFilePath = join(this.site.destination, feedPath.replace(/^\//, ''));

          // Ensure directory exists
          mkdirSync(dirname(feedFilePath), { recursive: true });

          writeFileSync(feedFilePath, feedContent, 'utf-8');
          logger.debug(`Generated ${feedPath}`);
        } catch (error) {
          logger.warn('Failed to generate feed', {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }
  }

  /**
   * Filter documents to only include those that have changed
   * @param documents List of documents to filter
   * @returns Documents that need to be rebuilt
   */
  private filterChangedDocuments(documents: Document[]): Document[] {
    return documents.filter((doc) => {
      // Check if document itself has changed
      if (this.cacheManager.hasChanged(doc.path, doc.relativePath)) {
        logger.debug(`Changed: ${doc.relativePath}`);
        return true;
      }

      // Check if any dependencies have changed (includes layouts tracked in cache)
      if (this.cacheManager.hasDependencyChanges(doc.relativePath, this.site.source)) {
        logger.debug(`Dependency changed for: ${doc.relativePath}`);
        return true;
      }

      return false;
    });
  }

  /**
   * Get the renderer instance
   */
  getRenderer(): Renderer {
    return this.renderer;
  }

  /**
   * Get the site instance
   */
  getSite(): Site {
    return this.site;
  }

  /**
   * Get the build timing statistics (only available if timing option is enabled)
   * @returns Build timing statistics or undefined if timing is not enabled
   */
  getTimings(): BuildTimings | undefined {
    return this.timer?.getTimings();
  }
}
