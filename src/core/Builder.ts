import { Site } from './Site';
import { Renderer } from './Renderer';
import { Document, DocumentType } from './Document';
import { generatePagination, getPaginatedFilePath } from './Paginator';
import { SassProcessor } from './SassProcessor';
import { logger } from '../utils/logger';
import { BuildError, FileSystemError, JekyllError } from '../utils/errors';
import { PerformanceTimer, BuildTimings } from '../utils/timer';
import {
  isPathWithinBase,
  sanitizePermalink,
  shouldExcludePath,
  normalizePathSeparators,
} from '../utils/path-security';
import { existsSync, readdirSync, statSync } from 'fs';
import { writeFile, mkdir, readFile, copyFile, stat, rm, readdir } from 'fs/promises';
import { join, dirname, extname, basename, relative, resolve, normalize } from 'path';
import { createProgressIndicator } from '../utils/progress';
import { registerPlugins, PluginRegistry, Hooks } from '../plugins';
import { CacheManager } from './CacheManager';
import matter from 'gray-matter';
import {
  minifyHtml,
  isHtmlMinificationEnabled,
  getHtmlMinificationOptions,
} from '../plugins/html-minifier';
import {
  injectResourceHints,
  isResourceHintsEnabled,
  getResourceHintsOptions,
} from '../plugins/resource-hints';

/**
 * Minimum number of documents required to show progress indicators
 * Below this threshold, progress bars add visual noise without value
 */
const PROGRESS_THRESHOLD = 5;

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
 * Default batch size for parallel file operations.
 * This limits the number of concurrent file operations to avoid overwhelming
 * the file system and to provide better error isolation.
 */
const DEFAULT_BATCH_SIZE = 50;

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

  /** Show progress indicators during build (default: true for TTY) */
  showProgress?: boolean;
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
      // Default to showing progress only on TTY terminals
      showProgress: process.stdout.isTTY,
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
      // Start markdown processor initialization in background (non-blocking)
      // This allows module loading to happen in parallel with reading site files
      this.renderer.startMarkdownProcessorInit();

      // Read all site files (markdown modules load in parallel)
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

      // Invalidate cached site data since site.read() updates pages, posts, collections
      this.renderer.invalidateSiteCache();

      logger.debug(`Found ${this.site.pages.length} pages, ${this.site.posts.length} posts`, {
        collections: Array.from(this.site.collections.keys()).join(', '),
      });

      // Trigger posts:post_init hook
      await Hooks.trigger('posts', 'post_init', { site: this.site, renderer: this.renderer });

      // Trigger pages:post_init hook
      await Hooks.trigger('pages', 'post_init', { site: this.site, renderer: this.renderer });

      // Clean destination directory if needed (skip for incremental)
      if (this.options.clean && !this.options.incremental) {
        if (this.timer) {
          await this.timer.timeAsync('Clean destination', () => this.cleanDestination());
        } else {
          await this.cleanDestination();
        }
      }

      // Ensure destination exists
      try {
        await mkdir(this.site.destination, { recursive: true });
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

      // Run generator plugins after URLs are generated but before rendering
      if (this.timer) {
        await this.timer.timeAsync('Run generators', () => this.runGenerators());
      } else {
        await this.runGenerators();
      }

      // Pre-cache site data before batch rendering operations for better performance
      this.renderer.preloadSiteData();

      // Wait for markdown processor initialization to complete
      // By now, modules should be loaded (started in parallel with site.read())
      // This just ensures initialization is complete before rendering
      if (this.timer) {
        await this.timer.timeAsync('Initialize markdown', () =>
          this.renderer.waitForMarkdownProcessor()
        );
      } else {
        await this.renderer.waitForMarkdownProcessor();
      }

      // Trigger site:pre_render hook
      await Hooks.trigger('site', 'pre_render', { site: this.site, renderer: this.renderer });

      // Determine what needs to be rebuilt
      let pagesToRender = this.site.pages;
      let postsToRender = this.site.posts;
      let collectionsToRender = new Map(this.site.collections);

      if (this.options.incremental) {
        const cacheStats = this.cacheManager.getStats();
        logger.info(`Using incremental build (${cacheStats.fileCount} files cached)`);

        // Filter documents that need rebuilding - use parallel async checks
        const [filteredPages, filteredPosts] = await Promise.all([
          this.filterChangedDocuments(this.site.pages),
          this.filterChangedDocuments(this.site.posts),
        ]);
        pagesToRender = filteredPages;
        postsToRender = filteredPosts;

        // Filter collection documents in parallel
        collectionsToRender = new Map();
        const collectionPromises = Array.from(this.site.collections.entries()).map(
          async ([name, docs]) => {
            const changedDocs = await this.filterChangedDocuments(docs);
            return { name, changedDocs };
          }
        );
        const collectionResults = await Promise.all(collectionPromises);
        for (const { name, changedDocs } of collectionResults) {
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
          await this.cacheManager.saveAsync();
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
        await this.timer.timeAsync('Process SASS/SCSS', () => this.processSassFiles());
      } else {
        await this.processSassFiles();
      }

      // Copy static files
      if (this.timer) {
        await this.timer.timeAsync(
          'Copy static files',
          () => this.copyStaticFiles(),
          () => `${this.site.static_files.length} files`
        );
      } else {
        await this.copyStaticFiles();
      }

      // Generate plugin output files (sitemap, feed, etc.)
      // In incremental mode, only regenerate if documents were rebuilt
      const totalRendered =
        pagesToRender.length +
        postsToRender.length +
        Array.from(collectionsToRender.values()).reduce((sum, docs) => sum + docs.length, 0);
      if (!this.options.incremental || totalRendered > 0) {
        if (this.timer) {
          await this.timer.timeAsync('Generate plugin files', () => this.generatePluginFiles());
        } else {
          await this.generatePluginFiles();
        }
      }

      // Trigger site:post_render hook (after all rendering is complete)
      await Hooks.trigger('site', 'post_render', { site: this.site, renderer: this.renderer });

      // Save cache if incremental mode is enabled
      if (this.options.incremental) {
        await this.cacheManager.saveAsync();
      }

      // Trigger site:post_write hook (after all files are written)
      await Hooks.trigger('site', 'post_write', { site: this.site, renderer: this.renderer });

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
  private async cleanDestination(): Promise<void> {
    if (!existsSync(this.site.destination)) {
      return;
    }

    const keepFiles = this.site.config.keep_files || [];

    // If no keep_files, do a simple recursive delete
    if (keepFiles.length === 0) {
      logger.info(`Cleaning destination directory: ${this.site.destination}`);
      try {
        await rm(this.site.destination, { recursive: true, force: true });
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
    await this.cleanDirectorySelectively(this.site.destination, keepFiles);
  }

  /**
   * Recursively clean a directory while preserving files/dirs in keep_files
   * @param dir Directory to clean
   * @param keepFiles Files/directories to keep (relative to destination)
   * @param relativePath Current relative path from destination
   */
  private async cleanDirectorySelectively(
    dir: string,
    keepFiles: string[],
    relativePath: string = ''
  ): Promise<void> {
    if (!existsSync(dir)) {
      return;
    }

    // Normalize keep patterns to use forward slashes
    const normalizedKeepFiles = keepFiles.map(normalizePathSeparators);

    const entries = await readdir(dir);

    // Process entries in parallel
    await Promise.all(
      entries.map(async (entry) => {
        const fullPath = join(dir, entry);
        const relPath = relativePath ? join(relativePath, entry) : entry;
        const normalizedRelPath = normalizePathSeparators(relPath);

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
              pathMatchesOrInside(keepPattern, normalizedRelPath) &&
              keepPattern !== normalizedRelPath
          );

          try {
            const stats = await stat(fullPath);
            if (containsKeptFile && stats.isDirectory()) {
              // Recurse into the directory
              await this.cleanDirectorySelectively(fullPath, keepFiles, relPath);
            }
          } catch {
            // If stat fails, skip this entry
          }
          // Otherwise, keep the entire file/directory
          return;
        }

        // Delete this entry
        try {
          await rm(fullPath, { recursive: true, force: true });
        } catch (error) {
          logger.warn(
            `Failed to delete ${relPath}: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      })
    );
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

    // Get the permalink pattern from config (default: /:categories/:year/:month/:day/:title.html)
    // Jekyll supports built-in styles: date, pretty, ordinal, weekdate, none
    // and custom patterns with placeholders like :year, :month, :day, :title, :categories
    let pattern = this.site.config.permalink || '/:categories/:year/:month/:day/:title.html';

    // Handle built-in permalink styles
    if (pattern === 'date') {
      pattern = '/:categories/:year/:month/:day/:title.html';
    } else if (pattern === 'pretty') {
      pattern = '/:categories/:year/:month/:day/:title/';
    } else if (pattern === 'ordinal') {
      pattern = '/:categories/:year/:y_day/:title.html';
    } else if (pattern === 'weekdate') {
      pattern = '/:categories/:year/W:week/:short_day/:title.html';
    } else if (pattern === 'none') {
      pattern = '/:categories/:title.html';
    }

    // Replace placeholders in the pattern
    const categories = post.categories.join('/');

    let url = pattern
      .replace(/:categories/g, categories)
      .replace(/:year/g, String(year))
      .replace(/:month/g, month)
      .replace(/:i_month/g, String(date.getMonth() + 1)) // Month without padding
      .replace(/:day/g, day)
      .replace(/:i_day/g, String(date.getDate())) // Day without padding
      .replace(/:title/g, slug)
      .replace(/:slug/g, slug);

    // Clean up double slashes (from empty categories)
    url = url.replace(/\/+/g, '/');

    // Ensure URL starts with /
    if (!url.startsWith('/')) {
      url = '/' + url;
    }

    return this.normalizeUrl(url);
  }

  /**
   * Check if a file extension is a markdown extension
   * Uses markdown_ext from config to support custom extensions
   */
  private isMarkdownExtension(ext: string): boolean {
    const markdownExtConfig = this.site.config.markdown_ext || 'markdown,mkdown,mkdn,mkd,md';
    const markdownExtensions = markdownExtConfig
      .split(',')
      .map((e) => '.' + e.trim().toLowerCase());
    return markdownExtensions.includes(ext.toLowerCase());
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

    // For markdown and HTML files, convert extension to .html
    // For other files with front matter (e.g., .xml, .json, .txt), preserve original extension
    const isMarkdownOrHtml =
      this.isMarkdownExtension(ext) || ['.html', '.htm'].includes(ext.toLowerCase());
    const outputExt = isMarkdownOrHtml ? '.html' : ext;

    if (base === 'index') {
      urlPath = dir === '.' ? '/' : `/${dir}/`;
    } else {
      urlPath = dir === '.' ? `/${base}${outputExt}` : `/${dir}/${base}${outputExt}`;
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
   * Also sanitizes to prevent path traversal attacks
   */
  private normalizeUrl(url: string): string {
    // Use sanitizePermalink to remove any path traversal attempts
    return sanitizePermalink(url);
  }

  /**
   * Render all pages
   * Uses optimized batch rendering for better performance with many pages
   */
  private async renderPages(pages?: Document[]): Promise<void> {
    const pagesToRender = pages || this.site.pages;
    logger.info(`Rendering ${pagesToRender.length} pages...`);

    // Use optimized batch rendering for better performance
    await this.renderDocumentsBatch(pagesToRender, 'Pages');
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
   * Uses optimized batch rendering for better performance with many posts
   * @param posts Optional array of posts to render (for incremental builds)
   */
  private async renderPosts(posts?: Document[]): Promise<void> {
    const filteredPosts = this.getFilteredPosts(posts);

    logger.info(`Rendering ${filteredPosts.length} posts...`);

    // Use optimized batch rendering for better performance
    await this.renderDocumentsBatch(filteredPosts, 'Posts');
  }

  /**
   * Pre-create all unique output directories for a set of documents
   * This avoids redundant mkdir calls during parallel rendering
   * @param docs Documents to create directories for
   */
  private async preCreateDirectories(docs: Document[]): Promise<void> {
    const uniqueDirs = new Set<string>();

    for (const doc of docs) {
      try {
        const outputPath = this.getOutputPath(doc);
        const dir = dirname(outputPath);
        uniqueDirs.add(dir);
      } catch {
        // Skip documents that can't generate valid output paths
        // These will be handled during individual rendering
      }
    }

    // Create all directories in parallel
    await Promise.all(
      Array.from(uniqueDirs).map((dir) =>
        mkdir(dir, { recursive: true }).catch(() => {
          // Directory may already exist or fail - individual renders will handle errors
        })
      )
    );
  }

  /**
   * Render a batch of documents with optimized I/O
   * Pre-creates directories and uses parallel async writes
   * @param docs Documents to render
   * @param label Optional label for progress indicator
   */
  private async renderDocumentsBatch(docs: Document[], label?: string): Promise<void> {
    if (docs.length === 0) return;

    // Pre-create all output directories in parallel
    await this.preCreateDirectories(docs);

    // Create progress indicator if progress is enabled and we have enough documents
    const showProgress = this.options.showProgress && docs.length >= PROGRESS_THRESHOLD;
    const progress = showProgress
      ? createProgressIndicator(docs.length, label || 'Rendering', true)
      : null;

    // Track completed documents for progress
    let completed = 0;

    // Render all documents in parallel with async file writes
    await Promise.all(
      docs.map(async (doc) => {
        await this.renderDocumentAsync(doc);
        completed++;
        if (progress) {
          progress.update(completed);
        }
      })
    );

    // Complete the progress indicator
    if (progress) {
      progress.complete();
    }
  }

  /**
   * Render a single document with async file operations
   * This is an optimized version of renderDocument that uses async writes
   * @param doc Document to render
   */
  private async renderDocumentAsync(doc: Document): Promise<void> {
    try {
      // Render the document
      let html = await this.renderer.renderDocument(doc);

      // Apply modern features (opt-in via config)
      html = await this.applyModernFeatures(html);

      // Get output path
      const outputPath = this.getOutputPath(doc);

      // Write file asynchronously (directory already created by preCreateDirectories)
      try {
        await writeFile(outputPath, html, 'utf-8');
      } catch (_error) {
        // If write fails, try creating directory again (race condition handling)
        try {
          await mkdir(dirname(outputPath), { recursive: true });
          await writeFile(outputPath, html, 'utf-8');
        } catch (retryError) {
          throw new FileSystemError('Failed to write output file', {
            file: outputPath,
            cause: retryError instanceof Error ? retryError : undefined,
          });
        }
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

        // Update cache asynchronously
        await this.cacheManager.updateFileAsync(doc.path, doc.relativePath, dependencies);
      }

      // Trigger documents:post_write hook after document is written
      await Hooks.trigger('documents', 'post_write', {
        document: doc,
        site: this.site,
        renderer: this.renderer,
        content: html,
        outputPath,
      });

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
          await mkdir(dirname(outputPath), { recursive: true });
        } catch (error) {
          throw new FileSystemError('Failed to create pagination output directory', {
            file: dirname(outputPath),
            cause: error instanceof Error ? error : undefined,
          });
        }

        // Write file
        try {
          await writeFile(outputPath, html, 'utf-8');
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

    const collectionPromises: Promise<void>[] = [];

    for (const [collectionName, documents] of collectionsToRender) {
      const collectionConfig = this.site.config.collections?.[collectionName];
      const outputCollection = collectionConfig?.output !== false;

      if (!outputCollection) {
        logger.debug(`Skipping collection '${collectionName}' (output: false)`);
        continue;
      }

      logger.info(`Rendering ${documents.length} documents from collection '${collectionName}'...`);

      // Use optimized batch rendering for better performance
      collectionPromises.push(
        this.renderDocumentsBatch(documents, `Collection: ${collectionName}`)
      );
    }

    await Promise.all(collectionPromises);
  }

  /**
   * Apply modern JS/SSG features to rendered HTML (opt-in via config)
   * Features include HTML minification and resource hints injection
   * @param html Rendered HTML content
   * @returns Processed HTML content
   */
  private async applyModernFeatures(html: string): Promise<string> {
    let processedHtml = html;

    // Apply resource hints (preload/prefetch) if enabled
    // This should run before minification to ensure hints are properly placed
    if (isResourceHintsEnabled(this.site.config)) {
      const resourceHintsOptions = getResourceHintsOptions(this.site.config);
      processedHtml = injectResourceHints(processedHtml, resourceHintsOptions);
    }

    // Apply HTML minification if enabled
    if (isHtmlMinificationEnabled(this.site.config)) {
      const minificationOptions = getHtmlMinificationOptions(this.site.config);
      const result = await minifyHtml(processedHtml, minificationOptions);
      processedHtml = result.html;
    }

    return processedHtml;
  }

  /**
   * Get output file path for a document
   * Validates that the output path is within the destination directory
   * @throws BuildError if the path would escape the destination directory
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

    const outputPath = join(this.site.destination, filePath);
    const resolvedPath = resolve(outputPath);

    // Security check: Ensure the output path is within the destination directory
    if (!isPathWithinBase(this.site.destination, resolvedPath)) {
      throw new BuildError(
        `Security error: Output path '${filePath}' resolves outside the destination directory`,
        {
          file: doc.relativePath,
        }
      );
    }

    return resolvedPath;
  }

  /**
   * Process SASS/SCSS files and compile them to CSS
   */
  private async processSassFiles(): Promise<void> {
    const sassFiles = this.findSassFiles(this.site.source);

    if (sassFiles.length === 0) {
      return;
    }

    logger.info(`Processing ${sassFiles.length} SASS/SCSS files...`);

    // Get site data for Liquid context
    const siteData = this.site.toJSON();

    // Process SASS files in parallel
    await Promise.all(
      sassFiles.map(async (file) => {
        try {
          // Read the file asynchronously
          const fileContent = await readFile(file, 'utf-8');

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
            return;
          }

          // Process Liquid tags in SCSS content before SASS compilation
          // This is required for Jekyll compatibility where SCSS files can contain
          // Liquid includes like {% include css/file.css %}
          const relativePath = relative(this.site.source, file);
          // Build Liquid context matching the pattern used in Renderer.ensureSiteDataCached()
          // - Spread config properties for direct access (e.g., site.title)
          // - Keep config property for backward compatibility (e.g., site.config.title)
          const liquidContext = {
            site: {
              ...siteData.config,
              config: siteData.config,
              data: siteData.data,
              pages: siteData.pages,
              posts: siteData.posts,
              static_files: siteData.static_files,
              collections: siteData.collections,
              source: siteData.source,
              destination: siteData.destination,
            },
            page: {
              path: relativePath,
              ...parsed.data,
            },
          };

          let processedContent = parsed.content;
          try {
            processedContent = await this.renderer.render(parsed.content, liquidContext);
          } catch (liquidError) {
            logger.warn(`Failed to process Liquid in SASS file: ${relativePath}`, {
              error: liquidError instanceof Error ? liquidError.message : String(liquidError),
            });
            // Continue with original content if Liquid processing fails
          }

          // Compile SASS/SCSS
          const css = this.sassProcessor.process(file, processedContent);

          // Determine output path (replace .scss/.sass with .css)
          const outputPath = relativePath.replace(/\.(scss|sass)$/, '.css');
          const destPath = join(this.site.destination, outputPath);

          // Ensure directory exists and write CSS file
          await mkdir(dirname(destPath), { recursive: true });
          await writeFile(destPath, css, 'utf-8');

          logger.debug(`Compiled: ${relativePath} → ${outputPath}`);
        } catch (error) {
          logger.warn(`Failed to process SASS file: ${relative(this.site.source, file)}`, {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      })
    );
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
   * Uses parallel async I/O for better performance on large sites
   */
  private async copyStaticFiles(): Promise<void> {
    const staticFiles = this.site.static_files;

    logger.info(`Copying ${staticFiles.length} static files...`);

    let copiedCount = 0;
    let skippedCount = 0;

    // Process static files in parallel batches
    for (let i = 0; i < staticFiles.length; i += DEFAULT_BATCH_SIZE) {
      const batch = staticFiles.slice(i, i + DEFAULT_BATCH_SIZE);
      const results = await Promise.all(
        batch.map(async (staticFile) => {
          const destPath = join(this.site.destination, staticFile.destinationRelativePath);
          const resolvedDestPath = resolve(destPath);

          // Security check: Ensure the destination path is within the destination directory
          if (!isPathWithinBase(this.site.destination, resolvedDestPath)) {
            logger.warn(
              `Security warning: Skipping static file that would write outside destination: ${staticFile.relativePath}`
            );
            return { copied: false, skipped: false };
          }

          // Security check: Also verify source path is within source directory
          const resolvedSourcePath = resolve(staticFile.path);
          if (!isPathWithinBase(this.site.source, resolvedSourcePath)) {
            logger.warn(
              `Security warning: Skipping static file with source outside source directory: ${staticFile.relativePath}`
            );
            return { copied: false, skipped: false };
          }

          try {
            // Ensure directory exists
            await mkdir(dirname(resolvedDestPath), { recursive: true });

            // Check if destination file exists and has same or newer modification time
            try {
              const destStats = await stat(resolvedDestPath);
              // Skip if destination is newer than or same age as source
              if (destStats.mtime >= staticFile.modified_time) {
                logger.debug(`Skipped (unchanged): ${staticFile.relativePath}`);
                return { copied: false, skipped: true };
              }
            } catch {
              // File doesn't exist, proceed with copy
            }

            // Copy file
            await copyFile(staticFile.path, resolvedDestPath);

            logger.debug(`Copied: ${staticFile.relativePath}`);
            return { copied: true, skipped: false };
          } catch (error) {
            logger.warn(`Failed to copy static file: ${staticFile.relativePath}`, {
              error: error instanceof Error ? error.message : String(error),
            });
            return { copied: false, skipped: false };
          }
        })
      );

      for (const result of results) {
        if (result.copied) copiedCount++;
        if (result.skipped) skippedCount++;
      }
    }

    if (skippedCount > 0) {
      logger.debug(`Static files: ${copiedCount} copied, ${skippedCount} skipped (unchanged)`);
    }
  }

  /**
   * Check if a path should be excluded
   * Jekyll (Ruby) default behavior:
   * - Files starting with '.', '#', or '~' are excluded by default
   * - The 'include' config can override this to explicitly include hidden files
   * - The 'exclude' config excludes additional files
   */
  private shouldExclude(path: string): boolean {
    const relativePath = relative(this.site.source, path);
    const excludePatterns = this.site.config.exclude || [];
    const includePatterns = this.site.config.include || [];

    return shouldExcludePath(relativePath, excludePatterns, includePatterns);
  }

  /**
   * Check if a directory name is a special directory that should be excluded
   * Includes Jekyll directories (underscore-prefixed) and version control
   */
  private isJekyllDirectory(name: string): boolean {
    return name.startsWith('_') || name === '.git';
  }

  /**
   * Run all registered generator plugins
   * Generators create additional content like sitemaps, feeds, archive pages, etc.
   */
  private async runGenerators(): Promise<void> {
    const generators = PluginRegistry.getGenerators();

    if (generators.length === 0) {
      return;
    }

    logger.info(`Running ${generators.length} generator plugins...`);

    for (const generator of generators) {
      try {
        logger.debug(`Running generator: ${generator.name}`);
        const result = await generator.generate(this.site, this.renderer);

        // Handle generated files
        if (result?.files) {
          // Write generated files in parallel
          await Promise.all(
            result.files.map(async (file) => {
              // Use path.normalize to canonicalize the path, then resolve relative to destination
              // This properly handles ../, ./, and multiple slashes
              const outputPath = join(this.site.destination, normalize(file.path));
              const resolvedPath = resolve(outputPath);

              // Security check: Ensure the output path is within the destination directory
              // This check is the primary security mechanism - it validates the final resolved path
              if (!isPathWithinBase(this.site.destination, resolvedPath)) {
                logger.warn(
                  `Security warning: Generator '${generator.name}' tried to write outside destination: ${file.path}`
                );
                return;
              }

              // Ensure directory exists and write file
              await mkdir(dirname(resolvedPath), { recursive: true });
              await writeFile(resolvedPath, file.content, 'utf-8');
              logger.debug(`Generator '${generator.name}' created: ${file.path}`);
            })
          );
        }

        // TODO: Implement document handling for generators
        // This will allow generators to create documents that go through the render pipeline
        // For now, generators can only create static files or modify the site in place
      } catch (error) {
        logger.warn(
          `Generator '${generator.name}' failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }

  /**
   * Generate plugin output files (sitemap, feed, etc.)
   */
  private async generatePluginFiles(): Promise<void> {
    const configuredPlugins = this.site.config.plugins || [];

    const writePromises: Promise<void>[] = [];

    // Generate sitemap if plugin is explicitly enabled
    if (configuredPlugins.includes('jekyll-sitemap')) {
      const sitemapPlugin = (this.site as any)._sitemapPlugin;
      if (sitemapPlugin) {
        writePromises.push(
          (async () => {
            try {
              const sitemapContent = sitemapPlugin.generateSitemap(this.site);
              const sitemapPath = join(this.site.destination, 'sitemap.xml');
              await writeFile(sitemapPath, sitemapContent, 'utf-8');
              logger.debug('Generated sitemap.xml');
            } catch (error) {
              logger.warn('Failed to generate sitemap', {
                error: error instanceof Error ? error.message : String(error),
              });
            }
          })()
        );
      }
    }

    // Generate feed if plugin is explicitly enabled
    if (configuredPlugins.includes('jekyll-feed')) {
      const feedPlugin = (this.site as any)._feedPlugin;
      if (feedPlugin) {
        writePromises.push(
          (async () => {
            try {
              const feedContent = await feedPlugin.generateFeed(this.site);
              const feedPath = this.site.config.feed?.path || '/feed.xml';
              const feedFilePath = join(this.site.destination, feedPath.replace(/^\//, ''));

              // Ensure directory exists
              await mkdir(dirname(feedFilePath), { recursive: true });

              await writeFile(feedFilePath, feedContent, 'utf-8');
              logger.debug(`Generated ${feedPath}`);
            } catch (error) {
              logger.warn('Failed to generate feed', {
                error: error instanceof Error ? error.message : String(error),
              });
            }
          })()
        );
      }
    }

    // Wait for all plugin file writes to complete
    await Promise.all(writePromises);
  }

  /**
   * Filter documents to only include those that have changed
   * Uses parallel async I/O for better performance
   * @param documents List of documents to filter
   * @returns Documents that need to be rebuilt
   */
  private async filterChangedDocuments(documents: Document[]): Promise<Document[]> {
    // Check all documents in parallel
    const results = await Promise.all(
      documents.map(async (doc) => {
        // Check if document itself has changed
        if (await this.cacheManager.hasChangedAsync(doc.path, doc.relativePath)) {
          logger.debug(`Changed: ${doc.relativePath}`);
          return doc;
        }

        // Check if any dependencies have changed (includes layouts tracked in cache)
        if (await this.cacheManager.hasDependencyChangesAsync(doc.relativePath, this.site.source)) {
          logger.debug(`Dependency changed for: ${doc.relativePath}`);
          return doc;
        }

        return null;
      })
    );

    return results.filter((doc): doc is Document => doc !== null);
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
