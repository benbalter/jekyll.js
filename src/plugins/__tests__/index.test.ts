import { registerPlugins, getBuiltInPlugins } from '../index';
import { Site } from '../../core/Site';
import { Renderer } from '../../core/Renderer';
import { mkdirSync, rmSync } from 'fs';
import { join } from 'path';

describe('Plugin Registration', () => {
  const testSiteDir = join(__dirname, '../../../../../tmp/test-plugin-registration');

  beforeEach(() => {
    // Clean up and create fresh test site directory
    rmSync(testSiteDir, { recursive: true, force: true });
    mkdirSync(testSiteDir, { recursive: true });
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
  });
});
