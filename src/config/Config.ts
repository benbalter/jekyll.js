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
import { ConfigError } from '../utils/errors';

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
  
  // Additional user-defined keys
  // Custom configuration values should be simple types (string, number, boolean, arrays, objects)
  // Used for custom site metadata, theme settings, or plugin configuration
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
 * Load and parse Jekyll configuration from _config.yml
 * @param configPath Path to the configuration file (defaults to _config.yml in current directory)
 * @param verbose Whether to print verbose output
 * @returns Parsed configuration object
 */
export function loadConfig(
  configPath: string = '_config.yml',
  verbose: boolean = false
): JekyllConfig {
  const resolvedPath = resolve(configPath);
  
  if (verbose) {
    console.log(chalk.blue('Loading configuration from:'), resolvedPath);
  }
  
  // Return defaults if file doesn't exist
  if (!existsSync(resolvedPath)) {
    if (verbose) {
      console.log(chalk.yellow('Configuration file not found, using defaults'));
    }
    return getDefaultConfig(dirname(resolvedPath));
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
    
    // Merge with defaults
    const mergedConfig = mergeWithDefaults(config, dirname(resolvedPath));
    
    if (verbose) {
      console.log(chalk.green('✓ Configuration loaded successfully'));
    }
    
    return mergedConfig;
  } catch (error) {
    if (error instanceof ConfigError) {
      throw error;
    }
    
    if (error instanceof Error) {
      // Check if it's a YAML parsing error
      if (error.message.includes('can not read') || 
          error.message.includes('duplicated mapping key') ||
          error.message.includes('unexpected') ||
          error.name === 'YAMLException') {
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
    
    // Exclude patterns (Jekyll defaults + Node.js specific)
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
  const mergedExclude = [
    ...(defaults.exclude || []),
    ...(userConfig.exclude || []),
  ];
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
    const unsupportedPlugins = config.plugins.filter(
      (plugin) => !isSupportedPlugin(plugin)
    );
    if (unsupportedPlugins.length > 0) {
      warnings.push(
        `The following plugins are not supported: ${unsupportedPlugins.join(', ')}. Ruby plugins must be reimplemented in TypeScript.`
      );
    }
  }
  
  // Check for safe mode
  if (config.safe === true) {
    warnings.push(
      'Safe mode is not fully implemented yet. Custom plugins may still execute.'
    );
  }
  
  // Check for LSI
  if (config.lsi === true) {
    warnings.push(
      'LSI (Latent Semantic Indexing) is not supported and will be ignored.'
    );
  }
  
  // Check for pagination
  if (config.paginate && config.paginate > 0) {
    warnings.push(
      'Pagination is not implemented yet and will be ignored.'
    );
  }
  
  // Validate port number
  if (config.port !== undefined) {
    if (typeof config.port !== 'number' || config.port < 1 || config.port > 65535) {
      errors.push(
        `Invalid port number: ${config.port}. Port must be between 1 and 65535.`
      );
    }
  }
  
  // Validate timezone
  if (config.timezone && typeof config.timezone !== 'string') {
    errors.push('Timezone must be a string.');
  }
  
  // Validate liquid options
  if (config.liquid) {
    if (
      config.liquid.error_mode &&
      !['warn', 'strict', 'lax'].includes(config.liquid.error_mode)
    ) {
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
      const isExcluded = config.exclude?.some(pattern => {
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
 * @param pluginName Name of the plugin
 * @returns Whether the plugin is supported
 */
function isSupportedPlugin(pluginName: string): boolean {
  // List of supported plugins (will be expanded as we implement them)
  const supportedPlugins = [
    'jekyll-seo-tag',
    'jekyll-sitemap',
    'jekyll-feed',
  ];
  
  return supportedPlugins.includes(pluginName);
}

/**
 * Print configuration validation results
 * @param validation Validation result
 * @param verbose Whether to print verbose output
 */
export function printValidation(
  validation: ConfigValidation,
  verbose: boolean = false
): void {
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
