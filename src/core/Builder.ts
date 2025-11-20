import { Site } from './Site';
import { Renderer } from './Renderer';
import { Document, DocumentType } from './Document';
import { logger } from '../utils/logger';
import { mkdirSync, writeFileSync, existsSync, readdirSync, statSync, copyFileSync } from 'fs';
import { join, dirname, extname, basename, relative } from 'path';
import { rmSync } from 'fs';

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
  private options: BuilderOptions;

  /**
   * Create a new Builder instance
   * @param site Site instance
   * @param options Builder options
   */
  constructor(site: Site, options: BuilderOptions = {}) {
    this.site = site;
    this.renderer = new Renderer(site);
    this.options = {
      showDrafts: false,
      showFuture: false,
      clean: true,
      verbose: false,
      ...options,
    };
  }

  /**
   * Build the entire site
   */
  async build(): Promise<void> {
    logger.info('Building site...');

    // Read all site files
    await this.site.read();

    // Clean destination directory if needed
    if (this.options.clean) {
      this.cleanDestination();
    }

    // Ensure destination exists
    mkdirSync(this.site.destination, { recursive: true });

    // Generate URLs for all documents
    this.generateUrls();

    // Render pages
    await this.renderPages();

    // Render posts
    await this.renderPosts();

    // Render collections
    await this.renderCollections();

    // Copy static files
    this.copyStaticFiles();

    logger.info(`Site built successfully to ${this.site.destination}`);
  }

  /**
   * Clean the destination directory
   */
  private cleanDestination(): void {
    if (existsSync(this.site.destination)) {
      if (this.options.verbose) {
        logger.info(`Cleaning ${this.site.destination}`);
      }
      rmSync(this.site.destination, { recursive: true, force: true });
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
    if (this.options.verbose) {
      logger.info(`Rendering ${this.site.pages.length} pages...`);
    }

    for (const page of this.site.pages) {
      await this.renderDocument(page);
    }
  }

  /**
   * Render all posts
   */
  private async renderPosts(): Promise<void> {
    // Filter posts based on options
    const posts = this.site.posts.filter((post) => {
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

    if (this.options.verbose) {
      logger.info(`Rendering ${posts.length} posts...`);
    }

    for (const post of posts) {
      await this.renderDocument(post);
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
        if (this.options.verbose) {
          logger.info(`Skipping collection '${collectionName}' (output: false)`);
        }
        continue;
      }

      if (this.options.verbose) {
        logger.info(`Rendering ${documents.length} documents from collection '${collectionName}'...`);
      }

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
      mkdirSync(dirname(outputPath), { recursive: true });

      // Write file
      writeFileSync(outputPath, html, 'utf-8');

      if (this.options.verbose) {
        logger.info(`  - ${doc.relativePath} → ${relative(this.site.destination, outputPath)}`);
      }
    } catch (error) {
      logger.error(`Error rendering ${doc.relativePath}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
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

    if (this.options.verbose) {
      logger.info(`Copying ${staticFiles.length} static files...`);
    }

    for (const file of staticFiles) {
      const relativePath = relative(this.site.source, file);
      const destPath = join(this.site.destination, relativePath);

      // Ensure directory exists
      mkdirSync(dirname(destPath), { recursive: true });

      // Copy file
      copyFileSync(file, destPath);

      if (this.options.verbose) {
        logger.info(`  - ${relativePath}`);
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
