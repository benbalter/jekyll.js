/**
 * Plugin system for Jekyll.js
 * 
 * This module exports all built-in plugins and provides a registration mechanism
 */

export { SeoTagPlugin } from './seo-tag';
export { SitemapPlugin } from './sitemap';
export { FeedPlugin } from './feed';

import { Renderer } from '../core/Renderer';
import { Site } from '../core/Site';
import { SeoTagPlugin } from './seo-tag';
import { SitemapPlugin } from './sitemap';
import { FeedPlugin } from './feed';

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
  ];
}

/**
 * Register plugins based on site configuration
 * @param renderer Renderer instance
 * @param site Site instance
 */
export function registerPlugins(renderer: Renderer, site: Site): void {
  const configuredPlugins = site.config.plugins || [];
  const allPlugins = getBuiltInPlugins();
  
  for (const plugin of allPlugins) {
    // Only register if the plugin is listed in config or if no plugins are configured
    if (configuredPlugins.length === 0 || configuredPlugins.includes(plugin.name)) {
      plugin.register(renderer, site);
    }
  }
}
