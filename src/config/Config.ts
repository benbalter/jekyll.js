/**
 * Configuration module for Jekyll.js
 *
 * Dependencies: js-yaml, chalk, lodash.merge (defined in package.json)
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname, join, relative, isAbsolute } from 'path';
import yaml from 'js-yaml';
import chalk from 'chalk';
import merge from 'lodash.merge';
import { minimatch } from 'minimatch';
import { ConfigError } from '../utils/errors';
import { normalizePathSeparators } from '../utils/path-security';
import { VALID_ENCODINGS } from './validation';

/**
 * Jekyll configuration interface
 * Based on Jekyll 4.x configuration options
 * @see https://jekyllrb.com/docs/configuration/
 */
export interface JekyllConfig {
  // Site settings
  title?: string;
  email?: string;
  description?: string;
  url?: string;
  baseurl?: string;

  // Build settings
  source?: string;
  destination?: string;
  collections_dir?: string;
  plugins_dir?: string;
  layouts_dir?: string;
  data_dir?: string;
  includes_dir?: string;

  // Collections
  collections?: Record<string, any>;

  // Content rendering
  markdown?: string;
  highlighter?: string;
  incremental?: boolean;

  /**
   * Kramdown processor options
   * @see https://kramdown.gettalong.org/options.html
   */
  kramdown?: {
    /**
     * Enable or disable smart quotes conversion.
     * When true (default), ASCII quotes are converted to typographic Unicode characters.
     * Set to false or use ["apos", "apos", "quot", "quot"] to disable smart quotes.
     * @default true
     */
    smart_quotes?: boolean | string[];
  };

  // Serving
  port?: number;
  host?: string;
  baseurl_serve?: string;

  // Output
  permalink?: string;
  paginate?: number;
  paginate_path?: string;
  timezone?: string;

  // Theme
  theme?: string;

  // Processing
  safe?: boolean;
  exclude?: string[];
  include?: string[];
  keep_files?: string[];

  // Plugins
  plugins?: string[];
  whitelist?: string[];

  // Conversion
  markdown_ext?: string;

  /**
   * File encoding for reading source files
   * Default: 'utf-8'
   * @example 'utf-8', 'utf16le', 'latin1', 'ascii'
   */
  encoding?: BufferEncoding;

  // Front matter defaults
  defaults?: Array<{
    scope: { path: string; type?: string };
    values: Record<string, any>;
  }>;

  // Liquid options
  liquid?: {
    error_mode?: 'warn' | 'strict' | 'lax';
    strict_filters?: boolean;
    strict_variables?: boolean;
  };

  // Output formatting
  show_drafts?: boolean;
  future?: boolean;
  unpublished?: boolean;

  // LSI (latent semantic indexing)
  lsi?: boolean;

  // Limit posts
  limit_posts?: number;

  // Watch/Serve
  watch?: boolean;
  force_polling?: boolean;
  livereload?: boolean;
  livereload_port?: number;
  livereload_min_delay?: number;
  livereload_max_delay?: number;
  livereload_ignore?: string[];

  // SASS/SCSS configuration
  sass?: {
    sass_dir?: string;
    style?: 'nested' | 'expanded' | 'compact' | 'compressed';
    source_comments?: boolean;
    /**
     * Additional directories to search for SASS imports
     */
    load_paths?: string[];
    /**
     * Control source map generation: 'always' (default), 'never', or 'development'
     */
    sourcemap?: 'always' | 'never' | 'development';
  };

  // Quiet mode
  quiet?: boolean;
  verbose?: boolean;

  // Disable disk cache
  disable_disk_cache?: boolean;

  // Profile
  profile?: boolean;

  // Strict front matter
  strict_front_matter?: boolean;

  // Modern JS/SSG features (Jekyll.js specific, opt-in)
  modern?: {
    // Syntax highlighting with Shiki
    syntaxHighlighting?: {
      enabled?: boolean;
      theme?: string;
      showLineNumbers?: boolean;
    };
    // Image optimization with Sharp
    imageOptimization?: {
      enabled?: boolean;
      quality?: number;
      generateWebP?: boolean;
      generateAVIF?: boolean;
      responsiveSizes?: number[];
    };
    // HTML minification
    htmlMinification?: {
      enabled?: boolean;
      removeComments?: boolean;
      collapseWhitespace?: boolean;
      keepClosingSlash?: boolean;
      minifyCSS?: boolean;
      minifyJS?: boolean;
      removeOptionalTags?: boolean;
      removeAttributeQuotes?: boolean;
      collapseBooleanAttributes?: boolean;
      removeEmptyAttributes?: boolean;
      processConditionalComments?: boolean;
      sortAttributes?: boolean;
      sortClassName?: boolean;
    };
    // Resource hints (preload/prefetch)
    resourceHints?: {
      enabled?: boolean;
      preloadStyles?: boolean;
      preloadFonts?: boolean;
      preloadHeroImages?: boolean;
      preconnectOrigins?: string[];
      prefetchUrls?: string[];
      dnsPrefetchDomains?: string[];
      customPreloads?: Array<{
        href: string;
        rel: 'preload' | 'prefetch' | 'preconnect' | 'dns-prefetch';
        as?: 'style' | 'script' | 'font' | 'image' | 'fetch' | 'document';
        type?: string;
        crossorigin?: 'anonymous' | 'use-credentials' | '';
        media?: string;
      }>;
    };
    // Performance features
    performance?: {
      parallelProcessing?: boolean;
      cacheEnabled?: boolean;
    };
  };

  // Feed plugin configuration
  feed?: {
    path?: string;
    posts_limit?: number;
  };

  // Additional user-defined keys
  // Custom configuration values should be simple types (string, number, boolean, arrays, objects)
  // Used for custom site metadata, theme settings, or plugin configuration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

/**
 * Configuration validation result
 */
export interface ConfigValidation {
  valid: boolean;
  warnings: string[];
  errors: string[];
}

/**
 * Expand environment variables in a string
 * Supports ${VAR} and ${VAR:-default} syntax for environment variable expansion
 * @param value String that may contain environment variable references
 * @returns String with environment variables expanded
 */
export function expandEnvVariables(value: string): string {
  // Use a simple iterative approach to avoid ReDoS vulnerabilities
  // that can occur with nested quantifiers in regex patterns
  let result = '';
  let i = 0;

  while (i < value.length) {
    // Check for ${
    if (i < value.length - 1 && value[i] === '$' && value[i + 1] === '{') {
      const startIndex = i;
      i += 2; // Skip past ${

      // Find the closing }
      const closingIndex = value.indexOf('}', i);
      if (closingIndex === -1) {
        // No closing }, append the rest and break
        result += value.substring(startIndex);
        break;
      }

      // Extract content between ${ and }
      const content = value.substring(i, closingIndex);

      // Check for :- separator (default value syntax)
      const separatorIndex = content.indexOf(':-');
      let varName: string;
      let defaultValue: string | undefined;

      if (separatorIndex !== -1) {
        varName = content.substring(0, separatorIndex);
        defaultValue = content.substring(separatorIndex + 2);
      } else {
        varName = content;
        defaultValue = undefined;
      }

      // Validate that variable name is not empty or whitespace-only
      if (!varName || varName.trim() === '') {
        // Return the original match unchanged if varName is empty
        result += value.substring(startIndex, closingIndex + 1);
      } else {
        const envValue = process.env[varName];
        if (envValue !== undefined) {
          result += envValue;
        } else {
          result += defaultValue !== undefined ? defaultValue : '';
        }
      }

      i = closingIndex + 1;
    } else {
      result += value[i];
      i++;
    }
  }

  return result;
}

/**
 * Recursively expand environment variables in config values
 * @param config Configuration object or value
 * @returns Configuration with expanded environment variables
 */
export function expandConfigEnvVariables(config: unknown): unknown {
  if (typeof config === 'string') {
    return expandEnvVariables(config);
  }
  if (Array.isArray(config)) {
    return config.map((item) => expandConfigEnvVariables(item));
  }
  if (config !== null && typeof config === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(config)) {
      result[key] = expandConfigEnvVariables(value);
    }
    return result;
  }
  return config;
}

/**
 * Normalize collections configuration to object format
 * Jekyll supports two formats for collections:
 * 1. Object format: { recipes: { output: true }, authors: { output: false } }
 * 2. Array format: ["recipes", "authors"] (uses default settings)
 * This function converts array format to object format with default settings
 * @param collections Collections configuration (object or array)
 * @returns Normalized collections as an object
 */
export function normalizeCollections(
  collections: Record<string, any> | string[] | undefined
): Record<string, any> {
  // If undefined or null, return empty object
  if (!collections) {
    return {};
  }

  // If already an object, return as-is
  if (!Array.isArray(collections)) {
    return collections;
  }

  // Convert array to object with default settings
  // Default setting is output: true (matching Jekyll's behavior)
  const normalized: Record<string, any> = {};
  for (const collectionName of collections) {
    if (typeof collectionName === 'string' && collectionName.trim() !== '') {
      normalized[collectionName] = { output: true };
    }
  }

  return normalized;
}

/**
 * Load a single configuration file
 * @param configPath Path to the configuration file
 * @param verbose Whether to print verbose output
 * @returns Parsed configuration object or null if file doesn't exist
 */
function loadSingleConfigFile(configPath: string, verbose: boolean = false): JekyllConfig | null {
  const resolvedPath = resolve(configPath);

  if (!existsSync(resolvedPath)) {
    if (verbose) {
      console.log(chalk.yellow(`Configuration file not found: ${resolvedPath}`));
    }
    return null;
  }

  try {
    // Read and parse YAML file
    // Note: yaml.load() in js-yaml v4+ is safe by default
    const fileContent = readFileSync(resolvedPath, 'utf-8');
    const config = yaml.load(fileContent) as JekyllConfig;

    if (!config || typeof config !== 'object') {
      throw new ConfigError('Configuration file is empty or invalid', {
        file: resolvedPath,
      });
    }

    if (verbose) {
      console.log(chalk.green('✓ Loaded:'), resolvedPath);
    }

    // Normalize collections immediately after parsing
    // This ensures the config always has collections in object format
    config.collections = normalizeCollections(
      config.collections as Record<string, any> | string[] | undefined
    );

    return config;
  } catch (error) {
    if (error instanceof ConfigError) {
      throw error;
    }

    if (error instanceof Error) {
      // Check if it's a YAML parsing error
      if (
        error.message.includes('can not read') ||
        error.message.includes('duplicated mapping key') ||
        error.message.includes('unexpected') ||
        error.name === 'YAMLException'
      ) {
        throw new ConfigError(`Failed to parse configuration file: ${error.message}`, {
          file: resolvedPath,
          cause: error,
        });
      }

      // Generic file read error
      throw new ConfigError(`Failed to read configuration file: ${error.message}`, {
        file: resolvedPath,
        cause: error,
      });
    }
    throw error;
  }
}

/**
 * Load and parse Jekyll configuration from one or more config files
 * Supports comma-separated list of config files (like Jekyll's --config option)
 * Later files override earlier ones
 * Environment variables in config values are expanded using ${VAR} or ${VAR:-default} syntax
 *
 * @param configPath Path(s) to configuration file(s), comma-separated for multiple files
 * @param verbose Whether to print verbose output
 * @returns Parsed and merged configuration object
 *
 * @example
 * // Single config file
 * loadConfig('_config.yml')
 *
 * // Multiple config files (later files override)
 * loadConfig('_config.yml,_config.prod.yml')
 *
 * // Environment variables in config
 * // _config.yml: url: ${SITE_URL:-http://localhost:4000}
 */
export function loadConfig(
  configPath: string = '_config.yml',
  verbose: boolean = false
): JekyllConfig {
  // Split by comma for multiple config files
  const configPaths = configPath
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (configPaths.length === 0) {
    configPaths.push('_config.yml');
  }

  if (verbose) {
    console.log(chalk.blue('Loading configuration from:'), configPaths.join(', '));
  }

  // Determine source path from first config file's directory
  // This is consistent with Jekyll's behavior where all config files are resolved
  // relative to the first config file's directory (typically the site root)
  const firstConfigPath = resolve(configPaths[0] || '_config.yml');
  const sourcePath = dirname(firstConfigPath);

  // Load and merge all config files
  let mergedUserConfig: JekyllConfig = {};
  let anyConfigLoaded = false;

  for (const path of configPaths) {
    // Resolve relative paths against the source path (first config's directory)
    // Absolute paths are used as-is
    // Note: This matches Jekyll's behavior where all relative config paths are resolved
    // relative to the first config file's directory, even if that file doesn't exist.
    // This ensures predictable resolution when using multiple configs from the same project.
    const resolvedPath = isAbsolute(path) ? path : resolve(sourcePath, path);
    const config = loadSingleConfigFile(resolvedPath, verbose);

    if (config) {
      anyConfigLoaded = true;
      // Use deep merge - later configs override earlier ones
      mergedUserConfig = merge({}, mergedUserConfig, config);
    }
  }

  // If no config files were loaded, use defaults
  if (!anyConfigLoaded) {
    if (verbose) {
      console.log(chalk.yellow('No configuration files found, using defaults'));
    }
    return getDefaultConfig(sourcePath);
  }

  // Expand environment variables in config values
  const expandedConfig = expandConfigEnvVariables(mergedUserConfig) as JekyllConfig;

  // Merge with defaults
  const mergedConfig = mergeWithDefaults(expandedConfig, sourcePath);

  if (verbose) {
    console.log(chalk.green('✓ Configuration loaded successfully'));
  }

  return mergedConfig;
}

/**
 * Get default Jekyll configuration
 * @param sourcePath Source directory path
 * @returns Default configuration object
 */
export function getDefaultConfig(sourcePath: string = '.'): JekyllConfig {
  const resolvedSource = resolve(sourcePath);

  return {
    // Default Jekyll settings
    source: resolvedSource,
    destination: join(resolvedSource, '_site'),
    collections_dir: '.',
    plugins_dir: '_plugins',
    layouts_dir: '_layouts',
    data_dir: '_data',
    includes_dir: '_includes',

    // Collections
    collections: {},

    // Exclude patterns (Ruby Jekyll defaults)
    // See: https://github.com/jekyll/jekyll/blob/master/lib/jekyll/configuration.rb
    exclude: [
      '.sass-cache',
      '.jekyll-cache',
      'gemfiles',
      'Gemfile',
      'Gemfile.lock',
      'node_modules',
      'vendor/bundle/',
      'vendor/cache/',
      'vendor/gems/',
      'vendor/ruby/',
    ],

    // Include patterns
    include: ['.htaccess'],

    // Keep files
    keep_files: ['.git', '.svn'],

    // Timezone
    timezone: 'UTC',

    // Markdown
    markdown: 'kramdown',
    highlighter: 'rouge',
    markdown_ext: 'markdown,mkdown,mkdn,mkd,md',

    // File encoding
    encoding: 'utf-8',

    // Serving
    port: 4000,
    host: 'localhost',
    baseurl: '',

    // Processing
    safe: false,
    future: false,
    unpublished: false,
    show_drafts: false,

    // Liquid
    liquid: {
      error_mode: 'warn',
      strict_filters: false,
      strict_variables: false,
    },

    // Incremental build
    incremental: false,

    // Watch
    watch: false,
    force_polling: false,

    // LiveReload
    livereload: true,
    livereload_port: 35729,
    livereload_min_delay: 0,
    livereload_max_delay: 0,

    // Performance
    profile: false,

    // Quiet/verbose
    quiet: false,
    verbose: false,

    // Disk cache
    disable_disk_cache: false,

    // Front matter
    strict_front_matter: false,

    // LSI
    lsi: false,

    // Limit posts
    limit_posts: 0,

    // Permalink
    permalink: 'date',
  };
}

/**
 * Merge user configuration with defaults
 * Uses lodash.merge for deep merging of nested configuration objects
 * @param userConfig User-provided configuration
 * @param sourcePath Source directory path
 * @returns Merged configuration
 */
export function mergeWithDefaults(
  userConfig: JekyllConfig,
  sourcePath: string = '.'
): JekyllConfig {
  const defaults = getDefaultConfig(sourcePath);

  // Use lodash.merge for deep merging - it handles nested objects properly
  const merged = merge({}, defaults, userConfig);

  // Handle exclude array specially - we want to combine and deduplicate
  // lodash.merge concatenates arrays by default, but we want to ensure no duplicates
  // in exclude patterns (e.g., default 'node_modules' + user's custom excludes)
  const mergedExclude = [...(defaults.exclude || []), ...(userConfig.exclude || [])];
  const uniqueExclude = Array.from(new Set(mergedExclude));
  merged.exclude = uniqueExclude;

  // Resolve source path - if absolute, use as-is; if relative, resolve from sourcePath (config dir)
  merged.source = userConfig.source
    ? isAbsolute(userConfig.source)
      ? resolve(userConfig.source)
      : resolve(sourcePath, userConfig.source)
    : defaults.source!;

  // Resolve destination path - if absolute, use as-is; if relative, resolve from sourcePath (config dir)
  merged.destination = userConfig.destination
    ? isAbsolute(userConfig.destination)
      ? resolve(userConfig.destination)
      : resolve(sourcePath, userConfig.destination)
    : defaults.destination!;

  // Automatically exclude the destination directory if it's inside the source directory
  // This prevents the built site from being copied into itself on subsequent builds
  const resolvedSource = merged.source!;
  const resolvedDest = merged.destination!;
  const relativeDest = relative(resolvedSource, resolvedDest);

  // Check if destination is inside source:
  // - relativeDest is non-empty (destination != source)
  // - relativeDest doesn't start with '..' (destination is inside, not outside source)
  // Note: When paths are properly resolved, relative() won't return paths starting with '/'
  if (relativeDest.length > 0 && !relativeDest.startsWith('..')) {
    // Add the destination directory to the exclude list if not already present
    if (!merged.exclude!.includes(relativeDest)) {
      merged.exclude!.push(relativeDest);
    }
  }

  // Normalize encoding to lowercase (Jekyll Ruby accepts case-insensitive encoding)
  if (merged.encoding) {
    merged.encoding = merged.encoding.toLowerCase() as BufferEncoding;
  }

  // Normalize collections - convert array format to object format if needed
  merged.collections = normalizeCollections(merged.collections);

  return merged;
}

/**
 * Validate Jekyll configuration
 * @param config Configuration to validate
 * @returns Validation result with warnings and errors
 */
export function validateConfig(config: JekyllConfig): ConfigValidation {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Check for unsupported markdown processors
  if (config.markdown && config.markdown !== 'kramdown') {
    warnings.push(
      `Markdown processor "${config.markdown}" is not fully supported yet. Using default processor.`
    );
  }

  // Check for unsupported highlighters
  if (config.highlighter && config.highlighter !== 'rouge') {
    warnings.push(
      `Syntax highlighter "${config.highlighter}" is not supported yet. Syntax highlighting may not work.`
    );
  }

  // Check for Ruby plugins
  if (config.plugins && config.plugins.length > 0) {
    const unsupportedPlugins = config.plugins.filter((plugin) => !isSupportedPlugin(plugin));
    if (unsupportedPlugins.length > 0) {
      warnings.push(
        `The following plugins have invalid names or are not supported: ${unsupportedPlugins.join(', ')}. ` +
          'Plugins must be either built-in plugins or valid npm package names.'
      );
    }
  }

  // Check for safe mode
  if (config.safe === true) {
    warnings.push('Safe mode is not fully implemented yet. Custom plugins may still execute.');
  }

  // Check for LSI
  if (config.lsi === true) {
    warnings.push('LSI (Latent Semantic Indexing) is not supported and will be ignored.');
  }

  // Validate port number
  if (config.port !== undefined) {
    if (typeof config.port !== 'number' || config.port < 1 || config.port > 65535) {
      errors.push(`Invalid port number: ${config.port}. Port must be between 1 and 65535.`);
    }
  }

  // Validate timezone
  if (config.timezone && typeof config.timezone !== 'string') {
    errors.push('Timezone must be a string.');
  }

  // Validate timezone format (IANA timezone or UTC offset)
  if (config.timezone && typeof config.timezone === 'string') {
    // Try to validate timezone using Intl.DateTimeFormat
    // This validates against the system's supported IANA timezones
    try {
      // Attempt to create a DateTimeFormat with the timezone
      // This will throw if the timezone is invalid
      Intl.DateTimeFormat(undefined, { timeZone: config.timezone });
    } catch {
      // Basic fallback pattern check for common formats
      // Note: 'local' is not a valid IANA timezone and is intentionally not supported
      const validTimezonePattern = /^(UTC|GMT|[A-Za-z_]+\/[A-Za-z_]+|[+-]\d{2}:?\d{2})$/;
      if (!validTimezonePattern.test(config.timezone)) {
        warnings.push(
          `Timezone "${config.timezone}" may not be a valid IANA timezone identifier. ` +
            `Examples: 'America/New_York', 'UTC', 'Europe/London'.`
        );
      }
    }
  }

  // Validate encoding using the shared VALID_ENCODINGS constant
  // Jekyll (Ruby) accepts encoding values case-insensitively
  if (config.encoding) {
    const normalizedEncoding = config.encoding.toLowerCase() as BufferEncoding;
    if (!VALID_ENCODINGS.includes(normalizedEncoding)) {
      errors.push(
        `Invalid encoding: "${config.encoding}". ` + `Valid options: ${VALID_ENCODINGS.join(', ')}.`
      );
    }
  }

  // Validate markdown_ext format
  // Extensions can contain alphanumeric characters, hyphens, and underscores
  // Examples: md, markdown, mkd, rmd, Rmd
  if (config.markdown_ext && typeof config.markdown_ext === 'string') {
    const extensions = config.markdown_ext.split(',').map((ext) => ext.trim());
    const invalidExtensions = extensions.filter((ext) => !/^[a-zA-Z0-9_-]+$/.test(ext));
    if (invalidExtensions.length > 0) {
      warnings.push(
        `Invalid markdown extensions: "${invalidExtensions.join(', ')}". ` +
          `Extensions should contain only letters, numbers, hyphens, or underscores (no dots or special characters).`
      );
    }
  }

  // Validate liquid options
  if (config.liquid) {
    if (config.liquid.error_mode && !['warn', 'strict', 'lax'].includes(config.liquid.error_mode)) {
      errors.push(
        `Invalid liquid.error_mode: ${config.liquid.error_mode}. Must be 'warn', 'strict', or 'lax'.`
      );
    }
  }

  // Check for source and destination overlap
  if (config.source && config.destination) {
    const source = resolve(config.source);
    const dest = resolve(config.destination);
    const relativeDest = relative(source, dest);

    // Check if destination is inside source
    // relative() returns empty string when paths are equal, or starts with '..' when dest is outside source
    if (relativeDest && !relativeDest.startsWith('..')) {
      const isExcluded = config.exclude?.some((pattern) => {
        // Check if the relative path matches or starts with the pattern
        return relativeDest === pattern || relativeDest.startsWith(pattern + '/');
      });

      if (!isExcluded) {
        warnings.push(
          `Destination directory is inside source directory. Consider excluding it in config.`
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
  };
}

/**
 * Check if a plugin is supported
 * A plugin is considered supported if:
 * 1. It's a known built-in plugin
 * 2. It has a valid npm package name format (could be an npm plugin)
 *
 * @param pluginName Name of the plugin
 * @returns Whether the plugin is supported
 */
function isSupportedPlugin(pluginName: string): boolean {
  // List of built-in plugins
  // NOTE: These names must match the actual plugin `name` properties defined in src/plugins/*.ts
  const builtInPlugins = [
    'jekyll-seo-tag',
    'jekyll-sitemap',
    'jekyll-feed',
    'jemoji', // gem name is 'jemoji', not 'jekyll-jemoji'
    'jekyll-redirect-from',
    'jekyll-avatar',
    'jekyll-github-metadata',
    'jekyll-mentions',
    'jekyll-og-image',
  ];

  // If it's a built-in plugin, it's supported
  if (builtInPlugins.includes(pluginName)) {
    return true;
  }

  // If it looks like a valid npm package name, assume it's an npm plugin
  // npm package names can be:
  // - Unscoped: my-plugin, jekyll-custom-plugin
  // - Scoped: @scope/my-plugin, @myorg/jekyll-plugin
  if (isValidNpmPackageNameForConfig(pluginName)) {
    return true;
  }

  return false;
}

/**
 * Check if a string is a valid npm package name format
 * This is a simplified check for configuration validation
 * @param name Package name to check
 * @returns Whether it looks like a valid npm package name
 */
function isValidNpmPackageNameForConfig(name: string): boolean {
  if (!name || typeof name !== 'string' || name.length === 0 || name.length > 214) {
    return false;
  }

  // Check for path traversal attempts and absolute paths
  if (name.includes('..') || name.includes('/..') || name.includes('../')) {
    return false;
  }

  // Check for absolute paths and backslashes (Windows-style path separators)
  if (name.startsWith('/') || name.includes('\\')) {
    return false;
  }

  // Scoped packages: @scope/package-name
  if (name.startsWith('@')) {
    const parts = name.split('/');
    if (parts.length !== 2) {
      return false;
    }
    const scope = parts[0]?.substring(1); // Remove @
    const pkgName = parts[1];
    return isValidUnscopedName(scope || '') && isValidUnscopedName(pkgName || '');
  }

  return isValidUnscopedName(name);
}

/**
 * Check if a string is a valid unscoped npm package name
 * @param name Name to check
 * @returns Whether it's valid
 */
function isValidUnscopedName(name: string): boolean {
  if (!name || name.length === 0) {
    return false;
  }
  // Must not start with . or _
  if (name.startsWith('.') || name.startsWith('_')) {
    return false;
  }
  // Must be lowercase and contain only valid characters: a-z, 0-9, -, _, ., ~
  return /^[a-z0-9][-a-z0-9._~]*$/.test(name);
}

/**
 * Print configuration validation results
 * @param validation Validation result
 * @param verbose Whether to print verbose output
 */
export function printValidation(validation: ConfigValidation, verbose: boolean = false): void {
  if (validation.errors.length > 0) {
    console.error(chalk.red('\nConfiguration errors:'));
    validation.errors.forEach((error) => {
      console.error(chalk.red('  ✗'), error);
    });
  }

  if (validation.warnings.length > 0 && (verbose || validation.errors.length === 0)) {
    console.warn(chalk.yellow('\nConfiguration warnings:'));
    validation.warnings.forEach((warning) => {
      console.warn(chalk.yellow('  ⚠'), warning);
    });
  }

  if (validation.errors.length === 0 && verbose) {
    console.log(chalk.green('\n✓ Configuration is valid'));
  }
}

/**
 * Apply front matter defaults to a document based on configuration
 * @param relativePath Relative path of the document from source
 * @param documentType Type of document (page, post, or collection name)
 * @param frontMatter Existing front matter from the document
 * @param config Site configuration containing defaults
 * @returns Merged front matter with defaults applied
 */
export function applyFrontMatterDefaults(
  relativePath: string,
  documentType: string,
  frontMatter: Record<string, any>,
  config: JekyllConfig
): Record<string, any> {
  // If no defaults configured, return front matter as-is
  if (!config.defaults || config.defaults.length === 0) {
    return frontMatter;
  }

  // Start with an empty object for defaults
  let appliedDefaults: Record<string, any> = {};

  // Process each default scope in order
  for (const defaultConfig of config.defaults) {
    const { scope, values } = defaultConfig;

    // Check if this scope matches the document
    if (!matchesScope(relativePath, documentType, scope)) {
      continue;
    }

    // Merge values from this scope
    // Later scopes override earlier ones
    appliedDefaults = { ...appliedDefaults, ...values };
  }

  // File's front matter takes precedence over defaults
  return { ...appliedDefaults, ...frontMatter };
}

/**
 * Check if a document matches a defaults scope
 * @param relativePath Relative path of the document from source
 * @param documentType Type of document (page, post, or collection name)
 * @param scope Scope definition from defaults configuration
 * @returns Whether the document matches the scope
 */
function matchesScope(
  relativePath: string,
  documentType: string,
  scope: { path: string; type?: string }
): boolean {
  // Check type match if type is specified
  if (scope.type !== undefined) {
    // Map document types to scope types
    // "posts" type matches DocumentType.POST
    // "pages" type matches DocumentType.PAGE
    // Collection names match DocumentType.COLLECTION with matching collection
    const scopeType = scope.type;

    if (scopeType === 'posts' && documentType !== 'post') {
      return false;
    }
    if (scopeType === 'pages' && documentType !== 'page') {
      return false;
    }
    // For collections, check if documentType matches the collection name
    // or if it's a generic "collections" type
    if (scopeType !== 'posts' && scopeType !== 'pages') {
      // This is a collection name
      if (documentType !== scopeType && documentType !== 'collection') {
        return false;
      }
    }
  }

  // Check path match
  // Empty string matches all paths
  if (scope.path === '') {
    return true;
  }

  // Normalize path separators for cross-platform compatibility
  const normalizedRelPath = normalizePathSeparators(relativePath);
  const normalizedScopePath = normalizePathSeparators(scope.path);

  // Use minimatch for glob pattern matching
  // Match against the path or check if the file is within the directory
  return (
    minimatch(normalizedRelPath, normalizedScopePath) ||
    minimatch(normalizedRelPath, `${normalizedScopePath}/**`) ||
    normalizedRelPath.startsWith(normalizedScopePath + '/')
  );
}
