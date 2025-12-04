/**
 * Integration test for theme support
 */

import { Site } from '../Site';
import { Builder } from '../Builder';
import { mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Integration: Theme Support', () => {
  const testDir = join(tmpdir(), 'jekyll-theme-integration-test');
  const siteDir = join(testDir, 'my-site');

  beforeAll(() => {
    // Create site directory structure first
    mkdirSync(join(siteDir, '_layouts'), { recursive: true });
    mkdirSync(join(siteDir, '_includes'), { recursive: true });
    mkdirSync(join(siteDir, '_posts'), { recursive: true });

    // Create theme directory structure inside the site directory
    mkdirSync(join(siteDir, 'my-theme', '_layouts'), { recursive: true });
    mkdirSync(join(siteDir, 'my-theme', '_includes'), { recursive: true });
    mkdirSync(join(siteDir, 'my-theme', 'assets'), { recursive: true });

    // Create theme layouts
    writeFileSync(
      join(siteDir, 'my-theme', '_layouts', 'default.html'),
      '<!DOCTYPE html>\n<html>\n<head><title>{{ page.title }}</title></head>\n<body>\n{% include header.html %}\n{{ content }}\n{% include footer.html %}\n</body>\n</html>'
    );

    writeFileSync(
      join(siteDir, 'my-theme', '_layouts', 'post.html'),
      '---\nlayout: default\n---\n<article>\n<h1>{{ page.title }}</h1>\n<time>{{ page.date | date: "%Y-%m-%d" }}</time>\n{{ content }}\n</article>'
    );

    // Create theme includes
    writeFileSync(
      join(siteDir, 'my-theme', '_includes', 'header.html'),
      '<header><h1>Theme Header</h1></header>'
    );

    writeFileSync(
      join(siteDir, 'my-theme', '_includes', 'footer.html'),
      '<footer><p>Theme Footer</p></footer>'
    );

    // Create site config with theme
    writeFileSync(join(siteDir, '_config.yml'), `title: Test Site\ntheme: my-theme\nbaseurl: ""`);

    // Create site pages
    writeFileSync(
      join(siteDir, 'index.md'),
      '---\nlayout: default\ntitle: Home\n---\n\n# Welcome\n\nThis is the home page.'
    );

    // Create site post
    writeFileSync(
      join(siteDir, '_posts', '2024-01-01-test-post.md'),
      '---\nlayout: post\ntitle: Test Post\ndate: 2024-01-01\n---\n\nThis is a test post.'
    );

    // Create a site-specific include that overrides theme
    writeFileSync(
      join(siteDir, '_includes', 'header.html'),
      '<header><h1>Site Header (Override)</h1></header>'
    );

    // Create a site-specific layout
    writeFileSync(
      join(siteDir, '_layouts', 'page.html'),
      '---\nlayout: default\n---\n<div class="page">{{ content }}</div>'
    );
  });

  afterAll(() => {
    // Clean up - remove test directory if it's in the OS temp directory
    const osTmpDir = tmpdir();
    if (testDir.startsWith(osTmpDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Theme loading', () => {
    it('should load theme layouts and includes', async () => {
      const site = new Site(siteDir, {
        theme: 'my-theme',
        source: siteDir,
      });

      await site.read();

      // Should have layouts from both site and theme
      expect(site.layouts.has('default')).toBe(true);
      expect(site.layouts.has('post')).toBe(true);
      expect(site.layouts.has('page')).toBe(true);

      // Should have includes from both site and theme
      expect(site.includes.has('header.html')).toBe(true);
      expect(site.includes.has('footer.html')).toBe(true);
    });

    it('should prioritize site files over theme files', async () => {
      const site = new Site(siteDir, {
        theme: 'my-theme',
        source: siteDir,
      });

      await site.read();

      // Get the header include (should be from site, not theme)
      const headerInclude = site.includes.get('header.html');
      expect(headerInclude).toBeDefined();

      // Read the actual content
      const content = headerInclude!.content;
      expect(content).toContain('Site Header (Override)');
      expect(content).not.toContain('Theme Header');
    });
  });

  describe('Building with theme', () => {
    it('should build site using theme layouts', async () => {
      const site = new Site(siteDir, {
        theme: 'my-theme',
        source: siteDir,
      });

      const builder = new Builder(site, {
        clean: true,
        verbose: false,
      });

      await builder.build();

      // Check that index.html was created
      const indexPath = join(siteDir, '_site', 'index.html');
      expect(existsSync(indexPath)).toBe(true);

      const indexContent = readFileSync(indexPath, 'utf-8');

      // Should have theme layout structure
      expect(indexContent).toContain('<!DOCTYPE html>');
      expect(indexContent).toContain('<html>');

      // Should have site header (override)
      expect(indexContent).toContain('Site Header (Override)');
      expect(indexContent).not.toContain('Theme Header');

      // Should have theme footer
      expect(indexContent).toContain('Theme Footer');

      // Should have page content
      expect(indexContent).toContain('Welcome');
    });

    it('should build posts using theme layouts', async () => {
      const site = new Site(siteDir, {
        theme: 'my-theme',
        source: siteDir,
      });

      const builder = new Builder(site, {
        clean: true,
        verbose: false,
      });

      await builder.build();

      // Check that post was created
      const postPath = join(siteDir, '_site', '2024', '01', '01', 'test-post.html');
      expect(existsSync(postPath)).toBe(true);

      const postContent = readFileSync(postPath, 'utf-8');

      // Should use theme post layout
      expect(postContent).toContain('<article>');
      expect(postContent).toContain('<h1>Test Post</h1>');
      expect(postContent).toContain('<time>2024-01-01</time>');

      // Should have nested default layout
      expect(postContent).toContain('<!DOCTYPE html>');

      // Should have site header (override)
      expect(postContent).toContain('Site Header (Override)');

      // Should have theme footer
      expect(postContent).toContain('Theme Footer');
    });
  });

  describe('ThemeManager integration', () => {
    it('should expose themeManager on site instance', () => {
      const site = new Site(siteDir, {
        theme: 'my-theme',
        source: siteDir,
      });

      expect(site.themeManager).toBeDefined();
      expect(site.themeManager.hasTheme()).toBe(true);
      expect(site.themeManager.getTheme()?.name).toBe('my-theme');
    });

    it('should resolve layout paths correctly', () => {
      const site = new Site(siteDir, {
        theme: 'my-theme',
        source: siteDir,
      });

      // Site-specific layout
      const pagePath = site.themeManager.resolveLayout('page');
      expect(pagePath).toContain(siteDir);

      // Theme layout
      const postPath = site.themeManager.resolveLayout('post');
      expect(postPath).toContain('my-theme');
    });

    it('should get all layout and include directories', () => {
      const site = new Site(siteDir, {
        theme: 'my-theme',
        source: siteDir,
      });

      const layoutDirs = site.themeManager.getLayoutDirectories();
      expect(layoutDirs).toHaveLength(2);
      expect(layoutDirs[0]).toContain(siteDir);
      expect(layoutDirs[1]).toContain('my-theme');

      const includeDirs = site.themeManager.getIncludeDirectories();
      expect(includeDirs).toHaveLength(2);
      expect(includeDirs[0]).toContain(siteDir);
      expect(includeDirs[1]).toContain('my-theme');
    });
  });

  describe('Theme data merging', () => {
    beforeAll(() => {
      // Create theme data directory with data files
      mkdirSync(join(siteDir, 'my-theme', '_data'), { recursive: true });
      writeFileSync(
        join(siteDir, 'my-theme', '_data', 'navigation.yml'),
        'main:\n  - title: Home\n    url: /\n  - title: About\n    url: /about/'
      );
      writeFileSync(
        join(siteDir, 'my-theme', '_data', 'theme_settings.yml'),
        'color_scheme: dark\nfont: Arial'
      );

      // Create site data directory with some data files
      mkdirSync(join(siteDir, '_data'), { recursive: true });
      writeFileSync(
        join(siteDir, '_data', 'navigation.yml'),
        'main:\n  - title: Home\n    url: /\n  - title: Blog\n    url: /blog/'
      );
      writeFileSync(join(siteDir, '_data', 'site_settings.yml'), 'analytics_id: UA-123456');
    });

    it('should merge theme data with site data', async () => {
      const site = new Site(siteDir, {
        theme: 'my-theme',
        source: siteDir,
      });

      await site.read();

      // Site data should override theme data for navigation
      expect(site.data.navigation).toBeDefined();
      expect(site.data.navigation.main).toHaveLength(2);
      expect(site.data.navigation.main[1].title).toBe('Blog'); // Site override

      // Theme-only data should be present
      expect(site.data.theme_settings).toBeDefined();
      expect(site.data.theme_settings.color_scheme).toBe('dark');

      // Site-only data should be present
      expect(site.data.site_settings).toBeDefined();
      expect(site.data.site_settings.analytics_id).toBe('UA-123456');
    });
  });

  describe('Theme package.json metadata', () => {
    beforeAll(() => {
      // Create package.json in theme
      const packageJson = {
        name: 'jekyll-theme-my-theme',
        version: '2.0.0',
        description: 'A beautiful Jekyll theme for integration testing',
        author: {
          name: 'Test Author',
          email: 'test@example.com',
        },
        license: 'MIT',
        homepage: 'https://example.com/my-theme',
        keywords: ['jekyll', 'theme', 'test'],
      };
      writeFileSync(
        join(siteDir, 'my-theme', 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );
    });

    it('should read theme metadata from package.json', () => {
      const site = new Site(siteDir, {
        theme: 'my-theme',
        source: siteDir,
      });

      const metadata = site.themeManager.getThemeMetadata();
      expect(metadata).not.toBeNull();
      expect(metadata?.name).toBe('jekyll-theme-my-theme');
      expect(metadata?.version).toBe('2.0.0');
      expect(metadata?.description).toBe('A beautiful Jekyll theme for integration testing');
      expect(metadata?.author).toEqual({ name: 'Test Author', email: 'test@example.com' });
      expect(metadata?.license).toBe('MIT');
      expect(metadata?.homepage).toBe('https://example.com/my-theme');
      expect(metadata?.keywords).toEqual(['jekyll', 'theme', 'test']);
    });
  });

  describe('Theme _config.yml defaults', () => {
    beforeAll(() => {
      // Create _config.yml in theme with default settings
      const themeConfig = `
# Theme default configuration
author:
  name: Theme Author
  bio: A bio from the theme
social:
  twitter: theme_twitter
  github: theme_github
defaults:
  - scope:
      path: ""
      type: "posts"
    values:
      layout: post
      comments: true
`;
      writeFileSync(join(siteDir, 'my-theme', '_config.yml'), themeConfig);
    });

    it('should read theme default configuration from _config.yml', () => {
      const site = new Site(siteDir, {
        theme: 'my-theme',
        source: siteDir,
      });

      const defaults = site.themeManager.getThemeDefaults();
      expect(defaults).not.toBeNull();
      expect(defaults?.author).toEqual({ name: 'Theme Author', bio: 'A bio from the theme' });
      expect(defaults?.social).toEqual({ twitter: 'theme_twitter', github: 'theme_github' });
      expect(defaults?.defaults).toHaveLength(1);
      const firstDefault = defaults?.defaults?.[0];
      expect(firstDefault?.values.comments).toBe(true);
    });
  });

  describe('Theme static files', () => {
    beforeAll(() => {
      // Create some static files in theme assets
      mkdirSync(join(siteDir, 'my-theme', 'assets', 'css'), { recursive: true });
      mkdirSync(join(siteDir, 'my-theme', 'assets', 'js'), { recursive: true });
      mkdirSync(join(siteDir, 'my-theme', 'assets', 'images'), { recursive: true });

      writeFileSync(
        join(siteDir, 'my-theme', 'assets', 'css', 'theme.css'),
        'body { background: #fff; }'
      );
      writeFileSync(
        join(siteDir, 'my-theme', 'assets', 'js', 'theme.js'),
        'console.log("Theme JS loaded");'
      );
      writeFileSync(
        join(siteDir, 'my-theme', 'assets', 'images', 'logo.png'),
        'PNG binary content placeholder'
      );

      // Create site assets that should override theme
      mkdirSync(join(siteDir, 'assets', 'css'), { recursive: true });
      writeFileSync(
        join(siteDir, 'assets', 'css', 'theme.css'),
        'body { background: #f0f0f0; }' // Override theme CSS
      );
    });

    it('should list theme static files excluding site overrides', () => {
      const site = new Site(siteDir, {
        theme: 'my-theme',
        source: siteDir,
      });

      const themeFiles = site.themeManager.getThemeStaticFiles(siteDir);
      const relativePaths = themeFiles.map((f) => f.relativePath.replace(/\\/g, '/'));

      // theme.css should NOT be included (overridden by site)
      expect(relativePaths).not.toContain('assets/css/theme.css');

      // theme.js and logo.png should be included
      expect(relativePaths).toContain('assets/js/theme.js');
      expect(relativePaths).toContain('assets/images/logo.png');
    });
  });
});
