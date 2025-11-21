import { Site } from './Site';
import { Renderer } from './Renderer';
import { Document, DocumentType } from './Document';
import { logger } from '../utils/logger';
import { BuildError, FileSystemError, JekyllError } from '../utils/errors';
import { mkdirSync, writeFileSync, existsSync, readdirSync, statSync, copyFileSync } from 'fs';
import { join, dirname, extname, basename, relative } from 'path';
import { rmSync } from 'fs';
import { registerPlugins } from '../plugins';
import { CacheManager } from './CacheManager';

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
}

/**
 * Builder class orchestrates the static site build process
 */
export class Builder {
  private site: Site;
  private renderer: Renderer;
  private options: BuilderOptions;
  private cacheManager: CacheManager;

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
      layoutsDir: layoutDirs.length > 0 ? layoutDirs : [join(site.source, site.config.layouts_dir || '_layouts')],
      includesDir: includeDirs.length > 0 ? includeDirs : [join(site.source, site.config.includes_dir || '_includes')],
    });
    this.options = {
      showDrafts: false,
      showFuture: false,
      clean: true,
      verbose: false,
      incremental: false,
      ...options,
    };
    
    // Configure logger based on options
    logger.setVerbose(this.options.verbose || false);
    
    // Initialize cache manager
    this.cacheManager = new CacheManager(site.source);
    
    // Register plugins
    registerPlugins(this.renderer, this.site);
  }

  /**
   * Build the entire site
   */
  async build(): Promise<void> {
    logger.section('Building Site');

    try {
      // Read all site files
      logger.info('Reading site files...');
      await this.site.read();
      logger.debug(`Found ${this.site.pages.length} pages, ${this.site.posts.length} posts`, {
        collections: Array.from(this.site.collections.keys()).join(', '),
      });

      // Clean destination directory if needed (skip for incremental)
      if (this.options.clean && !this.options.incremental) {
        this.cleanDestination();
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
      this.generateUrls();

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

        const totalToRender = pagesToRender.length + postsToRender.length + 
          Array.from(collectionsToRender.values()).reduce((sum, docs) => sum + docs.length, 0);
        
        if (totalToRender === 0) {
          logger.success('No changes detected, skipping build');
          return;
        }
        
        logger.info(`Rebuilding ${totalToRender} changed files`);
      }

      // Render pages
      await this.renderPages(pagesToRender);

      // Render posts
      await this.renderPosts(postsToRender);

      // Render collections
      await this.renderCollections(collectionsToRender);

      // Copy static files
      this.copyStaticFiles();

      // Generate plugin output files (sitemap, feed, etc.)
      this.generatePluginFiles();

      // Save cache if incremental mode is enabled
      if (this.options.incremental) {
        this.cacheManager.save();
      }

      logger.success(`Site built successfully to ${this.site.destination}`);
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
   * Clean the destination directory
   */
  private cleanDestination(): void {
    if (existsSync(this.site.destination)) {
      logger.info(`Cleaning destination directory: ${this.site.destination}`);
      try {
        rmSync(this.site.destination, { recursive: true, force: true });
      } catch (error) {
        throw new FileSystemError('Failed to clean destination directory', {
          file: this.site.destination,
          cause: error instanceof Error ? error : undefined,
        });
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

    for (const page of pagesToRender) {
      await this.renderDocument(page);
    }
  }

  /**
   * Render all posts
   */
  private async renderPosts(posts?: Document[]): Promise<void> {
    // Filter posts based on options
    const postsToFilter = posts || this.site.posts;
    const filteredPosts = postsToFilter.filter((post) => {
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

    logger.info(`Rendering ${filteredPosts.length} posts...`);

    for (const post of filteredPosts) {
      await this.renderDocument(post);
    }
  }

  /**
   * Render all collections
   */
  private async renderCollections(collections?: Map<string, Document[]>): Promise<void> {
    const collectionsToRender = collections || this.site.collections;
    
    for (const [collectionName, documents] of collectionsToRender) {
      const collectionConfig = this.site.config.collections?.[collectionName];
      const outputCollection = collectionConfig?.output !== false;

      if (!outputCollection) {
        logger.debug(`Skipping collection '${collectionName}' (output: false)`);
        continue;
      }

      logger.info(`Rendering ${documents.length} documents from collection '${collectionName}'...`);

      for (const doc of documents) {
        await this.renderDocument(doc);
      }
    }
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

      logger.debug(`Rendered: ${doc.relativePath} → ${relative(this.site.destination, outputPath)}`);
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
   * Copy static files (non-Jekyll files) to destination
   */
  private copyStaticFiles(): void {
    const staticFiles = this.findStaticFiles(this.site.source);

    logger.info(`Copying ${staticFiles.length} static files...`);

    for (const file of staticFiles) {
      const relativePath = relative(this.site.source, file);
      const destPath = join(this.site.destination, relativePath);

      try {
        // Ensure directory exists
        mkdirSync(dirname(destPath), { recursive: true });

        // Copy file
        copyFileSync(file, destPath);

        logger.debug(`Copied: ${relativePath}`);
      } catch (error) {
        logger.warn(`Failed to copy static file: ${relativePath}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /**
   * Find all static files (non-Jekyll files) in the site
   */
  private findStaticFiles(dir: string, files: string[] = []): string[] {
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
        // Skip Jekyll special directories at root level
        if (this.isJekyllDirectory(entry) && dirname(fullPath) === this.site.source) {
          continue;
        }

        // Recurse into directory
        this.findStaticFiles(fullPath, files);
      } else if (stats.isFile()) {
        // Skip markdown/HTML files - they're processed as Jekyll documents, not static files
        // All .md, .markdown, .html, and .htm files should be rendered through the document pipeline
        const ext = extname(fullPath).toLowerCase();
        if (['.md', '.markdown', '.html', '.htm'].includes(ext)) {
          continue;
        }

        files.push(fullPath);
      }
    }

    return files;
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

      // Check if any dependencies have changed
      if (this.cacheManager.hasDependencyChanges(doc.relativePath, this.site.source)) {
        logger.debug(`Dependency changed for: ${doc.relativePath}`);
        return true;
      }

      // Check if layout has changed
      if (doc.layout) {
        const layout = this.site.getLayout(doc.layout);
        if (layout && this.cacheManager.hasChanged(layout.path, layout.relativePath)) {
          logger.debug(`Layout changed for: ${doc.relativePath}`);
          return true;
        }
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
}
