/**
 * Tests for plugin types module
 *
 * These tests verify that the abstracted plugin type system works correctly
 * and that built-in plugins implement the same interface as third-party plugins.
 */

import {
  Plugin,
  GeneratorPlugin,
  ConverterPlugin,
  AnyPlugin,
  isBasicPlugin,
  isGeneratorPlugin,
  isConverterPlugin,
  GeneratorPriority,
  ConverterPriority,
  GeneratedFile,
  GeneratedDocument,
  GeneratorResult,
} from '../types';
import { Site } from '../../core/Site';
import { Document } from '../../core/Document';
import { Renderer } from '../../core/Renderer';
import { getBuiltInPlugins } from '../index';
import { mkdirSync, rmSync } from 'fs';
import { join } from 'path';

describe('Plugin Types Module', () => {
  const testSiteDir = join(__dirname, '../../../../../tmp/test-plugin-types');

  beforeAll(() => {
    rmSync(testSiteDir, { recursive: true, force: true });
    mkdirSync(testSiteDir, { recursive: true });
  });

  afterAll(() => {
    rmSync(testSiteDir, { recursive: true, force: true });
  });

  describe('Plugin interface', () => {
    it('should define Plugin interface correctly', () => {
      const mockPlugin: Plugin = {
        name: 'test-plugin',
        register: (_renderer: Renderer, _site: Site) => {},
      };

      expect(mockPlugin.name).toBe('test-plugin');
      expect(typeof mockPlugin.register).toBe('function');
    });

    it('should allow built-in plugins to be used as Plugin type', () => {
      const builtInPlugins = getBuiltInPlugins();

      // All built-in plugins should implement the Plugin interface
      for (const plugin of builtInPlugins) {
        const p: Plugin = plugin;
        expect(p.name).toBeDefined();
        expect(typeof p.name).toBe('string');
        expect(typeof p.register).toBe('function');
      }
    });
  });

  describe('GeneratorPlugin interface', () => {
    it('should define GeneratorPlugin interface correctly', () => {
      const mockGenerator: GeneratorPlugin = {
        name: 'test-generator',
        priority: GeneratorPriority.NORMAL,
        generate: (_site: Site, _renderer: Renderer) => ({
          files: [{ path: 'test.xml', content: '<test/>' }],
        }),
      };

      expect(mockGenerator.name).toBe('test-generator');
      expect(mockGenerator.priority).toBe(50);
      expect(typeof mockGenerator.generate).toBe('function');
    });

    it('should support GeneratorResult with files', () => {
      const result: GeneratorResult = {
        files: [
          { path: 'sitemap.xml', content: '<?xml version="1.0"?>' },
          { path: 'feed.xml', content: '<?xml version="1.0"?>' },
        ],
      };

      expect(result.files).toHaveLength(2);
      expect(result.files?.[0]?.path).toBe('sitemap.xml');
    });

    it('should support GeneratorResult with documents', () => {
      const mockDoc = {} as Document;
      const result: GeneratorResult = {
        documents: [{ document: mockDoc, collection: 'posts', isPage: false }],
      };

      expect(result.documents).toHaveLength(1);
      expect(result.documents?.[0]?.collection).toBe('posts');
    });
  });

  describe('ConverterPlugin interface', () => {
    it('should define ConverterPlugin interface correctly', () => {
      const mockConverter: ConverterPlugin = {
        name: 'test-converter',
        priority: ConverterPriority.NORMAL,
        matches: (ext: string) => ext === '.test',
        outputExt: (_ext: string) => '.html',
        convert: (content: string, _document: Document, _site: Site) =>
          `<converted>${content}</converted>`,
      };

      expect(mockConverter.name).toBe('test-converter');
      expect(mockConverter.matches('.test')).toBe(true);
      expect(mockConverter.matches('.other')).toBe(false);
      expect(mockConverter.outputExt('.test')).toBe('.html');
    });
  });

  describe('Type guard functions', () => {
    describe('isBasicPlugin', () => {
      it('should return true for valid Plugin', () => {
        const plugin: Plugin = {
          name: 'test',
          register: () => {},
        };
        expect(isBasicPlugin(plugin)).toBe(true);
      });

      it('should return true for built-in plugins', () => {
        const builtInPlugins = getBuiltInPlugins();
        for (const plugin of builtInPlugins) {
          expect(isBasicPlugin(plugin)).toBe(true);
        }
      });

      it('should return false for null', () => {
        expect(isBasicPlugin(null)).toBe(false);
      });

      it('should return false for plugin without name', () => {
        expect(isBasicPlugin({ register: () => {} })).toBe(false);
      });

      it('should return false for plugin without register method', () => {
        expect(isBasicPlugin({ name: 'test' })).toBe(false);
      });
    });

    describe('isGeneratorPlugin', () => {
      it('should return true for valid GeneratorPlugin', () => {
        const generator: GeneratorPlugin = {
          name: 'test',
          generate: () => ({ files: [] }),
        };
        expect(isGeneratorPlugin(generator)).toBe(true);
      });

      it('should return false for basic Plugin', () => {
        const plugin: Plugin = {
          name: 'test',
          register: () => {},
        };
        expect(isGeneratorPlugin(plugin)).toBe(false);
      });
    });

    describe('isConverterPlugin', () => {
      it('should return true for valid ConverterPlugin', () => {
        const converter: ConverterPlugin = {
          name: 'test',
          matches: () => true,
          outputExt: () => '.html',
          convert: (content) => content,
        };
        expect(isConverterPlugin(converter)).toBe(true);
      });

      it('should return false for basic Plugin', () => {
        const plugin: Plugin = {
          name: 'test',
          register: () => {},
        };
        expect(isConverterPlugin(plugin)).toBe(false);
      });
    });
  });

  describe('Priority constants', () => {
    describe('GeneratorPriority', () => {
      it('should have correct values', () => {
        expect(GeneratorPriority.HIGH).toBe(10);
        expect(GeneratorPriority.NORMAL).toBe(50);
        expect(GeneratorPriority.LOW).toBe(90);
        expect(GeneratorPriority.LOWEST).toBe(100);
      });

      it('should have values in ascending order', () => {
        expect(GeneratorPriority.HIGH).toBeLessThan(GeneratorPriority.NORMAL);
        expect(GeneratorPriority.NORMAL).toBeLessThan(GeneratorPriority.LOW);
        expect(GeneratorPriority.LOW).toBeLessThan(GeneratorPriority.LOWEST);
      });
    });

    describe('ConverterPriority', () => {
      it('should have correct values', () => {
        expect(ConverterPriority.HIGH).toBe(10);
        expect(ConverterPriority.NORMAL).toBe(50);
        expect(ConverterPriority.LOW).toBe(90);
      });

      it('should have values in ascending order', () => {
        expect(ConverterPriority.HIGH).toBeLessThan(ConverterPriority.NORMAL);
        expect(ConverterPriority.NORMAL).toBeLessThan(ConverterPriority.LOW);
      });
    });
  });

  describe('AnyPlugin union type', () => {
    it('should accept Plugin', () => {
      const plugin: AnyPlugin = {
        name: 'test',
        register: () => {},
      };
      expect(plugin.name).toBe('test');
    });

    it('should accept GeneratorPlugin', () => {
      const generator: AnyPlugin = {
        name: 'test-gen',
        generate: () => {},
      };
      expect(generator.name).toBe('test-gen');
    });

    it('should accept ConverterPlugin', () => {
      const converter: AnyPlugin = {
        name: 'test-conv',
        matches: () => true,
        outputExt: () => '.html',
        convert: (c) => c,
      };
      expect(converter.name).toBe('test-conv');
    });
  });

  describe('Built-in plugins use same API as third-party plugins', () => {
    it('all built-in plugins should implement Plugin interface with name and register', () => {
      const builtInPlugins = getBuiltInPlugins();

      for (const plugin of builtInPlugins) {
        // Same checks that would be performed on third-party npm plugins
        expect(typeof plugin).toBe('object');
        expect(plugin).not.toBeNull();
        expect(typeof plugin.name).toBe('string');
        expect(plugin.name.length).toBeGreaterThan(0);
        expect(typeof plugin.register).toBe('function');

        // The isBasicPlugin type guard should work for all built-in plugins
        expect(isBasicPlugin(plugin)).toBe(true);
      }
    });

    it('built-in plugins should have consistent naming convention', () => {
      const builtInPlugins = getBuiltInPlugins();
      const expectedPluginNames = [
        'jekyll-seo-tag',
        'jekyll-sitemap',
        'jekyll-feed',
        'jemoji',
        'jekyll-redirect-from',
        'jekyll-avatar',
        'jekyll-github-metadata',
        'jekyll-mentions',
      ];

      const actualNames = builtInPlugins.map((p) => p.name);

      for (const expectedName of expectedPluginNames) {
        expect(actualNames).toContain(expectedName);
      }
    });
  });

  describe('GeneratedFile interface', () => {
    it('should have path and content properties', () => {
      const file: GeneratedFile = {
        path: 'output/test.html',
        content: '<html></html>',
      };

      expect(file.path).toBe('output/test.html');
      expect(file.content).toBe('<html></html>');
    });
  });

  describe('GeneratedDocument interface', () => {
    it('should have required document and optional properties', () => {
      const mockDoc = {} as Document;
      const genDoc: GeneratedDocument = {
        document: mockDoc,
        collection: 'posts',
        isPage: true,
      };

      expect(genDoc.document).toBe(mockDoc);
      expect(genDoc.collection).toBe('posts');
      expect(genDoc.isPage).toBe(true);
    });

    it('should allow optional properties to be omitted', () => {
      const mockDoc = {} as Document;
      const genDoc: GeneratedDocument = {
        document: mockDoc,
      };

      expect(genDoc.document).toBe(mockDoc);
      expect(genDoc.collection).toBeUndefined();
      expect(genDoc.isPage).toBeUndefined();
    });
  });
});
