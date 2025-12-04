/**
 * Tests for Plugin Hooks System
 */

import { Hooks, PluginHooks, SiteHookContext, DocumentHookContext, VALID_HOOKS } from '../hooks';
import { Site } from '../../core/Site';
import { Renderer } from '../../core/Renderer';
import { Document, DocumentType } from '../../core/Document';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';

describe('Plugin Hooks System', () => {
  const testSiteDir = join(__dirname, '../../../../../tmp/test-hooks');

  beforeEach(() => {
    // Clean up and create fresh test site directory
    rmSync(testSiteDir, { recursive: true, force: true });
    mkdirSync(testSiteDir, { recursive: true });

    // Clear all hooks before each test
    Hooks.clear();
  });

  afterEach(() => {
    rmSync(testSiteDir, { recursive: true, force: true });
    Hooks.clear();
  });

  describe('Hooks Registry', () => {
    it('should register a hook callback', () => {
      const callback = jest.fn();
      Hooks.register('site', 'after_init', callback, 'test-plugin');

      expect(Hooks.hasHooks('site', 'after_init')).toBe(true);
      expect(Hooks.getHooks('site', 'after_init')).toHaveLength(1);
    });

    it('should register multiple hooks for the same event', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      Hooks.register('site', 'after_init', callback1, 'plugin-1');
      Hooks.register('site', 'after_init', callback2, 'plugin-2');

      expect(Hooks.getHooks('site', 'after_init')).toHaveLength(2);
    });

    it('should sort hooks by priority', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      const callback3 = jest.fn();

      Hooks.register('site', 'after_init', callback1, 'plugin-1', 90);
      Hooks.register('site', 'after_init', callback2, 'plugin-2', 10);
      Hooks.register('site', 'after_init', callback3, 'plugin-3', 50);

      const hooks = Hooks.getHooks('site', 'after_init');
      expect(hooks[0]!.priority).toBe(10);
      expect(hooks[1]!.priority).toBe(50);
      expect(hooks[2]!.priority).toBe(90);
    });

    it('should trigger hooks in priority order', async () => {
      const callOrder: string[] = [];

      Hooks.register(
        'site',
        'after_init',
        () => {
          callOrder.push('low');
        },
        'low-priority',
        90
      );
      Hooks.register(
        'site',
        'after_init',
        () => {
          callOrder.push('high');
        },
        'high-priority',
        10
      );
      Hooks.register(
        'site',
        'after_init',
        () => {
          callOrder.push('normal');
        },
        'normal-priority',
        50
      );

      const site = new Site(testSiteDir);
      await Hooks.trigger('site', 'after_init', { site });

      expect(callOrder).toEqual(['high', 'normal', 'low']);
    });

    it('should handle async callbacks', async () => {
      const results: number[] = [];

      Hooks.register(
        'site',
        'after_init',
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          results.push(1);
        },
        'async-plugin'
      );

      const site = new Site(testSiteDir);
      await Hooks.trigger('site', 'after_init', { site });

      expect(results).toEqual([1]);
    });

    it('should not throw when triggering hooks with no registered callbacks', async () => {
      const site = new Site(testSiteDir);
      await expect(Hooks.trigger('site', 'after_init', { site })).resolves.not.toThrow();
    });

    it('should catch and log errors in hook callbacks without stopping execution', async () => {
      const results: string[] = [];

      Hooks.register(
        'site',
        'after_init',
        () => {
          results.push('before-error');
        },
        'before-error-plugin',
        10
      );

      Hooks.register(
        'site',
        'after_init',
        () => {
          throw new Error('Test error');
        },
        'error-plugin',
        50
      );

      Hooks.register(
        'site',
        'after_init',
        () => {
          results.push('after-error');
        },
        'after-error-plugin',
        90
      );

      const site = new Site(testSiteDir);
      await Hooks.trigger('site', 'after_init', { site });

      // All hooks should run even if one throws
      expect(results).toEqual(['before-error', 'after-error']);
    });

    it('should clear all hooks', () => {
      Hooks.register('site', 'after_init', jest.fn(), 'plugin-1');
      Hooks.register('site', 'pre_render', jest.fn(), 'plugin-2');

      Hooks.clear();

      expect(Hooks.hasHooks('site', 'after_init')).toBe(false);
      expect(Hooks.hasHooks('site', 'pre_render')).toBe(false);
    });

    it('should return registered hook IDs', () => {
      Hooks.register('site', 'after_init', jest.fn(), 'plugin-1');
      Hooks.register('pages', 'post_init', jest.fn(), 'plugin-2');

      const ids = Hooks.getRegisteredHookIds();

      expect(ids).toContain('site:after_init');
      expect(ids).toContain('pages:post_init');
    });
  });

  describe('VALID_HOOKS', () => {
    it('should define all expected hook combinations', () => {
      expect(VALID_HOOKS['site:after_init']).toBe('site');
      expect(VALID_HOOKS['site:after_reset']).toBe('site');
      expect(VALID_HOOKS['site:pre_render']).toBe('site');
      expect(VALID_HOOKS['site:post_render']).toBe('site');
      expect(VALID_HOOKS['site:post_write']).toBe('site');
      expect(VALID_HOOKS['pages:post_init']).toBe('site');
      expect(VALID_HOOKS['posts:post_init']).toBe('site');
      expect(VALID_HOOKS['documents:pre_render']).toBe('document');
      expect(VALID_HOOKS['documents:post_render']).toBe('document');
      expect(VALID_HOOKS['documents:post_write']).toBe('document');
    });
  });

  describe('PluginHooks class', () => {
    it('should register hooks with consistent plugin name', () => {
      const hooks = new PluginHooks('my-plugin');
      const callback = jest.fn();

      hooks.onSiteAfterInit(callback);

      const registeredHooks = Hooks.getHooks('site', 'after_init');
      expect(registeredHooks[0]!.pluginName).toBe('my-plugin');
    });

    it('should support all hook convenience methods', () => {
      const hooks = new PluginHooks('test-plugin');

      hooks.onSiteAfterInit(jest.fn());
      hooks.onSiteAfterReset(jest.fn());
      hooks.onSitePreRender(jest.fn());
      hooks.onSitePostRender(jest.fn());
      hooks.onSitePostWrite(jest.fn());
      hooks.onPagesPostInit(jest.fn());
      hooks.onPostsPostInit(jest.fn());
      hooks.onDocumentPreRender(jest.fn());
      hooks.onDocumentPostRender(jest.fn());
      hooks.onDocumentPostWrite(jest.fn());

      expect(Hooks.hasHooks('site', 'after_init')).toBe(true);
      expect(Hooks.hasHooks('site', 'after_reset')).toBe(true);
      expect(Hooks.hasHooks('site', 'pre_render')).toBe(true);
      expect(Hooks.hasHooks('site', 'post_render')).toBe(true);
      expect(Hooks.hasHooks('site', 'post_write')).toBe(true);
      expect(Hooks.hasHooks('pages', 'post_init')).toBe(true);
      expect(Hooks.hasHooks('posts', 'post_init')).toBe(true);
      expect(Hooks.hasHooks('documents', 'pre_render')).toBe(true);
      expect(Hooks.hasHooks('documents', 'post_render')).toBe(true);
      expect(Hooks.hasHooks('documents', 'post_write')).toBe(true);
    });

    it('should support custom priority', () => {
      const hooks = new PluginHooks('priority-plugin');

      hooks.onSiteAfterInit(jest.fn(), 25);

      const registeredHooks = Hooks.getHooks('site', 'after_init');
      expect(registeredHooks[0]!.priority).toBe(25);
    });

    it('should support generic on() method', () => {
      const hooks = new PluginHooks('generic-plugin');
      const callback = jest.fn();

      hooks.on('site', 'pre_render', callback, 75);

      const registeredHooks = Hooks.getHooks('site', 'pre_render');
      expect(registeredHooks[0]!.pluginName).toBe('generic-plugin');
      expect(registeredHooks[0]!.priority).toBe(75);
    });
  });

  describe('Hook Context', () => {
    it('should pass site context to site hooks', async () => {
      let capturedContext: SiteHookContext | null = null;

      Hooks.register(
        'site',
        'after_init',
        (ctx) => {
          capturedContext = ctx as SiteHookContext;
        },
        'context-plugin'
      );

      const site = new Site(testSiteDir);
      const renderer = new Renderer(site);

      await Hooks.trigger('site', 'after_init', { site, renderer });

      expect(capturedContext).not.toBeNull();
      expect(capturedContext!.site).toBe(site);
      expect(capturedContext!.renderer).toBe(renderer);
    });

    it('should pass document context to document hooks', async () => {
      // Create a test file
      const testFile = join(testSiteDir, 'test.md');
      writeFileSync(testFile, '---\ntitle: Test\n---\nContent');

      let capturedContext: DocumentHookContext | null = null;

      Hooks.register(
        'documents',
        'pre_render',
        (ctx) => {
          capturedContext = ctx as DocumentHookContext;
        },
        'doc-context-plugin'
      );

      const site = new Site(testSiteDir);
      const renderer = new Renderer(site);
      const document = new Document(testFile, testSiteDir, DocumentType.PAGE);

      await Hooks.trigger('documents', 'pre_render', {
        document,
        site,
        renderer,
      });

      expect(capturedContext).not.toBeNull();
      expect(capturedContext!.document).toBe(document);
      expect(capturedContext!.site).toBe(site);
      expect(capturedContext!.renderer).toBe(renderer);
    });
  });

  describe('Content Modification', () => {
    it('should allow hooks to modify content in post_render context', async () => {
      // Create a test file
      const testFile = join(testSiteDir, 'content-test.md');
      writeFileSync(testFile, '---\ntitle: Content Test\n---\nOriginal content');

      // Register a hook that modifies content
      Hooks.register(
        'documents',
        'post_render',
        (ctx) => {
          const docCtx = ctx as DocumentHookContext;
          if (docCtx.content) {
            docCtx.content = docCtx.content.toUpperCase();
          }
        },
        'content-modifier-plugin'
      );

      const site = new Site(testSiteDir);
      const renderer = new Renderer(site);
      const document = new Document(testFile, testSiteDir, DocumentType.PAGE);

      const hookContext = {
        document,
        site,
        renderer,
        content: 'original content',
      };

      await Hooks.trigger('documents', 'post_render', hookContext);

      // Content should be modified by the hook
      expect(hookContext.content).toBe('ORIGINAL CONTENT');
    });

    it('should pass content to pre_render hook for inspection', async () => {
      // Create a test file
      const testFile = join(testSiteDir, 'pre-render-test.md');
      writeFileSync(testFile, '---\ntitle: Pre Render Test\n---\nTest content');

      let capturedContent: string | undefined;

      // Register a hook that captures content
      Hooks.register(
        'documents',
        'pre_render',
        (ctx) => {
          const docCtx = ctx as DocumentHookContext;
          capturedContent = docCtx.content;
        },
        'content-inspector-plugin'
      );

      const site = new Site(testSiteDir);
      const renderer = new Renderer(site);
      const document = new Document(testFile, testSiteDir, DocumentType.PAGE);

      await Hooks.trigger('documents', 'pre_render', {
        document,
        site,
        renderer,
        content: 'some content to inspect',
      });

      expect(capturedContent).toBe('some content to inspect');
    });

    it('should support multiple hooks modifying content in sequence', async () => {
      // Create a test file
      const testFile = join(testSiteDir, 'multi-hook-test.md');
      writeFileSync(testFile, '---\ntitle: Multi Hook Test\n---\nTest');

      // Register first hook (adds prefix)
      Hooks.register(
        'documents',
        'post_render',
        (ctx) => {
          const docCtx = ctx as DocumentHookContext;
          if (docCtx.content) {
            docCtx.content = 'PREFIX: ' + docCtx.content;
          }
        },
        'prefix-plugin',
        10 // High priority - runs first
      );

      // Register second hook (adds suffix)
      Hooks.register(
        'documents',
        'post_render',
        (ctx) => {
          const docCtx = ctx as DocumentHookContext;
          if (docCtx.content) {
            docCtx.content = docCtx.content + ' :SUFFIX';
          }
        },
        'suffix-plugin',
        90 // Low priority - runs second
      );

      const site = new Site(testSiteDir);
      const renderer = new Renderer(site);
      const document = new Document(testFile, testSiteDir, DocumentType.PAGE);

      const hookContext = {
        document,
        site,
        renderer,
        content: 'content',
      };

      await Hooks.trigger('documents', 'post_render', hookContext);

      // Both hooks should have modified the content in order
      expect(hookContext.content).toBe('PREFIX: content :SUFFIX');
    });
  });
});
