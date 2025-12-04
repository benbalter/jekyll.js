/**
 * Tests for Converter Plugin System
 */

import { ConverterPlugin, isConverterPlugin, ConverterPriority } from '../converter';
import { PluginRegistry } from '../index';
import { Site } from '../../core/Site';
import { Document, DocumentType } from '../../core/Document';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';

describe('Converter Plugin System', () => {
  const testSiteDir = join(__dirname, '../../../../../tmp/test-converters');

  beforeEach(() => {
    // Clean up and create fresh test site directory
    rmSync(testSiteDir, { recursive: true, force: true });
    mkdirSync(testSiteDir, { recursive: true });

    // Clear plugin registry before each test
    PluginRegistry.clear();
  });

  afterEach(() => {
    rmSync(testSiteDir, { recursive: true, force: true });
    PluginRegistry.clear();
  });

  describe('isConverterPlugin', () => {
    it('should return true for valid converter plugin', () => {
      const plugin: ConverterPlugin = {
        name: 'test-converter',
        matches: () => true,
        outputExt: () => '.html',
        convert: () => 'converted',
      };

      expect(isConverterPlugin(plugin)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isConverterPlugin(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isConverterPlugin(undefined)).toBe(false);
    });

    it('should return false for plugin without matches method', () => {
      const plugin = {
        name: 'incomplete-plugin',
        outputExt: () => '.html',
        convert: () => 'converted',
      };

      expect(isConverterPlugin(plugin)).toBe(false);
    });

    it('should return false for plugin without outputExt method', () => {
      const plugin = {
        name: 'incomplete-plugin',
        matches: () => true,
        convert: () => 'converted',
      };

      expect(isConverterPlugin(plugin)).toBe(false);
    });

    it('should return false for plugin without convert method', () => {
      const plugin = {
        name: 'incomplete-plugin',
        matches: () => true,
        outputExt: () => '.html',
      };

      expect(isConverterPlugin(plugin)).toBe(false);
    });

    it('should return false for plugin without name', () => {
      const plugin = {
        matches: () => true,
        outputExt: () => '.html',
        convert: () => 'converted',
      };

      expect(isConverterPlugin(plugin)).toBe(false);
    });
  });

  describe('ConverterPriority', () => {
    it('should have correct priority values', () => {
      expect(ConverterPriority.HIGH).toBe(10);
      expect(ConverterPriority.NORMAL).toBe(50);
      expect(ConverterPriority.LOW).toBe(90);
    });
  });

  describe('PluginRegistry converter methods', () => {
    it('should register a converter plugin', () => {
      const converter: ConverterPlugin = {
        name: 'test-converter',
        matches: () => true,
        outputExt: () => '.html',
        convert: () => 'converted',
      };

      PluginRegistry.register(converter);

      const converters = PluginRegistry.getConverters();
      expect(converters).toHaveLength(1);
      expect(converters[0]!.name).toBe('test-converter');
    });

    it('should sort converters by priority', () => {
      const lowPriority: ConverterPlugin = {
        name: 'low-priority',
        priority: ConverterPriority.LOW,
        matches: () => true,
        outputExt: () => '.html',
        convert: () => 'low',
      };

      const highPriority: ConverterPlugin = {
        name: 'high-priority',
        priority: ConverterPriority.HIGH,
        matches: () => true,
        outputExt: () => '.html',
        convert: () => 'high',
      };

      // Register in wrong order
      PluginRegistry.register(lowPriority);
      PluginRegistry.register(highPriority);

      const converters = PluginRegistry.getConverters();
      expect(converters[0]!.name).toBe('high-priority');
      expect(converters[1]!.name).toBe('low-priority');
    });

    it('should find converter by extension', () => {
      const markdownConverter: ConverterPlugin = {
        name: 'markdown-converter',
        matches: (ext) => ext === '.md' || ext === '.markdown',
        outputExt: () => '.html',
        convert: (content) => `<p>${content}</p>`,
      };

      const textileConverter: ConverterPlugin = {
        name: 'textile-converter',
        matches: (ext) => ext === '.textile',
        outputExt: () => '.html',
        convert: (content) => `<textile>${content}</textile>`,
      };

      PluginRegistry.register(markdownConverter);
      PluginRegistry.register(textileConverter);

      const mdConverter = PluginRegistry.findConverter('.md');
      expect(mdConverter?.name).toBe('markdown-converter');

      const textConverter = PluginRegistry.findConverter('.textile');
      expect(textConverter?.name).toBe('textile-converter');

      const unknownConverter = PluginRegistry.findConverter('.unknown');
      expect(unknownConverter).toBeUndefined();
    });
  });

  describe('Converter execution', () => {
    it('should convert content', async () => {
      const converter: ConverterPlugin = {
        name: 'uppercase-converter',
        matches: (ext) => ext === '.txt',
        outputExt: () => '.html',
        convert: (content) => content.toUpperCase(),
      };

      const site = new Site(testSiteDir);

      // Create a test file
      const testFile = join(testSiteDir, 'test.txt');
      writeFileSync(testFile, '---\ntitle: Test\n---\nhello world');

      const document = new Document(testFile, testSiteDir, DocumentType.PAGE);

      const result = await converter.convert('hello world', document, site);

      expect(result).toBe('HELLO WORLD');
    });

    it('should handle async converters', async () => {
      const asyncConverter: ConverterPlugin = {
        name: 'async-converter',
        matches: () => true,
        outputExt: () => '.html',
        convert: async (content) => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return `<converted>${content}</converted>`;
        },
      };

      const site = new Site(testSiteDir);

      const testFile = join(testSiteDir, 'test.md');
      writeFileSync(testFile, '---\ntitle: Test\n---\ncontent');

      const document = new Document(testFile, testSiteDir, DocumentType.PAGE);

      const result = await asyncConverter.convert('content', document, site);

      expect(result).toBe('<converted>content</converted>');
    });

    it('should provide document metadata to converter', async () => {
      let capturedDocument: Document | null = null;

      const metadataConverter: ConverterPlugin = {
        name: 'metadata-converter',
        matches: () => true,
        outputExt: () => '.html',
        convert: (content, document) => {
          capturedDocument = document;
          return `Title: ${document.title}\n${content}`;
        },
      };

      const site = new Site(testSiteDir);

      const testFile = join(testSiteDir, 'test.md');
      writeFileSync(testFile, '---\ntitle: My Test Title\n---\ncontent');

      const document = new Document(testFile, testSiteDir, DocumentType.PAGE);

      const result = await metadataConverter.convert('content', document, site);

      expect(capturedDocument).toBe(document);
      expect(result).toContain('My Test Title');
    });

    it('should provide site config to converter', async () => {
      let capturedSite: Site | null = null;

      const siteAwareConverter: ConverterPlugin = {
        name: 'site-aware-converter',
        matches: () => true,
        outputExt: () => '.html',
        convert: (content, _document, site) => {
          capturedSite = site;
          const siteTitle = site.config.title || 'Untitled';
          return `Site: ${siteTitle}\n${content}`;
        },
      };

      const site = new Site(testSiteDir, { title: 'My Site' });

      const testFile = join(testSiteDir, 'test.md');
      writeFileSync(testFile, '---\ntitle: Test\n---\ncontent');

      const document = new Document(testFile, testSiteDir, DocumentType.PAGE);

      const result = await siteAwareConverter.convert('content', document, site);

      expect(capturedSite).toBe(site);
      expect(result).toContain('My Site');
    });
  });

  describe('outputExt', () => {
    it('should return correct output extension', () => {
      const converter: ConverterPlugin = {
        name: 'test-converter',
        matches: (ext) => ext === '.md',
        outputExt: (ext) => (ext === '.md' ? '.html' : ext),
        convert: (content) => content,
      };

      expect(converter.outputExt('.md')).toBe('.html');
      expect(converter.outputExt('.txt')).toBe('.txt');
    });
  });

  describe('getCounts', () => {
    it('should return correct counts', () => {
      const converter1: ConverterPlugin = {
        name: 'conv-1',
        matches: () => true,
        outputExt: () => '.html',
        convert: () => 'converted',
      };

      const converter2: ConverterPlugin = {
        name: 'conv-2',
        matches: () => true,
        outputExt: () => '.html',
        convert: () => 'converted',
      };

      PluginRegistry.register(converter1);
      PluginRegistry.register(converter2);

      const counts = PluginRegistry.getCounts();
      expect(counts.converters).toBe(2);
    });
  });
});
