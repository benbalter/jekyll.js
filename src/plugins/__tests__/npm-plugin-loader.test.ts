/**
 * Tests for npm-plugin-loader.ts
 */

import { join } from 'path';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import {
  isValidNpmPackageName,
  findNpmPackage,
  loadNpmPlugin,
  loadNpmPlugins,
} from '../npm-plugin-loader';

describe('npm-plugin-loader', () => {
  const testDir = join(__dirname, '../../../../tmp/test-npm-plugins');

  beforeAll(() => {
    // Create test directory
    rmSync(testDir, { recursive: true, force: true });
    mkdirSync(testDir, { recursive: true });
  });

  afterAll(() => {
    // Clean up
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('isValidNpmPackageName', () => {
    it('should accept valid unscoped package names', () => {
      expect(isValidNpmPackageName('my-plugin')).toBe(true);
      expect(isValidNpmPackageName('jekyll-custom-plugin')).toBe(true);
      expect(isValidNpmPackageName('plugin123')).toBe(true);
      expect(isValidNpmPackageName('my.plugin')).toBe(true);
      expect(isValidNpmPackageName('my_plugin')).toBe(true);
      expect(isValidNpmPackageName('my~plugin')).toBe(true);
    });

    it('should accept valid scoped package names', () => {
      expect(isValidNpmPackageName('@myorg/my-plugin')).toBe(true);
      expect(isValidNpmPackageName('@scope/jekyll-plugin')).toBe(true);
      expect(isValidNpmPackageName('@test123/plugin-name')).toBe(true);
    });

    it('should reject empty or invalid inputs', () => {
      expect(isValidNpmPackageName('')).toBe(false);
      expect(isValidNpmPackageName(null as unknown as string)).toBe(false);
      expect(isValidNpmPackageName(undefined as unknown as string)).toBe(false);
    });

    it('should reject names with path traversal', () => {
      expect(isValidNpmPackageName('../malicious')).toBe(false);
      expect(isValidNpmPackageName('package/../../../etc/passwd')).toBe(false);
      expect(isValidNpmPackageName('/absolute/path')).toBe(false);
    });

    it('should reject names starting with dot or underscore', () => {
      expect(isValidNpmPackageName('.hidden')).toBe(false);
      expect(isValidNpmPackageName('_private')).toBe(false);
    });

    it('should reject names with uppercase characters', () => {
      expect(isValidNpmPackageName('MyPlugin')).toBe(false);
      expect(isValidNpmPackageName('UPPERCASE')).toBe(false);
    });

    it('should reject invalid scoped names', () => {
      expect(isValidNpmPackageName('@/missing-scope')).toBe(false);
      expect(isValidNpmPackageName('@scope/')).toBe(false);
      expect(isValidNpmPackageName('@scope/Name/extra')).toBe(false);
      expect(isValidNpmPackageName('@')).toBe(false);
    });
  });

  describe('findNpmPackage', () => {
    it('should return null for non-existent packages', () => {
      expect(findNpmPackage('non-existent-package-xyz', testDir)).toBeNull();
    });

    it('should return null for invalid package names', () => {
      expect(findNpmPackage('../etc/passwd', testDir)).toBeNull();
      expect(findNpmPackage('InvalidName', testDir)).toBeNull();
    });

    it('should find packages in node_modules', () => {
      // Create a mock package
      const pkgDir = join(testDir, 'node_modules', 'test-plugin');
      mkdirSync(pkgDir, { recursive: true });
      writeFileSync(
        join(pkgDir, 'package.json'),
        JSON.stringify({
          name: 'test-plugin',
          main: 'index.js',
        })
      );
      writeFileSync(
        join(pkgDir, 'index.js'),
        'module.exports = { name: "test-plugin", register: function() {} };'
      );

      const result = findNpmPackage('test-plugin', testDir);
      expect(result).not.toBeNull();
      expect(result).toContain('test-plugin');
    });
  });

  describe('loadNpmPlugin', () => {
    const pluginsDir = join(testDir, 'node_modules');

    beforeAll(() => {
      mkdirSync(pluginsDir, { recursive: true });
    });

    it('should return error for non-existent packages', () => {
      const result = loadNpmPlugin('does-not-exist', testDir);
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should load a valid CommonJS plugin', () => {
      // Create a mock plugin
      const pluginDir = join(pluginsDir, 'valid-cjs-plugin');
      mkdirSync(pluginDir, { recursive: true });
      writeFileSync(
        join(pluginDir, 'package.json'),
        JSON.stringify({
          name: 'valid-cjs-plugin',
          main: 'index.js',
        })
      );
      writeFileSync(
        join(pluginDir, 'index.js'),
        `
        module.exports = {
          name: 'valid-cjs-plugin',
          register: function(renderer, site) {
            // Plugin registration logic
          }
        };
        `
      );

      const result = loadNpmPlugin('valid-cjs-plugin', testDir);
      expect(result.success).toBe(true);
      expect(result.plugin).toBeDefined();
      expect(result.plugin?.name).toBe('valid-cjs-plugin');
      expect(typeof result.plugin?.register).toBe('function');
    });

    it('should load a plugin that exports a class', () => {
      // Create a mock plugin with a class export
      const pluginDir = join(pluginsDir, 'class-plugin');
      mkdirSync(pluginDir, { recursive: true });
      writeFileSync(
        join(pluginDir, 'package.json'),
        JSON.stringify({
          name: 'class-plugin',
          main: 'index.js',
        })
      );
      writeFileSync(
        join(pluginDir, 'index.js'),
        `
        class MyPlugin {
          constructor() {
            this.name = 'class-plugin';
          }
          register(renderer, site) {}
        }
        module.exports = MyPlugin;
        `
      );

      const result = loadNpmPlugin('class-plugin', testDir);
      expect(result.success).toBe(true);
      expect(result.plugin).toBeDefined();
      expect(result.plugin?.name).toBe('class-plugin');
    });

    it('should handle default export pattern', () => {
      // Create a mock plugin with default export
      const pluginDir = join(pluginsDir, 'default-export-plugin');
      mkdirSync(pluginDir, { recursive: true });
      writeFileSync(
        join(pluginDir, 'package.json'),
        JSON.stringify({
          name: 'default-export-plugin',
          main: 'index.js',
        })
      );
      writeFileSync(
        join(pluginDir, 'index.js'),
        `
        module.exports.default = {
          name: 'default-export-plugin',
          register: function(renderer, site) {}
        };
        `
      );

      const result = loadNpmPlugin('default-export-plugin', testDir);
      expect(result.success).toBe(true);
      expect(result.plugin?.name).toBe('default-export-plugin');
    });

    it('should handle named Plugin export pattern', () => {
      // Create a mock plugin with named Plugin export
      const pluginDir = join(pluginsDir, 'named-plugin-export');
      mkdirSync(pluginDir, { recursive: true });
      writeFileSync(
        join(pluginDir, 'package.json'),
        JSON.stringify({
          name: 'named-plugin-export',
          main: 'index.js',
        })
      );
      writeFileSync(
        join(pluginDir, 'index.js'),
        `
        class MyPlugin {
          constructor() {
            this.name = 'named-plugin-export';
          }
          register() {}
        }
        module.exports.Plugin = MyPlugin;
        `
      );

      const result = loadNpmPlugin('named-plugin-export', testDir);
      expect(result.success).toBe(true);
      expect(result.plugin?.name).toBe('named-plugin-export');
    });

    it('should return error for invalid plugin structure', () => {
      // Create a mock plugin without proper structure
      const pluginDir = join(pluginsDir, 'invalid-plugin');
      mkdirSync(pluginDir, { recursive: true });
      writeFileSync(
        join(pluginDir, 'package.json'),
        JSON.stringify({
          name: 'invalid-plugin',
          main: 'index.js',
        })
      );
      writeFileSync(
        join(pluginDir, 'index.js'),
        `
        module.exports = {
          notAPlugin: true
        };
        `
      );

      const result = loadNpmPlugin('invalid-plugin', testDir);
      expect(result.success).toBe(false);
      expect(result.error).toContain('does not export a valid Jekyll.js plugin');
    });

    it('should use package name as fallback for plugin name', () => {
      // Create a mock plugin without a name property
      const pluginDir = join(pluginsDir, 'no-name-plugin');
      mkdirSync(pluginDir, { recursive: true });
      writeFileSync(
        join(pluginDir, 'package.json'),
        JSON.stringify({
          name: 'no-name-plugin',
          main: 'index.js',
        })
      );
      writeFileSync(
        join(pluginDir, 'index.js'),
        `
        module.exports = {
          register: function(renderer, site) {}
        };
        `
      );

      const result = loadNpmPlugin('no-name-plugin', testDir);
      expect(result.success).toBe(true);
      expect(result.plugin?.name).toBe('no-name-plugin');
    });
  });

  describe('loadNpmPlugins', () => {
    const pluginsDir = join(testDir, 'node_modules');

    beforeAll(() => {
      // Create a valid plugin
      const pluginDir = join(pluginsDir, 'loadable-plugin');
      mkdirSync(pluginDir, { recursive: true });
      writeFileSync(
        join(pluginDir, 'package.json'),
        JSON.stringify({
          name: 'loadable-plugin',
          main: 'index.js',
        })
      );
      writeFileSync(
        join(pluginDir, 'index.js'),
        `
        module.exports = {
          name: 'loadable-plugin',
          register: function() {}
        };
        `
      );
    });

    it('should skip built-in plugins', () => {
      const builtInNames = new Set(['jekyll-seo-tag', 'jekyll-sitemap']);
      const plugins = loadNpmPlugins(['jekyll-seo-tag', 'loadable-plugin'], testDir, builtInNames);

      // Should only load the non-built-in plugin
      expect(plugins.length).toBe(1);
      expect(plugins[0]?.name).toBe('loadable-plugin');
    });

    it('should return empty array for non-existent plugins', () => {
      const builtInNames = new Set(['jekyll-seo-tag']);
      const plugins = loadNpmPlugins(['non-existent-xyz'], testDir, builtInNames);

      expect(plugins.length).toBe(0);
    });

    it('should load multiple plugins', () => {
      // Create another plugin
      const plugin2Dir = join(pluginsDir, 'another-plugin');
      mkdirSync(plugin2Dir, { recursive: true });
      writeFileSync(
        join(plugin2Dir, 'package.json'),
        JSON.stringify({
          name: 'another-plugin',
          main: 'index.js',
        })
      );
      writeFileSync(
        join(plugin2Dir, 'index.js'),
        `
        module.exports = {
          name: 'another-plugin',
          register: function() {}
        };
        `
      );

      const builtInNames = new Set(['jekyll-seo-tag']);
      const plugins = loadNpmPlugins(['loadable-plugin', 'another-plugin'], testDir, builtInNames);

      expect(plugins.length).toBe(2);
      const pluginNames = plugins.map((p) => p.name);
      expect(pluginNames).toContain('loadable-plugin');
      expect(pluginNames).toContain('another-plugin');
    });
  });
});
