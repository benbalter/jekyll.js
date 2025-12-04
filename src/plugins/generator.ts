/**
 * Generator Plugin Interface for Jekyll.js
 *
 * Generator plugins create additional content during site generation.
 * Examples: sitemap generator, feed generator, archive pages, tag pages
 *
 * @see https://jekyllrb.com/docs/plugins/generators/
 */

import { Site } from '../core/Site';
import { Document } from '../core/Document';
import { Renderer } from '../core/Renderer';

/**
 * Generated file output
 */
export interface GeneratedFile {
  /** Output path relative to destination directory */
  path: string;
  /** File content */
  content: string;
}

/**
 * Generated document that can be added to the site
 */
export interface GeneratedDocument {
  /** The document to add */
  document: Document;
  /** Collection name if this should be added to a collection */
  collection?: string;
  /** Whether this is a page (true) or should be added to the collection only */
  isPage?: boolean;
}

/**
 * Result from generator execution
 */
export interface GeneratorResult {
  /** Files to write to the destination directory */
  files?: GeneratedFile[];
  /** Documents to add to the site (will be rendered through the normal pipeline) */
  documents?: GeneratedDocument[];
}

/**
 * Generator plugin interface
 *
 * Generators run after the site is read but before rendering begins.
 * They can:
 * 1. Generate new files (like sitemap.xml, feed.xml)
 * 2. Create new documents that will be processed through the render pipeline
 * 3. Modify existing site data
 */
export interface GeneratorPlugin {
  /** Generator name (e.g., 'sitemap-generator') */
  name: string;

  /**
   * Priority determines the order generators run.
   * Lower numbers run first.
   * Default priorities:
   * - 10: High priority (runs early)
   * - 50: Normal priority (default)
   * - 90: Low priority (runs late)
   */
  priority?: number;

  /**
   * Generate content for the site
   * @param site The site instance with all documents loaded
   * @param renderer The renderer instance (for template rendering if needed)
   * @returns Generated files and/or documents, or void if modifying site in place
   */
  generate(
    site: Site,
    renderer: Renderer
  ): GeneratorResult | Promise<GeneratorResult> | void | Promise<void>;
}

/**
 * Check if a plugin is a Generator plugin
 */
export function isGeneratorPlugin(plugin: unknown): plugin is GeneratorPlugin {
  return (
    typeof plugin === 'object' &&
    plugin !== null &&
    'name' in plugin &&
    'generate' in plugin &&
    typeof (plugin as GeneratorPlugin).name === 'string' &&
    typeof (plugin as GeneratorPlugin).generate === 'function'
  );
}

/**
 * Default generator priorities for built-in generators
 */
export const GeneratorPriority = {
  /** High priority - runs early */
  HIGH: 10,
  /** Normal priority - default */
  NORMAL: 50,
  /** Low priority - runs late */
  LOW: 90,
  /** Lowest priority - runs last (e.g., sitemap needs all URLs) */
  LOWEST: 100,
} as const;
