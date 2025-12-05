/**
 * Plugin Type Definitions for Jekyll.js
 *
 * This module defines the public-facing Plugin API interfaces.
 * Both built-in plugins and third-party plugins should use these interfaces.
 *
 * Plugin Types:
 * - Plugin: Basic plugin that registers Liquid tags/filters
 * - GeneratorPlugin: Creates additional content during site generation
 * - ConverterPlugin: Transforms content from one format to another
 */

import { Site } from '../core/Site';
import { Document } from '../core/Document';
import { Renderer } from '../core/Renderer';

/**
 * Plugin interface that all plugins must implement
 * This is the basic plugin type that registers Liquid tags/filters
 */
export interface Plugin {
  /** Plugin name (e.g., 'jekyll-seo-tag') */
  name: string;

  /** Register the plugin with the renderer */
  register(renderer: Renderer, site: Site): void;
}

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
 * Converter plugin interface
 *
 * Converters are responsible for transforming document content from one format
 * to another (typically to HTML). The built-in markdown converter is an example.
 *
 * Converters are matched to documents based on file extension.
 */
export interface ConverterPlugin {
  /** Converter name (e.g., 'markdown-converter') */
  name: string;

  /**
   * Priority determines the order converters are checked.
   * Lower numbers are checked first.
   * The first converter that matches will be used.
   */
  priority?: number;

  /**
   * Check if this converter matches a file extension
   * @param ext File extension including dot (e.g., '.md', '.textile')
   * @returns True if this converter handles this extension
   */
  matches(ext: string): boolean;

  /**
   * Get the output file extension
   * @param ext Input file extension
   * @returns Output file extension (typically '.html')
   * @note Currently this method is defined for future compatibility but is not
   * used to determine the output file extension. Documents retain their original
   * extension-based URL patterns.
   */
  outputExt(ext: string): string;

  /**
   * Convert content from source format to output format
   * @param content Source content to convert
   * @param document The document being converted (for metadata access)
   * @param site The site instance (for configuration access)
   * @returns Converted content
   */
  convert(content: string, document: Document, site: Site): string | Promise<string>;
}

/**
 * Union type for all plugin types
 */
export type AnyPlugin = Plugin | GeneratorPlugin | ConverterPlugin;

/**
 * Check if a plugin is a basic Plugin (has register method)
 */
export function isBasicPlugin(plugin: unknown): plugin is Plugin {
  return (
    typeof plugin === 'object' &&
    plugin !== null &&
    'name' in plugin &&
    'register' in plugin &&
    typeof (plugin as Plugin).name === 'string' &&
    typeof (plugin as Plugin).register === 'function'
  );
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
 * Check if a plugin is a Converter plugin
 */
export function isConverterPlugin(plugin: unknown): plugin is ConverterPlugin {
  return (
    typeof plugin === 'object' &&
    plugin !== null &&
    'name' in plugin &&
    'matches' in plugin &&
    'outputExt' in plugin &&
    'convert' in plugin &&
    typeof (plugin as ConverterPlugin).name === 'string' &&
    typeof (plugin as ConverterPlugin).matches === 'function' &&
    typeof (plugin as ConverterPlugin).outputExt === 'function' &&
    typeof (plugin as ConverterPlugin).convert === 'function'
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

/**
 * Default converter priorities for built-in converters
 */
export const ConverterPriority = {
  /** High priority - checked first */
  HIGH: 10,
  /** Normal priority - default */
  NORMAL: 50,
  /** Low priority - checked late (fallback converters) */
  LOW: 90,
} as const;
