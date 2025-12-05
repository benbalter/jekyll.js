/**
 * Plugin system for Jekyll.js
 *
 * This module exports all built-in plugins and provides a registration mechanism.
 * It also supports loading plugins from npm packages, similar to Jekyll.rb's plugin ecosystem.
 *
 * npm plugins can be installed via npm and configured in _config.yml:
 *   plugins:
 *     - jekyll-seo-tag
 *     - my-custom-npm-plugin
 *
 * Plugin Types:
 * - Plugin: Basic plugin that registers Liquid tags/filters
 * - GeneratorPlugin: Creates additional content during site generation
 * - ConverterPlugin: Transforms content from one format to another
 *
 * Hooks System:
 * - Hooks.register(owner, event, callback) - Register lifecycle hooks
 * - PluginHooks class - Convenience wrapper for plugin hook registration
 */

// Re-export all plugin types from the central types module
// This is the public-facing Plugin API that both built-in and third-party plugins should use
export {
  Plugin,
  GeneratorPlugin,
  GeneratedFile,
  GeneratedDocument,
  GeneratorResult,
  ConverterPlugin,
  AnyPlugin,
  isBasicPlugin,
  isGeneratorPlugin,
  isConverterPlugin,
  GeneratorPriority,
  ConverterPriority,
} from './types';

export { SeoTagPlugin } from './seo-tag';
export { SitemapPlugin } from './sitemap';
export { FeedPlugin } from './feed';
export { JemojiPlugin, emojify, getEmoji, hasEmoji, findEmoji } from './jemoji';
export { RedirectFromPlugin, RedirectInfo } from './redirect-from';
export { AvatarPlugin, generateAvatarTag, getAvatarUrl } from './avatar';
export { GitHubMetadataPlugin, GitHubMetadata, GitHubRepository } from './github-metadata';
export { MentionsPlugin, mentionify } from './mentions';
export {
  OgImagePlugin,
  OgImageConfig,
  CanvasConfig,
  HeaderConfig,
  ContentConfig,
  BorderConfig,
} from './og-image';

// Export npm plugin loader functionality
export {
  loadNpmPlugin,
  loadNpmPlugins,
  findNpmPackage,
  isValidNpmPackageName,
  NpmPluginLoadResult,
} from './npm-plugin-loader';

// Export hooks system
export {
  Hooks,
  PluginHooks,
  HookOwner,
  HookEvent,
  HookIdentifier,
  HookCallback,
  HookContext,
  SiteHookContext,
  DocumentHookContext,
  VALID_HOOKS,
} from './hooks';

// Export modern functionality modules - these are exported separately to avoid
// importing ESM-only dependencies (like shiki) at the top level
// Users should import these directly when needed:
// import { highlightCode } from 'jekyll-ts/plugins/syntax-highlighting';
// import { optimizeImage } from 'jekyll-ts/plugins/image-optimization';
// import { minifyHtml } from 'jekyll-ts/plugins/html-minifier';
// import { injectResourceHints } from 'jekyll-ts/plugins/resource-hints';

// Re-export modern feature modules
export * from './html-minifier';
export * from './resource-hints';

import { Renderer } from '../core/Renderer';
import { Site } from '../core/Site';
import { SeoTagPlugin } from './seo-tag';
import { SitemapPlugin } from './sitemap';
import { FeedPlugin } from './feed';
import { JemojiPlugin } from './jemoji';
import { RedirectFromPlugin } from './redirect-from';
import { AvatarPlugin } from './avatar';
import { GitHubMetadataPlugin } from './github-metadata';
import { MentionsPlugin } from './mentions';
import { OgImagePlugin } from './og-image';
import { loadNpmPlugins } from './npm-plugin-loader';
import { logger } from '../utils/logger';
import {
  Plugin,
  GeneratorPlugin,
  ConverterPlugin,
  AnyPlugin,
  isBasicPlugin,
  isGeneratorPlugin,
  isConverterPlugin,
} from './types';
import { Hooks } from './hooks';

/**
 * Plugin registry - manages all registered plugins by type
 */
class PluginRegistryClass {
  /** Basic plugins (register Liquid tags/filters) */
  private basicPlugins: Plugin[] = [];
  /** Generator plugins (create additional content) */
  private generatorPlugins: GeneratorPlugin[] = [];
  /** Converter plugins (transform content formats) */
  private converterPlugins: ConverterPlugin[] = [];

  /**
   * Register a plugin
   * Automatically determines the plugin type and adds to appropriate registry
   */
  register(plugin: AnyPlugin): void {
    if (isGeneratorPlugin(plugin)) {
      this.generatorPlugins.push(plugin);
      // Sort by priority (lower numbers first)
      this.generatorPlugins.sort((a, b) => (a.priority || 50) - (b.priority || 50));
      logger.debug(`Registered generator plugin: ${plugin.name}`);
    }
    if (isConverterPlugin(plugin)) {
      this.converterPlugins.push(plugin);
      // Sort by priority (lower numbers first)
      this.converterPlugins.sort((a, b) => (a.priority || 50) - (b.priority || 50));
      logger.debug(`Registered converter plugin: ${plugin.name}`);
    }
    if (isBasicPlugin(plugin)) {
      this.basicPlugins.push(plugin);
      logger.debug(`Registered basic plugin: ${plugin.name}`);
    }
  }

  /**
   * Get all registered generator plugins
   */
  getGenerators(): GeneratorPlugin[] {
    return [...this.generatorPlugins];
  }

  /**
   * Get all registered converter plugins
   */
  getConverters(): ConverterPlugin[] {
    return [...this.converterPlugins];
  }

  /**
   * Get all registered basic plugins
   */
  getBasicPlugins(): Plugin[] {
    return [...this.basicPlugins];
  }

  /**
   * Find a converter for a given file extension
   * @param ext File extension including dot (e.g., '.md')
   * @returns The first matching converter or undefined
   */
  findConverter(ext: string): ConverterPlugin | undefined {
    return this.converterPlugins.find((c) => c.matches(ext));
  }

  /**
   * Clear all registered plugins
   * Useful for testing
   */
  clear(): void {
    this.basicPlugins = [];
    this.generatorPlugins = [];
    this.converterPlugins = [];
  }

  /**
   * Get plugin counts by type
   */
  getCounts(): { basic: number; generators: number; converters: number } {
    return {
      basic: this.basicPlugins.length,
      generators: this.generatorPlugins.length,
      converters: this.converterPlugins.length,
    };
  }
}

/**
 * Global plugin registry singleton
 */
export const PluginRegistry = new PluginRegistryClass();

/**
 * Get all available built-in plugins
 */
export function getBuiltInPlugins(): Plugin[] {
  return [
    new SeoTagPlugin(),
    new SitemapPlugin(),
    new FeedPlugin(),
    new JemojiPlugin(),
    new RedirectFromPlugin(),
    new AvatarPlugin(),
    new GitHubMetadataPlugin(),
    new MentionsPlugin(),
    new OgImagePlugin(),
  ];
}

/**
 * Get the names of all built-in plugins
 */
export function getBuiltInPluginNames(): Set<string> {
  return new Set(getBuiltInPlugins().map((p) => p.name));
}

/**
 * Register plugins based on site configuration
 * Plugins are only registered if explicitly listed in the `plugins` config array.
 * If no plugins are configured, no plugins will be registered.
 *
 * This function supports both:
 * 1. Built-in plugins (e.g., 'jekyll-seo-tag', 'jekyll-sitemap')
 * 2. npm-based plugins installed via npm packages
 *
 * Plugin types:
 * - Basic plugins: Register Liquid tags/filters
 * - Generator plugins: Create additional content during build
 * - Converter plugins: Transform content formats
 *
 * @param renderer Renderer instance
 * @param site Site instance
 */
export function registerPlugins(renderer: Renderer, site: Site): void {
  const configuredPlugins = site.config.plugins || [];
  const builtInPlugins = getBuiltInPlugins();
  const builtInNames = getBuiltInPluginNames();

  // Trigger site:after_init hook
  Hooks.trigger('site', 'after_init', { site, renderer });

  // Register built-in plugins that are explicitly listed in config
  for (const plugin of builtInPlugins) {
    if (configuredPlugins.includes(plugin.name)) {
      try {
        plugin.register(renderer, site);
        PluginRegistry.register(plugin);
        logger.debug(`Registered built-in plugin: ${plugin.name}`);
      } catch (error) {
        logger.warn(
          `Failed to register built-in plugin '${plugin.name}': ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }

  // Load and register npm plugins
  const npmPlugins = loadNpmPlugins(configuredPlugins, site.source, builtInNames);
  for (const plugin of npmPlugins) {
    try {
      // Check what type of plugin this is
      if (isBasicPlugin(plugin)) {
        plugin.register(renderer, site);
      }
      // Register in the plugin registry (handles all types)
      PluginRegistry.register(plugin as AnyPlugin);
      logger.debug(`Registered npm plugin: ${plugin.name}`);
    } catch (error) {
      logger.warn(
        `Failed to register npm plugin '${plugin.name}': ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
