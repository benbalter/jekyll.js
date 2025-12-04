/**
 * Modern HTML minification plugin
 *
 * This plugin provides HTML minification for built pages, reducing output size
 * and improving page load times. It uses html-minifier-terser for optimal compression.
 *
 * Features:
 * - Removes unnecessary whitespace and comments
 * - Collapses boolean attributes
 * - Minifies inline CSS and JavaScript
 * - Preserves important whitespace in pre/textarea elements
 * - Fully opt-in to maintain backwards compatibility
 *
 * @see https://github.com/terser/html-minifier-terser
 */

import { minify, Options as MinifyOptions } from 'html-minifier-terser';
import { logger } from '../utils/logger';

/**
 * Configuration options for HTML minification
 */
export interface HtmlMinificationOptions {
  /** Enable HTML minification (default: false) */
  enabled?: boolean;

  /** Remove HTML comments (default: true) */
  removeComments?: boolean;

  /** Collapse whitespace (default: true) */
  collapseWhitespace?: boolean;

  /** Keep closing slash on void elements (default: false) */
  keepClosingSlash?: boolean;

  /** Minify inline CSS (default: true) */
  minifyCSS?: boolean;

  /** Minify inline JavaScript (default: true) */
  minifyJS?: boolean;

  /** Remove optional tags like </p>, </li> (default: false) */
  removeOptionalTags?: boolean;

  /** Remove quotes around attributes when safe (default: false) */
  removeAttributeQuotes?: boolean;

  /** Collapse boolean attributes like disabled="disabled" to disabled (default: true) */
  collapseBooleanAttributes?: boolean;

  /** Remove empty attributes (default: true) */
  removeEmptyAttributes?: boolean;

  /** Process conditional comments (default: true) */
  processConditionalComments?: boolean;

  /** Sort attributes (default: false) */
  sortAttributes?: boolean;

  /** Sort CSS classes (default: false) */
  sortClassName?: boolean;
}

/**
 * Default minification options - balanced between compression and safety
 */
const DEFAULT_OPTIONS: HtmlMinificationOptions = {
  enabled: false,
  removeComments: true,
  collapseWhitespace: true,
  keepClosingSlash: false,
  minifyCSS: true,
  minifyJS: true,
  removeOptionalTags: false,
  removeAttributeQuotes: false,
  collapseBooleanAttributes: true,
  removeEmptyAttributes: true,
  processConditionalComments: true,
  sortAttributes: false,
  sortClassName: false,
};

/**
 * Result of HTML minification
 */
export interface MinificationResult {
  /** Minified HTML content */
  html: string;

  /** Original size in bytes */
  originalSize: number;

  /** Minified size in bytes */
  minifiedSize: number;

  /** Size reduction percentage */
  reduction: number;
}

/**
 * Minify HTML content
 *
 * @param html HTML content to minify
 * @param options Minification options
 * @returns Minification result with statistics
 *
 * @example
 * ```typescript
 * const result = await minifyHtml('<html>  <body>  Hello  </body>  </html>', {
 *   enabled: true,
 *   collapseWhitespace: true
 * });
 * console.log(result.html); // '<html><body>Hello</body></html>'
 * console.log(`Reduced by ${result.reduction.toFixed(1)}%`);
 * ```
 */
export async function minifyHtml(
  html: string,
  options: HtmlMinificationOptions = {}
): Promise<MinificationResult> {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  // If not enabled, return original
  if (!mergedOptions.enabled) {
    return {
      html,
      originalSize: Buffer.byteLength(html, 'utf-8'),
      minifiedSize: Buffer.byteLength(html, 'utf-8'),
      reduction: 0,
    };
  }

  const originalSize = Buffer.byteLength(html, 'utf-8');

  try {
    // Convert our options to html-minifier-terser options
    const minifierOptions: MinifyOptions = {
      removeComments: mergedOptions.removeComments,
      collapseWhitespace: mergedOptions.collapseWhitespace,
      keepClosingSlash: mergedOptions.keepClosingSlash,
      minifyCSS: mergedOptions.minifyCSS,
      minifyJS: mergedOptions.minifyJS,
      removeOptionalTags: mergedOptions.removeOptionalTags,
      removeAttributeQuotes: mergedOptions.removeAttributeQuotes,
      collapseBooleanAttributes: mergedOptions.collapseBooleanAttributes,
      removeEmptyAttributes: mergedOptions.removeEmptyAttributes,
      processConditionalComments: mergedOptions.processConditionalComments,
      sortAttributes: mergedOptions.sortAttributes,
      sortClassName: mergedOptions.sortClassName,
      // Always preserve whitespace-sensitive elements
      preserveLineBreaks: false,
      conservativeCollapse: true,
    };

    const minifiedHtml = await minify(html, minifierOptions);
    const minifiedSize = Buffer.byteLength(minifiedHtml, 'utf-8');
    const reduction = ((originalSize - minifiedSize) / originalSize) * 100;

    logger.debug(
      `HTML minified: ${originalSize} → ${minifiedSize} bytes (${reduction.toFixed(1)}% reduction)`
    );

    return {
      html: minifiedHtml,
      originalSize,
      minifiedSize,
      reduction,
    };
  } catch (error) {
    logger.warn(
      `HTML minification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    // Return original on error
    return {
      html,
      originalSize,
      minifiedSize: originalSize,
      reduction: 0,
    };
  }
}

/**
 * Check if HTML minification is enabled in config
 *
 * @param config Site configuration
 * @returns true if HTML minification is enabled
 */
export function isHtmlMinificationEnabled(config: {
  modern?: { htmlMinification?: HtmlMinificationOptions };
}): boolean {
  return config.modern?.htmlMinification?.enabled === true;
}

/**
 * Get HTML minification options from config
 *
 * @param config Site configuration
 * @returns Merged minification options
 */
export function getHtmlMinificationOptions(config: {
  modern?: { htmlMinification?: HtmlMinificationOptions };
}): HtmlMinificationOptions {
  return {
    ...DEFAULT_OPTIONS,
    ...config.modern?.htmlMinification,
  };
}

/**
 * Batch minify multiple HTML files
 *
 * @param htmlFiles Array of HTML content strings
 * @param options Minification options
 * @returns Array of minification results
 */
export async function minifyHtmlBatch(
  htmlFiles: string[],
  options: HtmlMinificationOptions = {}
): Promise<MinificationResult[]> {
  return Promise.all(htmlFiles.map((html) => minifyHtml(html, options)));
}

/**
 * Get total statistics from batch minification
 *
 * @param results Array of minification results
 * @returns Aggregated statistics
 */
export function getMinificationStats(results: MinificationResult[]): {
  totalOriginalSize: number;
  totalMinifiedSize: number;
  totalReduction: number;
  fileCount: number;
} {
  const totalOriginalSize = results.reduce((sum, r) => sum + r.originalSize, 0);
  const totalMinifiedSize = results.reduce((sum, r) => sum + r.minifiedSize, 0);
  const totalReduction =
    totalOriginalSize > 0 ? ((totalOriginalSize - totalMinifiedSize) / totalOriginalSize) * 100 : 0;

  return {
    totalOriginalSize,
    totalMinifiedSize,
    totalReduction,
    fileCount: results.length,
  };
}
