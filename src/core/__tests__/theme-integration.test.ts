/**
 * Integration test for theme support
 */

import { Site } from '../Site';
import { Builder } from '../Builder';
import { mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

describe('Integration: Theme Support', () => {
  const testDir = '/tmp/jekyll-theme-integration-test';
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
    writeFileSync(
      join(siteDir, '_config.yml'),
      `title: Test Site\ntheme: my-theme\nbaseurl: ""`
    );
    
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
    // Clean up
    if (testDir.startsWith('/tmp/')) {
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
});
