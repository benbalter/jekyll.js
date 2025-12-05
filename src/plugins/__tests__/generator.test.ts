/**
 * Tests for Generator Plugin System
 */

import {
  GeneratorPlugin,
  GeneratorResult,
  isGeneratorPlugin,
  GeneratorPriority,
} from '../generator';
import { PluginRegistry } from '../index';
import { Site } from '../../core/Site';
import { Renderer } from '../../core/Renderer';
import { mkdirSync, rmSync } from 'fs';
import { join } from 'path';

describe('Generator Plugin System', () => {
  const testSiteDir = join(__dirname, '../../../../../tmp/test-generators');

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

  describe('isGeneratorPlugin', () => {
    it('should return true for valid generator plugin', () => {
      const plugin: GeneratorPlugin = {
        name: 'test-generator',
        generate: jest.fn(),
      };

      expect(isGeneratorPlugin(plugin)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isGeneratorPlugin(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isGeneratorPlugin(undefined)).toBe(false);
    });

    it('should return false for plugin without generate method', () => {
      const plugin = {
        name: 'incomplete-plugin',
      };

      expect(isGeneratorPlugin(plugin)).toBe(false);
    });

    it('should return false for plugin without name', () => {
      const plugin = {
        generate: jest.fn(),
      };

      expect(isGeneratorPlugin(plugin)).toBe(false);
    });

    it('should return false for plugin with non-function generate', () => {
      const plugin = {
        name: 'invalid-plugin',
        generate: 'not a function',
      };

      expect(isGeneratorPlugin(plugin)).toBe(false);
    });
  });

  describe('GeneratorPriority', () => {
    it('should have correct priority values', () => {
      expect(GeneratorPriority.HIGH).toBe(10);
      expect(GeneratorPriority.NORMAL).toBe(50);
      expect(GeneratorPriority.LOW).toBe(90);
      expect(GeneratorPriority.LOWEST).toBe(100);
    });
  });

  describe('PluginRegistry generator methods', () => {
    it('should register a generator plugin', () => {
      const generator: GeneratorPlugin = {
        name: 'test-generator',
        generate: jest.fn(),
      };

      PluginRegistry.register(generator);

      const generators = PluginRegistry.getGenerators();
      expect(generators).toHaveLength(1);
      expect(generators[0]!.name).toBe('test-generator');
    });

    it('should sort generators by priority', () => {
      const lowPriority: GeneratorPlugin = {
        name: 'low-priority',
        priority: GeneratorPriority.LOW,
        generate: jest.fn(),
      };

      const highPriority: GeneratorPlugin = {
        name: 'high-priority',
        priority: GeneratorPriority.HIGH,
        generate: jest.fn(),
      };

      const normalPriority: GeneratorPlugin = {
        name: 'normal-priority',
        priority: GeneratorPriority.NORMAL,
        generate: jest.fn(),
      };

      // Register in wrong order
      PluginRegistry.register(lowPriority);
      PluginRegistry.register(highPriority);
      PluginRegistry.register(normalPriority);

      const generators = PluginRegistry.getGenerators();
      expect(generators[0]!.name).toBe('high-priority');
      expect(generators[1]!.name).toBe('normal-priority');
      expect(generators[2]!.name).toBe('low-priority');
    });

    it('should use default priority of 50 when not specified', () => {
      const withoutPriority: GeneratorPlugin = {
        name: 'no-priority',
        generate: jest.fn(),
      };

      const highPriority: GeneratorPlugin = {
        name: 'high-priority',
        priority: 10,
        generate: jest.fn(),
      };

      PluginRegistry.register(withoutPriority);
      PluginRegistry.register(highPriority);

      const generators = PluginRegistry.getGenerators();
      // High priority (10) should come before default priority (50)
      expect(generators[0]!.name).toBe('high-priority');
      expect(generators[1]!.name).toBe('no-priority');
    });
  });

  describe('Generator execution', () => {
    it('should call generator with site and renderer', async () => {
      const generateFn = jest.fn();
      const generator: GeneratorPlugin = {
        name: 'execution-test',
        generate: generateFn,
      };

      const site = new Site(testSiteDir);
      const renderer = new Renderer(site);

      await generator.generate(site, renderer);

      expect(generateFn).toHaveBeenCalledWith(site, renderer);
    });

    it('should handle async generators', async () => {
      const results: string[] = [];

      const asyncGenerator: GeneratorPlugin = {
        name: 'async-generator',
        generate: async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          results.push('generated');
          return { files: [] };
        },
      };

      const site = new Site(testSiteDir);
      const renderer = new Renderer(site);

      await asyncGenerator.generate(site, renderer);

      expect(results).toContain('generated');
    });

    it('should return generated files', async () => {
      const generator: GeneratorPlugin = {
        name: 'file-generator',
        generate: (): GeneratorResult => ({
          files: [
            { path: 'test.txt', content: 'Hello World' },
            { path: 'data/output.json', content: '{"key": "value"}' },
          ],
        }),
      };

      const site = new Site(testSiteDir);
      const renderer = new Renderer(site);

      const result = await generator.generate(site, renderer);

      expect(result).not.toBeNull();
      const files = result?.files;
      expect(files).toHaveLength(2);
      expect(files![0]!.path).toBe('test.txt');
      expect(files![1]!.path).toBe('data/output.json');
    });

    it('should handle generators that return void', async () => {
      const generator: GeneratorPlugin = {
        name: 'void-generator',
        generate: () => {
          // Modifies site in place, returns nothing
        },
      };

      const site = new Site(testSiteDir);
      const renderer = new Renderer(site);

      const result = await generator.generate(site, renderer);

      expect(result).toBeUndefined();
    });
  });

  describe('getCounts', () => {
    it('should return correct counts', () => {
      const generator1: GeneratorPlugin = {
        name: 'gen-1',
        generate: jest.fn(),
      };

      const generator2: GeneratorPlugin = {
        name: 'gen-2',
        generate: jest.fn(),
      };

      PluginRegistry.register(generator1);
      PluginRegistry.register(generator2);

      const counts = PluginRegistry.getCounts();
      expect(counts.generators).toBe(2);
    });
  });
});
