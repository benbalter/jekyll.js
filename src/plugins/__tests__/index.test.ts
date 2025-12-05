import { registerPlugins, getBuiltInPlugins, getBuiltInPluginNames } from '../index';
import { Site } from '../../core/Site';
import { Renderer } from '../../core/Renderer';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { logger } from '../../utils/logger';

// Mock the logger
jest.mock('../../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Plugin Registration', () => {
  const testSiteDir = join(__dirname, '../../../../../tmp/test-plugin-registration');

  beforeEach(() => {
    // Clean up and create fresh test site directory
    rmSync(testSiteDir, { recursive: true, force: true });
    mkdirSync(testSiteDir, { recursive: true });
    // Clear mock calls
    jest.clearAllMocks();
  });

  afterEach(() => {
    rmSync(testSiteDir, { recursive: true, force: true });
  });

  describe('getBuiltInPlugins', () => {
    it('should return all built-in plugins', () => {
      const plugins = getBuiltInPlugins();
      expect(plugins.length).toBeGreaterThan(0);

      const pluginNames = plugins.map((p) => p.name);
      expect(pluginNames).toContain('jekyll-seo-tag');
      expect(pluginNames).toContain('jekyll-sitemap');
      expect(pluginNames).toContain('jekyll-feed');
    });
  });

  describe('getBuiltInPluginNames', () => {
    it('should return a Set of built-in plugin names', () => {
      const names = getBuiltInPluginNames();
      expect(names).toBeInstanceOf(Set);
      expect(names.has('jekyll-seo-tag')).toBe(true);
      expect(names.has('jekyll-sitemap')).toBe(true);
      expect(names.has('jekyll-feed')).toBe(true);
    });
  });

  describe('registerPlugins', () => {
    it('should not register any plugins when plugins config is empty', async () => {
      // Create site with no plugins configured
      const config = {
        title: 'Test Site',
        plugins: [],
      };

      const site = new Site(testSiteDir, config);
      const renderer = new Renderer(site);

      // Register plugins (should be none)
      registerPlugins(renderer, site);

      // Test that seo tag is NOT available
      const template = '{% seo %}';
      await expect(renderer.render(template, {})).rejects.toThrow();
    });

    it('should not register any plugins when plugins config is undefined', async () => {
      // Create site with no plugins configured
      const config = {
        title: 'Test Site',
        // plugins is not defined
      };

      const site = new Site(testSiteDir, config);
      const renderer = new Renderer(site);

      // Register plugins (should be none)
      registerPlugins(renderer, site);

      // Test that seo tag is NOT available
      const template = '{% seo %}';
      await expect(renderer.render(template, {})).rejects.toThrow();
    });

    it('should only register plugins that are explicitly listed', async () => {
      // Create site with only jekyll-seo-tag enabled
      const config = {
        title: 'Test Site',
        plugins: ['jekyll-seo-tag'],
      };

      const site = new Site(testSiteDir, config);
      const renderer = new Renderer(site);

      // Register plugins
      registerPlugins(renderer, site);

      // Test that seo tag IS available
      const template = '{% seo %}';
      const result = await renderer.render(template, {
        page: { title: 'Test', url: '/' },
      });
      expect(result).toContain('<title>');
    });

    it('should register multiple plugins when configured', async () => {
      // Create site with multiple plugins enabled
      const config = {
        title: 'Test Site',
        url: 'https://example.com',
        plugins: ['jekyll-seo-tag', 'jekyll-sitemap'],
      };

      const site = new Site(testSiteDir, config);
      const renderer = new Renderer(site);

      // Register plugins
      registerPlugins(renderer, site);

      // Test that seo tag IS available
      const seoTemplate = '{% seo %}';
      const seoResult = await renderer.render(seoTemplate, {
        page: { title: 'Test', url: '/' },
      });
      expect(seoResult).toContain('<title>');
    });

    it('should ignore unsupported plugin names gracefully', async () => {
      // Create site with unsupported plugins configured
      const config = {
        title: 'Test Site',
        plugins: ['jekyll-seo-tag', 'some-unsupported-plugin'],
      };

      const site = new Site(testSiteDir, config);
      const renderer = new Renderer(site);

      // Should not throw, just skip the unsupported plugin
      registerPlugins(renderer, site);

      // Verify that the supported plugin still works
      const template = '{% seo %}';
      const result = await renderer.render(template, {
        page: { title: 'Test', url: '/' },
      });
      expect(result).toContain('<title>');
    });

    it('should warn about missing plugins that are configured but not found', async () => {
      // Create site with non-existent plugins configured
      const config = {
        title: 'Test Site',
        plugins: ['jekyll-seo-tag', 'non-existent-plugin', 'another-missing-plugin'],
      };

      const site = new Site(testSiteDir, config);
      const renderer = new Renderer(site);

      // Register plugins
      registerPlugins(renderer, site);

      // Verify warnings were logged for missing plugins
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Plugin 'non-existent-plugin' is configured but was not found")
      );
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Plugin 'another-missing-plugin' is configured but was not found")
      );
    });

    it('should not warn about built-in plugins that are found', async () => {
      // Create site with valid built-in plugins configured
      const config = {
        title: 'Test Site',
        plugins: ['jekyll-seo-tag', 'jekyll-sitemap'],
      };

      const site = new Site(testSiteDir, config);
      const renderer = new Renderer(site);

      // Register plugins
      registerPlugins(renderer, site);

      // Verify no warning was logged about missing plugins
      expect(logger.warn).not.toHaveBeenCalledWith(
        expect.stringContaining('is configured but was not found')
      );
    });

    it('should load and register npm plugins from node_modules', async () => {
      // Create a mock npm plugin in the site's node_modules
      const nodeModulesDir = join(testSiteDir, 'node_modules', 'test-npm-plugin');
      mkdirSync(nodeModulesDir, { recursive: true });

      // Create package.json
      writeFileSync(
        join(nodeModulesDir, 'package.json'),
        JSON.stringify({
          name: 'test-npm-plugin',
          main: 'index.js',
        })
      );

      // Create a plugin that registers a custom Liquid tag
      writeFileSync(
        join(nodeModulesDir, 'index.js'),
        `
        module.exports = {
          name: 'test-npm-plugin',
          register: function(renderer, site) {
            renderer.getLiquid().registerTag('test_tag', {
              parse: function() {},
              render: function() { return 'npm-plugin-output'; }
            });
          }
        };
        `
      );

      // Create site with the npm plugin configured
      const config = {
        title: 'Test Site',
        plugins: ['test-npm-plugin'],
      };

      const site = new Site(testSiteDir, config);
      const renderer = new Renderer(site);

      // Register plugins
      registerPlugins(renderer, site);

      // Test that the npm plugin's tag IS available
      const template = '{% test_tag %}';
      const result = await renderer.render(template, {});
      expect(result).toBe('npm-plugin-output');
    });

    it('should register both built-in and npm plugins together', async () => {
      // Create a mock npm plugin
      const nodeModulesDir = join(testSiteDir, 'node_modules', 'custom-filter-plugin');
      mkdirSync(nodeModulesDir, { recursive: true });

      writeFileSync(
        join(nodeModulesDir, 'package.json'),
        JSON.stringify({
          name: 'custom-filter-plugin',
          main: 'index.js',
        })
      );

      writeFileSync(
        join(nodeModulesDir, 'index.js'),
        `
        module.exports = {
          name: 'custom-filter-plugin',
          register: function(renderer, site) {
            renderer.registerFilter('custom_reverse', function(input) {
              return String(input).split('').reverse().join('');
            });
          }
        };
        `
      );

      // Create site with both built-in and npm plugins
      const config = {
        title: 'Test Site',
        plugins: ['jekyll-seo-tag', 'custom-filter-plugin'],
      };

      const site = new Site(testSiteDir, config);
      const renderer = new Renderer(site);

      // Register plugins
      registerPlugins(renderer, site);

      // Test that built-in plugin works
      const seoTemplate = '{% seo %}';
      const seoResult = await renderer.render(seoTemplate, {
        page: { title: 'Test', url: '/' },
      });
      expect(seoResult).toContain('<title>');

      // Test that npm plugin filter works
      const filterTemplate = '{{ "hello" | custom_reverse }}';
      const filterResult = await renderer.render(filterTemplate, {});
      expect(filterResult).toBe('olleh');
    });
  });
});
