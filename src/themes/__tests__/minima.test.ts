/**
 * Tests for minima theme bundled with jekyll-ts
 */

import { Site } from '../../core/Site';
import { Builder } from '../../core/Builder';
import { ThemeManager } from '../../core/ThemeManager';
import { mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Minima Theme', () => {
  const testDir = join(tmpdir(), 'jekyll-minima-theme-test');

  beforeEach(() => {
    // Clean up and create fresh test site directory
    rmSync(testDir, { recursive: true, force: true });
    mkdirSync(testDir, { recursive: true });
    mkdirSync(join(testDir, '_posts'), { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    const osTmpDir = tmpdir();
    if (testDir.startsWith(osTmpDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Theme Loading', () => {
    it('should load minima as a bundled theme', () => {
      const config = {
        theme: 'minima',
        source: testDir,
      };

      const themeManager = new ThemeManager(testDir, config);

      expect(themeManager.hasTheme()).toBe(true);
      expect(themeManager.getTheme()).not.toBeNull();
      expect(themeManager.getTheme()?.name).toBe('minima');
    });

    it('should resolve minima layouts', () => {
      const config = {
        theme: 'minima',
        source: testDir,
      };

      const themeManager = new ThemeManager(testDir, config);

      // Check that minima layouts are resolved
      const basePath = themeManager.resolveLayout('base');
      const homePath = themeManager.resolveLayout('home');
      const pagePath = themeManager.resolveLayout('page');
      const postPath = themeManager.resolveLayout('post');

      expect(basePath).not.toBeNull();
      expect(basePath).toContain('minima');
      expect(basePath).toContain('_layouts');

      expect(homePath).not.toBeNull();
      expect(homePath).toContain('minima');

      expect(pagePath).not.toBeNull();
      expect(pagePath).toContain('minima');

      expect(postPath).not.toBeNull();
      expect(postPath).toContain('minima');
    });

    it('should resolve minima includes', () => {
      const config = {
        theme: 'minima',
        source: testDir,
      };

      const themeManager = new ThemeManager(testDir, config);

      // Check that minima includes are resolved
      const headPath = themeManager.resolveInclude('head.html');
      const headerPath = themeManager.resolveInclude('header.html');
      const footerPath = themeManager.resolveInclude('footer.html');

      expect(headPath).not.toBeNull();
      expect(headPath).toContain('minima');
      expect(headPath).toContain('_includes');

      expect(headerPath).not.toBeNull();
      expect(headerPath).toContain('minima');

      expect(footerPath).not.toBeNull();
      expect(footerPath).toContain('minima');
    });

    it('should have theme sass directory', () => {
      const config = {
        theme: 'minima',
        source: testDir,
      };

      const themeManager = new ThemeManager(testDir, config);

      const sassDir = themeManager.getThemeSassDirectory();
      expect(sassDir).not.toBeNull();
      expect(sassDir).toContain('minima');
      expect(sassDir).toContain('_sass');
    });

    it('should have theme assets directory', () => {
      const config = {
        theme: 'minima',
        source: testDir,
      };

      const themeManager = new ThemeManager(testDir, config);

      const assetsDir = themeManager.getThemeAssetsDirectory();
      expect(assetsDir).not.toBeNull();
      expect(assetsDir).toContain('minima');
      expect(assetsDir).toContain('assets');
    });

    it('should read theme metadata from package.json', () => {
      const config = {
        theme: 'minima',
        source: testDir,
      };

      const themeManager = new ThemeManager(testDir, config);

      const metadata = themeManager.getThemeMetadata();
      expect(metadata).not.toBeNull();
      expect(metadata?.name).toBe('minima');
      expect(metadata?.version).toBeDefined();
    });
  });

  describe('Site Integration', () => {
    it('should load minima theme layouts via Site', async () => {
      // Create site config
      writeFileSync(join(testDir, '_config.yml'), `title: Test Site\ntheme: minima\n`);

      // Create a test page
      writeFileSync(
        join(testDir, 'index.md'),
        '---\nlayout: home\ntitle: Home\n---\n\n# Welcome\n\nThis is a test site using minima theme.'
      );

      const site = new Site(testDir, {
        theme: 'minima',
        source: testDir,
      });

      await site.read();

      // Check that theme layouts are loaded
      expect(site.layouts.has('base')).toBe(true);
      expect(site.layouts.has('home')).toBe(true);
      expect(site.layouts.has('page')).toBe(true);
      expect(site.layouts.has('post')).toBe(true);

      // Check that theme includes are loaded
      expect(site.includes.has('head.html')).toBe(true);
      expect(site.includes.has('header.html')).toBe(true);
      expect(site.includes.has('footer.html')).toBe(true);
    });

    it('should allow site to override minima theme files', async () => {
      // Create site config
      writeFileSync(join(testDir, '_config.yml'), `title: Test Site\ntheme: minima\n`);

      // Create a custom header that overrides minima's header
      mkdirSync(join(testDir, '_includes'), { recursive: true });
      writeFileSync(
        join(testDir, '_includes', 'header.html'),
        '<header><h1>Custom Site Header</h1></header>'
      );

      // Create a test page
      writeFileSync(join(testDir, 'index.md'), '---\nlayout: home\ntitle: Home\n---\n\n# Welcome');

      const site = new Site(testDir, {
        theme: 'minima',
        source: testDir,
      });

      await site.read();

      // Site header should override theme header
      const headerInclude = site.includes.get('header.html');
      expect(headerInclude).toBeDefined();
      expect(headerInclude!.content).toContain('Custom Site Header');
    });
  });

  describe('Build Integration', () => {
    it('should build a site using minima theme', async () => {
      // Create site config with plugins for seo and feed tags
      writeFileSync(
        join(testDir, '_config.yml'),
        `title: Test Site\ntheme: minima\nbaseurl: ""\nplugins:\n  - jekyll-seo-tag\n  - jekyll-feed\n`
      );

      // Create a test page
      writeFileSync(
        join(testDir, 'index.md'),
        '---\nlayout: page\ntitle: Welcome\n---\n\n# Hello World\n\nThis is a test page.'
      );

      // Create a test post
      writeFileSync(
        join(testDir, '_posts', '2024-01-01-test-post.md'),
        '---\nlayout: post\ntitle: Test Post\ndate: 2024-01-01\n---\n\nThis is a test post using minima theme.'
      );

      const site = new Site(testDir, {
        theme: 'minima',
        source: testDir,
        plugins: ['jekyll-seo-tag', 'jekyll-feed'],
      });

      const builder = new Builder(site, {
        clean: true,
        verbose: false,
      });

      await builder.build();

      // Check that output files were created
      const indexPath = join(testDir, '_site', 'index.html');
      expect(existsSync(indexPath)).toBe(true);

      const indexContent = readFileSync(indexPath, 'utf-8');

      // Should have minima layout structure
      expect(indexContent).toContain('<!DOCTYPE html>');
      expect(indexContent).toContain('<html');
      expect(indexContent).toContain('</html>');

      // Should have page content
      expect(indexContent).toContain('Hello World');
    });

    it('should build posts with minima post layout', async () => {
      // Create site config with plugins
      writeFileSync(
        join(testDir, '_config.yml'),
        `title: Test Blog\ntheme: minima\nbaseurl: ""\nplugins:\n  - jekyll-seo-tag\n  - jekyll-feed\n`
      );

      // Create a test post
      writeFileSync(
        join(testDir, '_posts', '2024-01-15-my-post.md'),
        '---\nlayout: post\ntitle: My First Post\ndate: 2024-01-15\n---\n\nThis is the content of my first post.'
      );

      const site = new Site(testDir, {
        theme: 'minima',
        source: testDir,
        plugins: ['jekyll-seo-tag', 'jekyll-feed'],
      });

      const builder = new Builder(site, {
        clean: true,
        verbose: false,
      });

      await builder.build();

      // Check that post was created
      const postPath = join(testDir, '_site', '2024', '01', '15', 'my-post.html');
      expect(existsSync(postPath)).toBe(true);

      const postContent = readFileSync(postPath, 'utf-8');

      // Should have minima post layout structure
      expect(postContent).toContain('<!DOCTYPE html>');
      expect(postContent).toContain('article');
      expect(postContent).toContain('My First Post');
      expect(postContent).toContain('content of my first post');
    });
  });
});
