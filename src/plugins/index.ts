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
 */

export { SeoTagPlugin } from './seo-tag';
export { SitemapPlugin } from './sitemap';
export { FeedPlugin } from './feed';
export { JemojiPlugin, emojify, getEmoji, hasEmoji, findEmoji } from './jemoji';
export { RedirectFromPlugin, RedirectInfo } from './redirect-from';
export { AvatarPlugin, generateAvatarTag, getAvatarUrl } from './avatar';
export { GitHubMetadataPlugin, GitHubMetadata, GitHubRepository } from './github-metadata';
export { MentionsPlugin, mentionify } from './mentions';

// Export npm plugin loader functionality
export {
  loadNpmPlugin,
  loadNpmPlugins,
  findNpmPackage,
  isValidNpmPackageName,
  NpmPluginLoadResult,
} from './npm-plugin-loader';

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
import { loadNpmPlugins } from './npm-plugin-loader';
import { logger } from '../utils/logger';

/**
 * Plugin interface that all plugins must implement
 */
export interface Plugin {
  /** Plugin name (e.g., 'jekyll-seo-tag') */
  name: string;

  /** Register the plugin with the renderer */
  register(renderer: Renderer, site: Site): void;
}

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
 * @param renderer Renderer instance
 * @param site Site instance
 */
export function registerPlugins(renderer: Renderer, site: Site): void {
  const configuredPlugins = site.config.plugins || [];
  const builtInPlugins = getBuiltInPlugins();
  const builtInNames = getBuiltInPluginNames();

  // Register built-in plugins that are explicitly listed in config
  for (const plugin of builtInPlugins) {
    if (configuredPlugins.includes(plugin.name)) {
      try {
        plugin.register(renderer, site);
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
      plugin.register(renderer, site);
      logger.debug(`Registered npm plugin: ${plugin.name}`);
    } catch (error) {
      logger.warn(
        `Failed to register npm plugin '${plugin.name}': ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
