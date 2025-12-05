/**
 * npm Plugin Loader for Jekyll.js
 *
 * Provides functionality to discover and load plugins from npm packages
 * installed in node_modules. This allows users to install Jekyll.js plugins
 * via npm and configure them in _config.yml.
 *
 * Similar to Jekyll.rb's plugin ecosystem, users can:
 * 1. Install plugins via npm: `npm install jekyll-ts-some-plugin`
 * 2. Configure them in _config.yml: `plugins: ["jekyll-ts-some-plugin"]`
 *
 * npm plugins should export a class or object implementing the Plugin interface.
 */

import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { Plugin } from './types';
import { logger } from '../utils/logger';

/**
 * Result of attempting to load an npm plugin
 */
export interface NpmPluginLoadResult {
  /** Whether the plugin was successfully loaded */
  success: boolean;
  /** The loaded plugin instance (if successful) */
  plugin?: Plugin;
  /** Error message (if unsuccessful) */
  error?: string;
}

/**
 * Check if an npm package exists and can potentially be a Jekyll.js plugin
 * @param packageName Name of the npm package
 * @param siteSource Source directory of the Jekyll site (used to find node_modules)
 * @returns Path to the package directory, or null if not found
 */
export function findNpmPackage(packageName: string, siteSource: string): string | null {
  // Validate package name to prevent path traversal attacks
  // npm package names must match: ^(?:@[a-z0-9-~][a-z0-9-._~]*/)?[a-z0-9-~][a-z0-9-._~]*$
  if (!isValidNpmPackageName(packageName)) {
    logger.warn(`Invalid npm package name: ${packageName}`);
    return null;
  }

  // Try multiple locations for node_modules
  const searchPaths = [
    // Site's local node_modules
    join(siteSource, 'node_modules', packageName),
    // Current working directory's node_modules
    join(process.cwd(), 'node_modules', packageName),
  ];

  for (const searchPath of searchPaths) {
    if (existsSync(searchPath)) {
      return searchPath;
    }
  }

  // Try Node's module resolution as a fallback
  try {
    const resolvedPath = require.resolve(packageName, {
      paths: [siteSource, process.cwd()],
    });
    // Get the package directory from the resolved file path
    return getPackageRoot(resolvedPath, packageName);
  } catch {
    // Package not found
    return null;
  }
}

/**
 * Get the package root directory from a resolved module path
 * @param resolvedPath Path to the resolved module entry point
 * @param packageName Name of the package
 * @returns Package root directory
 */
function getPackageRoot(resolvedPath: string, packageName: string): string {
  // Walk up the directory tree to find the package.json
  let dir = dirname(resolvedPath);
  while (dir !== dirname(dir)) {
    const pkgJsonPath = join(dir, 'package.json');
    if (existsSync(pkgJsonPath)) {
      try {
        const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
        if (pkgJson.name === packageName) {
          return dir;
        }
      } catch {
        // Continue searching
      }
    }
    dir = dirname(dir);
  }

  // Fallback: return the parent directory
  return dirname(resolvedPath);
}

/**
 * Validate an npm package name
 * @param name Package name to validate
 * @returns Whether the name is a valid npm package name
 */
export function isValidNpmPackageName(name: string): boolean {
  if (!name || typeof name !== 'string') {
    return false;
  }

  // npm package names:
  // - Must not be empty
  // - Must be lowercase
  // - Can be scoped (@scope/name)
  // - Can contain letters, numbers, hyphens, underscores, dots, and tildes
  // - Must not start with a dot or underscore (except scoped packages)
  // - Must not contain path separators or special characters

  // Check for path traversal attempts and absolute paths
  if (name.includes('..') || name.includes('/..') || name.includes('../')) {
    return false;
  }

  // Check for absolute paths and backslashes (Windows-style path separators)
  if (name.startsWith('/') || name.includes('\\')) {
    return false;
  }

  // Allow scoped packages
  if (name.startsWith('@')) {
    const parts = name.split('/');
    if (parts.length !== 2) {
      return false;
    }
    const [scope, pkgName] = parts;
    // Validate scope (without @)
    if (!scope || scope.length < 2) {
      return false;
    }
    const scopeWithoutAt = scope.substring(1);
    // Both scope and package name must be valid
    return isValidUnscopedPackageName(scopeWithoutAt) && isValidUnscopedPackageName(pkgName || '');
  }

  return isValidUnscopedPackageName(name);
}

/**
 * Validate an unscoped npm package name
 * @param name Package name to validate
 * @returns Whether the name is valid
 */
function isValidUnscopedPackageName(name: string): boolean {
  if (!name || name.length === 0 || name.length > 214) {
    return false;
  }

  // Must not start with . or _
  if (name.startsWith('.') || name.startsWith('_')) {
    return false;
  }

  // Must be lowercase and contain only valid characters
  // Valid: a-z, 0-9, -, _, ., ~
  const validPattern = /^[a-z0-9][-a-z0-9._~]*$/;
  return validPattern.test(name);
}

/**
 * Load an npm plugin by its package name
 * @param packageName Name of the npm package
 * @param siteSource Source directory of the Jekyll site
 * @returns Load result with plugin instance or error
 */
export function loadNpmPlugin(packageName: string, siteSource: string): NpmPluginLoadResult {
  // Check if the package exists
  const packagePath = findNpmPackage(packageName, siteSource);
  if (!packagePath) {
    return {
      success: false,
      error: `npm package '${packageName}' not found. Make sure it is installed.`,
    };
  }

  try {
    // Read package.json to find the main entry point
    const pkgJsonPath = join(packagePath, 'package.json');
    let mainEntry = 'index.js'; // Default entry point
    try {
      const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
      mainEntry = pkgJson.main || 'index.js';
    } catch {
      // If we can't read package.json, try the default entry point
    }

    // Resolve the module path from the package directory
    const modulePath = join(packagePath, mainEntry);

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pluginModule = require(modulePath);

    // Try different export patterns:
    // 1. Default export is a Plugin instance
    // 2. Default export is a Plugin class
    // 3. Named export 'plugin' is a Plugin instance
    // 4. Named export 'Plugin' is a Plugin class
    // 5. Module itself is a Plugin instance

    const plugin = extractPlugin(pluginModule, packageName);
    if (!plugin) {
      return {
        success: false,
        error:
          `npm package '${packageName}' does not export a valid Jekyll.js plugin. ` +
          'The module should export a Plugin class or instance with name and register properties.',
      };
    }

    return {
      success: true,
      plugin,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Failed to load npm plugin '${packageName}': ${errorMessage}`,
    };
  }
}

/**
 * Extract a Plugin from a loaded module, trying various export patterns
 * @param module The loaded module
 * @param packageName Name of the package (for logging)
 * @returns Plugin instance or null
 */
function extractPlugin(module: unknown, packageName: string): Plugin | null {
  // Handle null/undefined
  if (!module) {
    return null;
  }

  const mod = module as Record<string, unknown>;

  // Try default export first
  if (mod.default) {
    const defaultExport = mod.default;
    const plugin = tryCreatePlugin(defaultExport, packageName);
    if (plugin) {
      return plugin;
    }
  }

  // Try named export 'plugin'
  if (mod.plugin) {
    const plugin = tryCreatePlugin(mod.plugin, packageName);
    if (plugin) {
      return plugin;
    }
  }

  // Try named export 'Plugin' (as a class)
  if (mod.Plugin) {
    const plugin = tryCreatePlugin(mod.Plugin, packageName);
    if (plugin) {
      return plugin;
    }
  }

  // Try the module itself (CommonJS style where module.exports = plugin)
  const plugin = tryCreatePlugin(module, packageName);
  if (plugin) {
    return plugin;
  }

  return null;
}

/**
 * Try to create a Plugin instance from an export
 * @param exportValue The exported value
 * @param packageName Name of the package (for fallback name)
 * @returns Plugin instance or null
 */
function tryCreatePlugin(exportValue: unknown, packageName: string): Plugin | null {
  if (!exportValue) {
    return null;
  }

  // Check if it's already a Plugin instance (has name and register)
  if (isPluginInstance(exportValue)) {
    return exportValue;
  }

  // Check if it's a Plugin class (constructor function)
  if (typeof exportValue === 'function') {
    try {
      // Try to instantiate it as a class
      const instance = new (exportValue as new () => Plugin)();
      if (isPluginInstance(instance)) {
        return instance;
      }
    } catch {
      // Not a valid constructor or doesn't produce a Plugin
    }
  }

  // Check for object with name and register that might need to be adapted
  if (typeof exportValue === 'object' && exportValue !== null) {
    const obj = exportValue as Record<string, unknown>;
    if (typeof obj.register === 'function') {
      // Has register method but might not have name - use package name as fallback
      return {
        name: typeof obj.name === 'string' ? obj.name : packageName,
        register: obj.register as Plugin['register'],
      };
    }
  }

  return null;
}

/**
 * Check if a value is a valid Plugin instance
 * @param value Value to check
 * @returns Whether it's a valid Plugin
 */
function isPluginInstance(value: unknown): value is Plugin {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const obj = value as Record<string, unknown>;
  return typeof obj.name === 'string' && typeof obj.register === 'function';
}

/**
 * Load all npm plugins specified in the configuration
 * @param pluginNames Array of plugin names from config
 * @param siteSource Source directory of the Jekyll site
 * @param builtInNames Set of built-in plugin names to skip
 * @returns Array of loaded plugins
 */
export function loadNpmPlugins(
  pluginNames: string[],
  siteSource: string,
  builtInNames: Set<string>
): Plugin[] {
  const loadedPlugins: Plugin[] = [];

  for (const pluginName of pluginNames) {
    // Skip built-in plugins - they're handled separately
    if (builtInNames.has(pluginName)) {
      continue;
    }

    const result = loadNpmPlugin(pluginName, siteSource);
    if (result.success && result.plugin) {
      loadedPlugins.push(result.plugin);
      logger.debug(`Loaded npm plugin: ${pluginName}`);
    } else if (result.error) {
      // Log as debug since this might just be a plugin that doesn't exist
      // The config validation will warn about unsupported plugins
      logger.debug(result.error);
    }
  }

  return loadedPlugins;
}
