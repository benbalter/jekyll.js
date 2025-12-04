/**
 * Converter Plugin Interface for Jekyll.js
 *
 * Converter plugins transform content from one format to another.
 * Examples: Markdown to HTML, Textile to HTML, Custom markup to HTML
 *
 * @see https://jekyllrb.com/docs/plugins/converters/
 */

import { Site } from '../core/Site';
import { Document } from '../core/Document';

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
