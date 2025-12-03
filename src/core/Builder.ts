import { Site } from './Site';
import { Renderer } from './Renderer';
import { Document, DocumentType } from './Document';
import { generatePagination, getPaginatedFilePath } from './Paginator';
import { SassProcessor } from './SassProcessor';
import { logger } from '../utils/logger';
import { BuildError, FileSystemError, JekyllError } from '../utils/errors';
import { mkdirSync, writeFileSync, existsSync, readdirSync, statSync, copyFileSync, readFileSync } from 'fs';
import { join, dirname, extname, basename, relative } from 'path';
import { rmSync } from 'fs';
import { registerPlugins } from '../plugins';
import matter from 'gray-matter';

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
}

/**
 * Builder class orchestrates the static site build process
 */
export class Builder {
  private site: Site;
  private renderer: Renderer;
  private sassProcessor: SassProcessor;
  private options: BuilderOptions;

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
      ...options,
    };
    
    // Configure logger based on options
    logger.setVerbose(this.options.verbose || false);
    
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

      // Clean destination directory if needed
      if (this.options.clean) {
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

      // Render pages
      await this.renderPages();

      // Render posts
      await this.renderPosts();

      // Render pagination pages if enabled
      await this.renderPagination();

      // Render collections
      await this.renderCollections();

      // Process SASS/SCSS files
      this.processSassFiles();

      // Copy static files
      this.copyStaticFiles();

      // Generate plugin output files (sitemap, feed, etc.)
      this.generatePluginFiles();

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
    logger.info(`Cleaning destination directory (keeping: ${keepFiles.join(', ')}): ${this.site.destination}`);
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

    const entries = readdirSync(dir);

    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const relPath = relativePath ? join(relativePath, entry) : entry;
      
      // Check if this path should be kept
      const shouldKeep = keepFiles.some((keepPattern) => {
        // Exact match
        if (relPath === keepPattern) {
          return true;
        }
        // relPath is inside a kept directory
        if (relPath.startsWith(keepPattern + '/') || relPath.startsWith(keepPattern + '\\')) {
          return true;
        }
        // keepPattern is inside relPath (so relPath dir contains a keep file)
        if (keepPattern.startsWith(relPath + '/') || keepPattern.startsWith(relPath + '\\')) {
          return true;
        }
        return false;
      });

      if (shouldKeep) {
        // Check if this is a directory that contains something to keep
        const containsKeptFile = keepFiles.some((keepPattern) =>
          keepPattern.startsWith(relPath + '/') || keepPattern.startsWith(relPath + '\\')
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
        logger.warn(`Failed to delete ${relPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
  private async renderPages(): Promise<void> {
    logger.info(`Rendering ${this.site.pages.length} pages...`);

    for (const page of this.site.pages) {
      await this.renderDocument(page);
    }
  }

  /**
   * Get filtered posts based on draft and future post options
   * @returns Filtered array of posts
   */
  private getFilteredPosts(): Document[] {
    return this.site.posts.filter((post) => {
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
   */
  private async renderPosts(): Promise<void> {
    const posts = this.getFilteredPosts();

    logger.info(`Rendering ${posts.length} posts...`);

    for (const post of posts) {
      await this.renderDocument(post);
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

    // Render each paginated page
    for (const paginator of paginators) {
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
    }
  }

  /**
   * Render all collections
   */
  private async renderCollections(): Promise<void> {
    for (const [collectionName, documents] of this.site.collections) {
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
