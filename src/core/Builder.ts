import { Site } from './Site';
import { Document, DocumentType } from './Document';
import { Renderer } from './Renderer';
import { UrlGenerator } from './UrlGenerator';
import { mkdirSync, writeFileSync, existsSync, copyFileSync } from 'fs';
import { dirname, join, relative } from 'path';
import { readdir } from 'fs/promises';

/**
 * BuildOptions interface
 */
export interface BuildOptions {
  /** Include draft posts */
  drafts?: boolean;
  /** Include posts with future dates */
  future?: boolean;
  /** Verbose output */
  verbose?: boolean;
}

/**
 * Builder class orchestrates the site build process
 */
export class Builder {
  private site: Site;
  private renderer: Renderer;
  private urlGenerator: UrlGenerator;
  private options: BuildOptions;

  /**
   * Create a new Builder
   * @param site Site to build
   * @param options Build options
   */
  constructor(site: Site, options: BuildOptions = {}) {
    this.site = site;
    this.renderer = new Renderer(site);
    this.urlGenerator = new UrlGenerator(site.config);
    this.options = options;
  }

  /**
   * Build the entire site
   */
  async build(): Promise<void> {
    // Read all files from the site
    await this.site.read();

    // Generate URLs for all documents
    this.generateUrls();

    // Render and write all documents
    await this.renderDocuments();

    // Copy static files
    await this.copyStaticFiles();
  }

  /**
   * Generate URLs for all documents
   */
  private generateUrls(): void {
    // Generate URLs for pages
    for (const page of this.site.pages) {
      page.url = this.urlGenerator.generateUrl(page);
    }

    // Generate URLs for posts
    for (const post of this.site.posts) {
      if (this.shouldRenderDocument(post)) {
        post.url = this.urlGenerator.generateUrl(post);
      }
    }

    // Generate URLs for collection documents
    for (const [collectionName, documents] of this.site.collections) {
      const collectionConfig = this.site.config.collections?.[collectionName];
      const shouldOutput = collectionConfig?.output !== false;

      if (shouldOutput) {
        for (const doc of documents) {
          if (this.shouldRenderDocument(doc)) {
            doc.url = this.urlGenerator.generateUrl(doc);
          }
        }
      }
    }
  }

  /**
   * Render and write all documents
   */
  private async renderDocuments(): Promise<void> {
    // Render pages
    for (const page of this.site.pages) {
      if (this.shouldRenderDocument(page)) {
        await this.renderAndWrite(page);
      }
    }

    // Render posts
    for (const post of this.site.posts) {
      if (this.shouldRenderDocument(post)) {
        await this.renderAndWrite(post);
      }
    }

    // Render collection documents
    for (const [collectionName, documents] of this.site.collections) {
      const collectionConfig = this.site.config.collections?.[collectionName];
      const shouldOutput = collectionConfig?.output !== false;

      if (shouldOutput) {
        for (const doc of documents) {
          if (this.shouldRenderDocument(doc)) {
            await this.renderAndWrite(doc);
          }
        }
      }
    }
  }

  /**
   * Check if a document should be rendered based on options
   */
  private shouldRenderDocument(document: Document): boolean {
    // Check if it's a draft and we're not including drafts
    if (document.data.draft && !this.options.drafts) {
      return false;
    }

    // Check if published is explicitly false (not draft-related)
    if (document.data.published === false) {
      return false;
    }

    // Check future dates for posts
    if (document.type === DocumentType.POST && !this.options.future) {
      const date = document.date;
      if (date && date > new Date()) {
        return false;
      }
    }

    return true;
  }

  /**
   * Render and write a single document
   */
  private async renderAndWrite(document: Document): Promise<void> {
    try {
      // Render the document
      const rendered = await this.renderer.renderDocument(document);

      // Determine output path
      const outputPath = this.urlGenerator.generateOutputPath(document);
      const fullOutputPath = join(this.site.destination, outputPath);

      // Ensure output directory exists
      const outputDir = dirname(fullOutputPath);
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
      }

      // Write the file
      writeFileSync(fullOutputPath, rendered, 'utf-8');

      if (this.options.verbose) {
        console.log(`  Rendered: ${document.relativePath} → ${outputPath}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(
          `Failed to render ${document.relativePath}: ${error.message}`
        );
      }
      throw error;
    }
  }

  /**
   * Copy static files (files that don't need processing)
   */
  private async copyStaticFiles(): Promise<void> {
    // Get all files in source directory
    const allFiles = await this.walkDirectory(this.site.source);

    for (const file of allFiles) {
      // Skip if it's a Jekyll special file/directory
      if (this.isJekyllFile(file)) {
        continue;
      }

      // Skip if it's a document we've already processed
      if (this.isProcessedDocument(file)) {
        continue;
      }

      // Skip if excluded
      if (this.shouldExclude(file)) {
        continue;
      }

      // Copy the file
      const relativePath = relative(this.site.source, file);
      const destPath = join(this.site.destination, relativePath);

      // Ensure destination directory exists
      const destDir = dirname(destPath);
      if (!existsSync(destDir)) {
        mkdirSync(destDir, { recursive: true });
      }

      // Copy file
      copyFileSync(file, destPath);

      if (this.options.verbose) {
        console.log(`  Copied: ${relativePath}`);
      }
    }
  }

  /**
   * Walk directory recursively
   */
  private async walkDirectory(dir: string): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        if (entry.isDirectory()) {
          if (!this.shouldExclude(fullPath)) {
            files.push(...await this.walkDirectory(fullPath));
          }
        } else if (entry.isFile()) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Ignore errors for directories we can't read
    }

    return files;
  }

  /**
   * Check if a file is a Jekyll special file/directory
   */
  private isJekyllFile(path: string): boolean {
    const relativePath = relative(this.site.source, path);
    const parts = relativePath.split('/');

    // Check if any part starts with underscore (Jekyll convention)
    for (const part of parts) {
      if (part.startsWith('_')) {
        return true;
      }
    }

    // Check for config files
    if (relativePath.match(/^_config\.ya?ml$/)) {
      return true;
    }

    return false;
  }

  /**
   * Check if a file was already processed as a document
   */
  private isProcessedDocument(path: string): boolean {
    // Check if this file is in our documents
    const allDocs = this.site.getAllDocuments();
    return allDocs.some(doc => doc.path === path);
  }

  /**
   * Check if a file should be excluded
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
   * Get build statistics
   */
  getStats(): {
    pages: number;
    posts: number;
    collections: number;
  } {
    return {
      pages: this.site.pages.filter(p => this.shouldRenderDocument(p)).length,
      posts: this.site.posts.filter(p => this.shouldRenderDocument(p)).length,
      collections: Array.from(this.site.collections.values()).reduce(
        (sum, docs) => sum + docs.filter(d => this.shouldRenderDocument(d)).length,
        0
      ),
    };
  }
}
