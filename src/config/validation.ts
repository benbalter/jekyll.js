/**
 * Modern configuration validation using Zod
 *
 * Zod is a TypeScript-first schema validation library that provides:
 * - Runtime type validation
 * - Type inference
 * - Detailed error messages
 * - Composable schemas
 *
 * This module provides enhanced configuration validation for Jekyll.js
 * while maintaining backward compatibility with Jekyll (Ruby).
 *
 * @see https://zod.dev/
 */

import { z } from 'zod';
import { logger } from '../utils/logger';

/**
 * Zod schema for Jekyll configuration
 * This provides runtime validation with TypeScript type inference
 */
export const JekyllConfigSchema = z
  .object({
    // Site settings
    title: z.string().optional(),
    email: z.string().email().optional(),
    description: z.string().optional(),
    url: z.string().url().optional().or(z.literal('')),
    baseurl: z.string().optional(),

    // Build settings
    source: z.string().optional(),
    destination: z.string().optional(),
    collections_dir: z.string().optional(),
    plugins_dir: z.string().optional(),
    layouts_dir: z.string().optional(),
    data_dir: z.string().optional(),
    includes_dir: z.string().optional(),

    // Collections
    collections: z.record(z.string(), z.any()).optional(),

    // Content rendering
    markdown: z.string().optional(),
    highlighter: z.enum(['rouge', 'pygments', 'shiki', 'none']).optional(),
    incremental: z.boolean().optional(),

    // Serving
    port: z.number().int().min(1).max(65535).optional(),
    host: z.string().optional(),
    baseurl_serve: z.string().optional(),

    // Output
    permalink: z.string().optional(),
    paginate: z.number().int().positive().optional(),
    paginate_path: z.string().optional(),
    timezone: z.string().optional(),

    // Theme
    theme: z.string().optional(),

    // Processing
    safe: z.boolean().optional(),
    exclude: z.array(z.string()).optional(),
    include: z.array(z.string()).optional(),
    keep_files: z.array(z.string()).optional(),

    // Plugins
    plugins: z.array(z.string()).optional(),
    whitelist: z.array(z.string()).optional(),

    // Conversion
    markdown_ext: z.string().optional(),

    // Front matter defaults
    defaults: z
      .array(
        z.object({
          scope: z.object({
            path: z.string(),
            type: z.string().optional(),
          }),
          values: z.record(z.string(), z.any()),
        })
      )
      .optional(),

    // Liquid options
    liquid: z
      .object({
        error_mode: z.enum(['warn', 'strict', 'lax']).optional(),
        strict_filters: z.boolean().optional(),
        strict_variables: z.boolean().optional(),
      })
      .optional(),

    // Output formatting
    show_drafts: z.boolean().optional(),
    future: z.boolean().optional(),
    unpublished: z.boolean().optional(),

    // LSI (latent semantic indexing)
    lsi: z.boolean().optional(),

    // Limit posts
    limit_posts: z.number().int().positive().optional(),

    // Watch/Serve
    watch: z.boolean().optional(),
    force_polling: z.boolean().optional(),
    livereload: z.boolean().optional(),
    livereload_port: z.number().int().min(1).max(65535).optional(),
    livereload_min_delay: z.number().int().positive().optional(),
    livereload_max_delay: z.number().int().positive().optional(),
    livereload_ignore: z.array(z.string()).optional(),

    // Build settings
    profile: z.boolean().optional(),
    quiet: z.boolean().optional(),
    verbose: z.boolean().optional(),
    strict_front_matter: z.boolean().optional(),

    // Conversion options
    sass: z
      .object({
        style: z.enum(['nested', 'compact', 'compressed', 'expanded']).optional(),
        sass_dir: z.string().optional(),
        load_paths: z.array(z.string()).optional(),
        source_comments: z.boolean().optional(),
        sourcemap: z.enum(['always', 'never', 'development']).optional(),
      })
      .optional(),

    // Modern features (Jekyll.js specific)
    modern: z
      .object({
        // Syntax highlighting
        syntaxHighlighting: z
          .object({
            enabled: z.boolean().optional(),
            theme: z.string().optional(),
            showLineNumbers: z.boolean().optional(),
          })
          .optional(),

        // Image optimization
        imageOptimization: z
          .object({
            enabled: z.boolean().optional(),
            quality: z.number().int().min(1).max(100).optional(),
            generateWebP: z.boolean().optional(),
            generateAVIF: z.boolean().optional(),
            responsiveSizes: z.array(z.number().int().positive()).optional(),
          })
          .optional(),

        // HTML minification
        htmlMinification: z
          .object({
            enabled: z.boolean().optional(),
            removeComments: z.boolean().optional(),
            collapseWhitespace: z.boolean().optional(),
            keepClosingSlash: z.boolean().optional(),
            minifyCSS: z.boolean().optional(),
            minifyJS: z.boolean().optional(),
            removeOptionalTags: z.boolean().optional(),
            removeAttributeQuotes: z.boolean().optional(),
            collapseBooleanAttributes: z.boolean().optional(),
            removeEmptyAttributes: z.boolean().optional(),
            processConditionalComments: z.boolean().optional(),
            sortAttributes: z.boolean().optional(),
            sortClassName: z.boolean().optional(),
          })
          .optional(),

        // Resource hints (preload/prefetch)
        resourceHints: z
          .object({
            enabled: z.boolean().optional(),
            preloadStyles: z.boolean().optional(),
            preloadFonts: z.boolean().optional(),
            preloadHeroImages: z.boolean().optional(),
            preconnectOrigins: z.array(z.string()).optional(),
            prefetchUrls: z.array(z.string()).optional(),
            dnsPrefetchDomains: z.array(z.string()).optional(),
            customPreloads: z
              .array(
                z.object({
                  href: z.string(),
                  rel: z.enum(['preload', 'prefetch', 'preconnect', 'dns-prefetch']),
                  as: z.enum(['style', 'script', 'font', 'image', 'fetch', 'document']).optional(),
                  type: z.string().optional(),
                  crossorigin: z.enum(['anonymous', 'use-credentials', '']).optional(),
                  media: z.string().optional(),
                })
              )
              .optional(),
          })
          .optional(),

        // Performance features
        performance: z
          .object({
            parallelProcessing: z.boolean().optional(),
            cacheEnabled: z.boolean().optional(),
          })
          .optional(),
      })
      .optional(),

    // Allow additional properties for extensibility
  })
  .passthrough();

/**
 * Infer TypeScript type from Zod schema
 */
export type ValidatedJekyllConfig = z.infer<typeof JekyllConfigSchema>;

/**
 * Validation result with detailed error information
 */
export interface ValidationResult {
  /** Whether validation was successful */
  success: boolean;

  /** Validated and typed configuration (only if success is true) */
  data?: ValidatedJekyllConfig;

  /** Validation errors (only if success is false) */
  errors?: Array<{
    path: string[];
    message: string;
    code: string;
  }>;

  /** Human-readable error message */
  errorMessage?: string;
}

/**
 * Validate Jekyll configuration using Zod schema
 *
 * @param config Configuration object to validate
 * @returns Validation result with typed data or errors
 *
 * @example
 * ```typescript
 * const result = validateJekyllConfig(config);
 * if (result.success) {
 *   // result.data is typed and validated
 *   console.log(result.data.title);
 * } else {
 *   // result.errors contains detailed validation errors
 *   console.error(result.errorMessage);
 * }
 * ```
 */
export function validateJekyllConfig(config: unknown): ValidationResult {
  const result = JekyllConfigSchema.safeParse(config);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  } else {
    // Format Zod errors into a more user-friendly structure
    const errors = result.error.errors.map((err) => ({
      path: err.path.map(String),
      message: err.message,
      code: err.code,
    }));

    // Create human-readable error message
    const errorMessage = result.error.errors
      .map((err) => {
        const path = err.path.length > 0 ? `${err.path.join('.')}: ` : '';
        return `${path}${err.message}`;
      })
      .join('\n');

    return {
      success: false,
      errors,
      errorMessage,
    };
  }
}

/**
 * Validate configuration and log errors
 *
 * @param config Configuration to validate
 * @returns true if valid, false otherwise
 */
export function validateAndLog(config: unknown): boolean {
  const result = validateJekyllConfig(config);

  if (!result.success) {
    logger.error('Configuration validation failed:');
    if (result.errors) {
      for (const error of result.errors) {
        const path = error.path.length > 0 ? `${error.path.join('.')}` : 'config';
        logger.error(`  ${path}: ${error.message}`);
      }
    }
    return false;
  }

  return true;
}

/**
 * Create a default validated configuration
 */
export function getDefaultConfig(): ValidatedJekyllConfig {
  return {
    source: '.',
    destination: './_site',
    layouts_dir: '_layouts',
    includes_dir: '_includes',
    data_dir: '_data',
    collections_dir: '',

    // Defaults
    permalink: 'date',
    markdown: 'kramdown',
    highlighter: 'rouge',

    // Server
    port: 4000,
    host: 'localhost',
    livereload: true,

    // Build
    exclude: [
      '.git',
      '.gitignore',
      'node_modules',
      'package.json',
      'package-lock.json',
      'README.md',
    ],

    // Modern features (opt-in)
    modern: {
      syntaxHighlighting: {
        enabled: false,
      },
      imageOptimization: {
        enabled: false,
      },
      htmlMinification: {
        enabled: false,
      },
      resourceHints: {
        enabled: false,
      },
      performance: {
        parallelProcessing: false,
        cacheEnabled: true,
      },
    },
  };
}

/**
 * Merge user config with defaults, validating the result
 *
 * @param userConfig User-provided configuration
 * @returns Validated merged configuration
 */
export function mergeAndValidateConfig(userConfig: unknown): ValidationResult {
  const defaults = getDefaultConfig();

  // Merge configs
  const merged = {
    ...defaults,
    ...(typeof userConfig === 'object' && userConfig !== null ? userConfig : {}),
  };

  return validateJekyllConfig(merged);
}

/**
 * Partial validation - only validates provided fields
 * Useful for validating partial config updates
 */
export function validatePartialConfig(config: unknown): ValidationResult {
  const PartialSchema = JekyllConfigSchema.partial();
  const result = PartialSchema.safeParse(config);

  if (result.success) {
    return {
      success: true,
      data: result.data as ValidatedJekyllConfig,
    };
  } else {
    const errors = result.error.errors.map((err) => ({
      path: err.path.map(String),
      message: err.message,
      code: err.code,
    }));

    const errorMessage = result.error.errors
      .map((err) => `${err.path.join('.')}: ${err.message}`)
      .join('\n');

    return {
      success: false,
      errors,
      errorMessage,
    };
  }
}
