import { Builder, BuilderOptions } from '../Builder';
import { Site } from '../Site';
import { mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

describe('Builder', () => {
  const testSiteDir = join(__dirname, '../../../../tmp/test-builder');
  const destDir = join(testSiteDir, '_site');

  beforeEach(() => {
    // Clean up and create fresh test site directory
    try {
      rmSync(testSiteDir, { recursive: true, force: true });
    } catch (error) {
      // Directory may not exist, which is fine
    }
    mkdirSync(testSiteDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    try {
      rmSync(testSiteDir, { recursive: true, force: true });
    } catch (error) {
      // Directory may not exist, which is fine
    }
  });

  describe('constructor', () => {
    it('should create a builder instance', () => {
      const site = new Site(testSiteDir);
      const builder = new Builder(site);

      expect(builder).toBeDefined();
      expect(builder.getSite()).toBe(site);
      expect(builder.getRenderer()).toBeDefined();
    });

    it('should accept options', () => {
      const site = new Site(testSiteDir);
      const options: BuilderOptions = {
        showDrafts: true,
        showFuture: true,
        clean: false,
        verbose: true,
      };
      const builder = new Builder(site, options);

      expect(builder).toBeDefined();
    });
  });

  describe('build', () => {
    it('should build a simple site with pages', async () => {
      // Create test pages
      writeFileSync(
        join(testSiteDir, 'index.md'),
        `---
title: Home
---
# Welcome

This is the home page.`
      );

      writeFileSync(
        join(testSiteDir, 'about.md'),
        `---
title: About
---
# About Us

This is the about page.`
      );

      const site = new Site(testSiteDir);
      const builder = new Builder(site);
      await builder.build();

      // Check that output files exist
      expect(existsSync(join(destDir, 'index.html'))).toBe(true);
      expect(existsSync(join(destDir, 'about.html'))).toBe(true);

      // Check content
      const indexContent = readFileSync(join(destDir, 'index.html'), 'utf-8');
      expect(indexContent).toContain('Welcome');
      expect(indexContent).toContain('This is the home page.');

      const aboutContent = readFileSync(join(destDir, 'about.html'), 'utf-8');
      expect(aboutContent).toContain('About Us');
      expect(aboutContent).toContain('This is the about page.');
    });

    it('should build posts', async () => {
      const postsDir = join(testSiteDir, '_posts');
      mkdirSync(postsDir);

      writeFileSync(
        join(postsDir, '2024-01-15-hello-world.md'),
        `---
title: Hello World
---
# Hello World

My first post!`
      );

      const site = new Site(testSiteDir);
      const builder = new Builder(site);
      await builder.build();

      // Check that post was built with correct URL structure
      expect(existsSync(join(destDir, '2024/01/15/hello-world.html'))).toBe(true);

      const postContent = readFileSync(join(destDir, '2024/01/15/hello-world.html'), 'utf-8');
      expect(postContent).toContain('Hello World');
      expect(postContent).toContain('My first post!');
    });

    it('should apply layouts', async () => {
      // Create layout
      const layoutsDir = join(testSiteDir, '_layouts');
      mkdirSync(layoutsDir);

      writeFileSync(
        join(layoutsDir, 'default.html'),
        `<!DOCTYPE html>
<html>
<head><title>{{ page.title }}</title></head>
<body>
<main>{{ content }}</main>
</body>
</html>`
      );

      // Create page with layout
      writeFileSync(
        join(testSiteDir, 'index.md'),
        `---
title: Home
layout: default
---
Welcome to my site!`
      );

      const site = new Site(testSiteDir);
      const builder = new Builder(site);
      await builder.build();

      const content = readFileSync(join(destDir, 'index.html'), 'utf-8');
      expect(content).toContain('<!DOCTYPE html>');
      expect(content).toContain('<title>Home</title>');
      expect(content).toContain('<main>');
      expect(content).toContain('Welcome to my site!');
    });

    it('should build collections', async () => {
      // Create collection
      const recipesDir = join(testSiteDir, '_recipes');
      mkdirSync(recipesDir);

      writeFileSync(
        join(recipesDir, 'chocolate-chip-cookies.md'),
        `---
title: Chocolate Chip Cookies
---
# Chocolate Chip Cookies

A delicious recipe.`
      );

      const site = new Site(testSiteDir, {
        collections: {
          recipes: {
            output: true,
          },
        },
      });
      const builder = new Builder(site);
      await builder.build();

      expect(existsSync(join(destDir, 'recipes/chocolate-chip-cookies.html'))).toBe(true);

      const content = readFileSync(join(destDir, 'recipes/chocolate-chip-cookies.html'), 'utf-8');
      expect(content).toContain('Chocolate Chip Cookies');
      expect(content).toContain('A delicious recipe.');
    });

    it('should not build collections with output: false', async () => {
      const recipesDir = join(testSiteDir, '_recipes');
      mkdirSync(recipesDir);

      writeFileSync(
        join(recipesDir, 'recipe.md'),
        `---
title: Recipe
---
Content`
      );

      const site = new Site(testSiteDir, {
        collections: {
          recipes: {
            output: false,
          },
        },
      });
      const builder = new Builder(site);
      await builder.build();

      expect(existsSync(join(destDir, 'recipes/recipe.html'))).toBe(false);
    });

    it('should copy static files', async () => {
      // Create static files
      const assetsDir = join(testSiteDir, 'assets');
      mkdirSync(assetsDir);

      writeFileSync(join(assetsDir, 'style.css'), 'body { margin: 0; }');
      writeFileSync(join(assetsDir, 'script.js'), 'console.log("hello");');

      // Create an image
      const imagesDir = join(assetsDir, 'images');
      mkdirSync(imagesDir);
      writeFileSync(join(imagesDir, 'logo.png'), 'fake-image-data');

      const site = new Site(testSiteDir);
      const builder = new Builder(site);
      await builder.build();

      // Check that static files were copied
      expect(existsSync(join(destDir, 'assets/style.css'))).toBe(true);
      expect(existsSync(join(destDir, 'assets/script.js'))).toBe(true);
      expect(existsSync(join(destDir, 'assets/images/logo.png'))).toBe(true);

      const cssContent = readFileSync(join(destDir, 'assets/style.css'), 'utf-8');
      expect(cssContent).toBe('body { margin: 0; }');
    });

    it('should respect showDrafts option', async () => {
      const postsDir = join(testSiteDir, '_posts');
      mkdirSync(postsDir);

      writeFileSync(
        join(postsDir, '2024-01-15-draft-post.md'),
        `---
title: Draft Post
published: false
---
This is a draft.`
      );

      // Build without showDrafts
      const site1 = new Site(testSiteDir);
      const builder1 = new Builder(site1, { showDrafts: false });
      await builder1.build();

      expect(existsSync(join(destDir, '2024/01/15/draft-post.html'))).toBe(false);

      // Clean and rebuild with showDrafts
      try {
        rmSync(destDir, { recursive: true, force: true });
      } catch (error) {
        // Ignore errors
      }

      const site2 = new Site(testSiteDir);
      const builder2 = new Builder(site2, { showDrafts: true });
      await builder2.build();

      expect(existsSync(join(destDir, '2024/01/15/draft-post.html'))).toBe(true);
    });

    it('should respect showFuture option', async () => {
      const postsDir = join(testSiteDir, '_posts');
      mkdirSync(postsDir);

      // Create a future-dated post
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const year = futureDate.getFullYear();
      const month = String(futureDate.getMonth() + 1).padStart(2, '0');
      const day = String(futureDate.getDate()).padStart(2, '0');

      writeFileSync(
        join(postsDir, `${year}-${month}-${day}-future-post.md`),
        `---
title: Future Post
---
This is from the future.`
      );

      // Build without showFuture
      const site1 = new Site(testSiteDir);
      const builder1 = new Builder(site1, { showFuture: false });
      await builder1.build();

      expect(existsSync(join(destDir, `${year}/${month}/${day}/future-post.html`))).toBe(false);

      // Clean and rebuild with showFuture
      try {
        rmSync(destDir, { recursive: true, force: true });
      } catch (error) {
        // Ignore errors
      }

      const site2 = new Site(testSiteDir);
      const builder2 = new Builder(site2, { showFuture: true });
      await builder2.build();

      expect(existsSync(join(destDir, `${year}/${month}/${day}/future-post.html`))).toBe(true);
    });

    it('should handle custom permalinks', async () => {
      writeFileSync(
        join(testSiteDir, 'about.md'),
        `---
title: About
permalink: /custom/about-us/
---
Custom permalink page`
      );

      const site = new Site(testSiteDir);
      const builder = new Builder(site);
      await builder.build();

      expect(existsSync(join(destDir, 'custom/about-us/index.html'))).toBe(true);
      
      const content = readFileSync(join(destDir, 'custom/about-us/index.html'), 'utf-8');
      expect(content).toContain('Custom permalink page');
    });

    it('should clean destination directory by default', async () => {
      // Create a file in destination
      mkdirSync(destDir, { recursive: true });
      writeFileSync(join(destDir, 'old-file.txt'), 'old content');

      // Create a simple page
      writeFileSync(
        join(testSiteDir, 'index.md'),
        `---
title: Home
---
Content`
      );

      const site = new Site(testSiteDir);
      const builder = new Builder(site, { clean: true });
      await builder.build();

      // Old file should be removed
      expect(existsSync(join(destDir, 'old-file.txt'))).toBe(false);
      // New file should exist
      expect(existsSync(join(destDir, 'index.html'))).toBe(true);
    });

    it('should not clean destination when clean: false', async () => {
      // Create a file in destination
      mkdirSync(destDir, { recursive: true });
      writeFileSync(join(destDir, 'existing-file.txt'), 'existing content');

      // Create a simple page
      writeFileSync(
        join(testSiteDir, 'index.md'),
        `---
title: Home
---
Content`
      );

      const site = new Site(testSiteDir);
      const builder = new Builder(site, { clean: false });
      await builder.build();

      // Existing file should still be there
      expect(existsSync(join(destDir, 'existing-file.txt'))).toBe(true);
      // New file should also exist
      expect(existsSync(join(destDir, 'index.html'))).toBe(true);
    });

    it('should handle nested pages', async () => {
      const blogDir = join(testSiteDir, 'blog');
      mkdirSync(blogDir);

      writeFileSync(
        join(blogDir, 'post.md'),
        `---
title: Blog Post
---
Nested page content`
      );

      const site = new Site(testSiteDir);
      const builder = new Builder(site);
      await builder.build();

      expect(existsSync(join(destDir, 'blog/post.html'))).toBe(true);
      
      const content = readFileSync(join(destDir, 'blog/post.html'), 'utf-8');
      expect(content).toContain('Nested page content');
    });

    it('should handle posts with categories', async () => {
      const postsDir = join(testSiteDir, '_posts');
      mkdirSync(postsDir);

      writeFileSync(
        join(postsDir, '2024-01-15-categorized-post.md'),
        `---
title: Categorized Post
categories: [tech, programming]
---
Post with categories`
      );

      const site = new Site(testSiteDir);
      const builder = new Builder(site);
      await builder.build();

      // Post should be at /tech/programming/2024/01/15/categorized-post.html
      expect(existsSync(join(destDir, 'tech/programming/2024/01/15/categorized-post.html'))).toBe(true);
      
      const content = readFileSync(join(destDir, 'tech/programming/2024/01/15/categorized-post.html'), 'utf-8');
      expect(content).toContain('Post with categories');
    });

    it('should exclude files based on config', async () => {
      // Create files
      writeFileSync(join(testSiteDir, 'index.md'), '---\ntitle: Home\n---\nContent');
      
      const draftDir = join(testSiteDir, 'drafts');
      mkdirSync(draftDir);
      writeFileSync(join(draftDir, 'draft.md'), '---\ntitle: Draft\n---\nDraft content');

      const site = new Site(testSiteDir, {
        exclude: ['drafts'],
      });
      const builder = new Builder(site);
      await builder.build();

      // Index should be built
      expect(existsSync(join(destDir, 'index.html'))).toBe(true);
      
      // Draft should not be built
      expect(existsSync(join(destDir, 'drafts/draft.html'))).toBe(false);
    });
  });

  describe('URL generation', () => {
    it('should generate correct URLs for index pages', async () => {
      writeFileSync(
        join(testSiteDir, 'index.md'),
        `---
title: Home
---
Home page`
      );

      const site = new Site(testSiteDir);
      const builder = new Builder(site);
      await builder.build();

      // Should be at /index.html (or could be optimized to /)
      expect(existsSync(join(destDir, 'index.html'))).toBe(true);
    });

    it('should generate correct URLs for regular pages', async () => {
      writeFileSync(
        join(testSiteDir, 'about.md'),
        `---
title: About
---
About page`
      );

      const site = new Site(testSiteDir);
      const builder = new Builder(site);
      await builder.build();

      expect(existsSync(join(destDir, 'about.html'))).toBe(true);
    });
  });

  describe('incremental builds', () => {
    it('should skip rebuild when no changes detected', async () => {
      writeFileSync(
        join(testSiteDir, 'index.md'),
        `---
title: Home
---
# Welcome`
      );

      const site = new Site(testSiteDir);
      const builder = new Builder(site, { incremental: true });
      
      // First build
      await builder.build();
      expect(existsSync(join(destDir, 'index.html'))).toBe(true);
      
      // Second build with no changes
      const site2 = new Site(testSiteDir);
      const builder2 = new Builder(site2, { incremental: true });
      await builder2.build();
      
      // Should still work
      expect(existsSync(join(destDir, 'index.html'))).toBe(true);
    });

    it('should rebuild changed files only', async () => {
      writeFileSync(
        join(testSiteDir, 'page1.md'),
        `---
title: Page 1
---
Content 1`
      );
      
      writeFileSync(
        join(testSiteDir, 'page2.md'),
        `---
title: Page 2
---
Content 2`
      );

      const site = new Site(testSiteDir);
      const builder = new Builder(site, { incremental: true });
      
      // First build
      await builder.build();
      expect(existsSync(join(destDir, 'page1.html'))).toBe(true);
      expect(existsSync(join(destDir, 'page2.html'))).toBe(true);
      
      // Wait a bit for file system
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Modify only page1
      writeFileSync(
        join(testSiteDir, 'page1.md'),
        `---
title: Page 1 Updated
---
Updated content`
      );
      
      // Second build with incremental
      const site2 = new Site(testSiteDir);
      const builder2 = new Builder(site2, { incremental: true });
      await builder2.build();
      
      // Both pages should still exist
      expect(existsSync(join(destDir, 'page1.html'))).toBe(true);
      expect(existsSync(join(destDir, 'page2.html'))).toBe(true);
      
      // Page1 should have updated content
      const page1Content = readFileSync(join(destDir, 'page1.html'), 'utf-8');
      expect(page1Content).toContain('Updated content');
    });

    it('should not clean destination when incremental is enabled', async () => {
      // Create a file in destination
      mkdirSync(destDir, { recursive: true });
      writeFileSync(join(destDir, 'existing-file.txt'), 'existing content');

      writeFileSync(
        join(testSiteDir, 'index.md'),
        `---
title: Home
---
Content`
      );

      const site = new Site(testSiteDir);
      const builder = new Builder(site, { incremental: true, clean: true });
      await builder.build();

      // Existing file should still be there (when incremental is enabled, cleaning is always skipped, regardless of the clean option value)
      expect(existsSync(join(destDir, 'existing-file.txt'))).toBe(true);
      // New file should also exist
      expect(existsSync(join(destDir, 'index.html'))).toBe(true);
    });
  });

  describe('keep_files support', () => {
    it('should preserve files listed in keep_files during clean', async () => {
      // Create initial destination with some files
      mkdirSync(destDir, { recursive: true });
      mkdirSync(join(destDir, '.git'), { recursive: true });
      writeFileSync(join(destDir, '.git/config'), 'git config');
      writeFileSync(join(destDir, 'old-file.html'), 'old content');

      // Create a simple page
      writeFileSync(
        join(testSiteDir, 'index.md'),
        `---
title: Home
---
Content`
      );

      const site = new Site(testSiteDir, {
        keep_files: ['.git'],
      });
      const builder = new Builder(site, { clean: true });
      await builder.build();

      // .git should be preserved
      expect(existsSync(join(destDir, '.git/config'))).toBe(true);
      
      // old-file.html should be removed
      expect(existsSync(join(destDir, 'old-file.html'))).toBe(false);
      
      // New index.html should exist
      expect(existsSync(join(destDir, 'index.html'))).toBe(true);
    });

    it('should preserve multiple files/directories in keep_files', async () => {
      // Create initial destination with some files
      mkdirSync(destDir, { recursive: true });
      mkdirSync(join(destDir, '.git'), { recursive: true });
      mkdirSync(join(destDir, '.svn'), { recursive: true });
      writeFileSync(join(destDir, '.git/config'), 'git config');
      writeFileSync(join(destDir, '.svn/entries'), 'svn entries');
      writeFileSync(join(destDir, 'old.html'), 'old content');

      writeFileSync(
        join(testSiteDir, 'index.md'),
        '---\ntitle: Home\n---\nContent'
      );

      const site = new Site(testSiteDir, {
        keep_files: ['.git', '.svn'],
      });
      const builder = new Builder(site, { clean: true });
      await builder.build();

      // Both directories should be preserved
      expect(existsSync(join(destDir, '.git/config'))).toBe(true);
      expect(existsSync(join(destDir, '.svn/entries'))).toBe(true);
      
      // old.html should be removed
      expect(existsSync(join(destDir, 'old.html'))).toBe(false);
    });

    it('should preserve nested keep_files paths', async () => {
      // Create initial destination with nested structure
      mkdirSync(join(destDir, 'uploads/images'), { recursive: true });
      writeFileSync(join(destDir, 'uploads/images/photo.jpg'), 'image data');
      writeFileSync(join(destDir, 'old.html'), 'old content');

      writeFileSync(
        join(testSiteDir, 'index.md'),
        '---\ntitle: Home\n---\nContent'
      );

      const site = new Site(testSiteDir, {
        keep_files: ['uploads'],
      });
      const builder = new Builder(site, { clean: true });
      await builder.build();

      // uploads directory and its contents should be preserved
      expect(existsSync(join(destDir, 'uploads/images/photo.jpg'))).toBe(true);
      
      // old.html should be removed
      expect(existsSync(join(destDir, 'old.html'))).toBe(false);
    });
  });

  describe('static_files handling', () => {
    it('should collect static files during build', async () => {
      // Create static files
      const assetsDir = join(testSiteDir, 'assets');
      mkdirSync(assetsDir);
      writeFileSync(join(assetsDir, 'style.css'), 'body { margin: 0; }');
      writeFileSync(join(assetsDir, 'script.js'), 'console.log("hello");');

      // Create an image
      const imagesDir = join(assetsDir, 'images');
      mkdirSync(imagesDir);
      writeFileSync(join(imagesDir, 'logo.png'), 'fake-image-data');

      const site = new Site(testSiteDir);
      const builder = new Builder(site);
      await builder.build();

      // Check that static_files were collected
      expect(site.static_files.length).toBe(3);
      
      // Check that static files were copied
      expect(existsSync(join(destDir, 'assets/style.css'))).toBe(true);
      expect(existsSync(join(destDir, 'assets/script.js'))).toBe(true);
      expect(existsSync(join(destDir, 'assets/images/logo.png'))).toBe(true);
    });

    it('should not include markdown/HTML files in static_files', async () => {
      // Create markdown and static files
      writeFileSync(
        join(testSiteDir, 'index.md'),
        '---\ntitle: Home\n---\nContent'
      );
      writeFileSync(join(testSiteDir, 'style.css'), 'body { margin: 0; }');

      const site = new Site(testSiteDir);
      await site.read();

      // Only CSS should be in static_files
      expect(site.static_files.length).toBe(1);
      expect(site.static_files[0]?.name).toBe('style.css');
    });

    it('should not include SASS/SCSS files in static_files', async () => {
      // Create SASS and static files
      const cssDir = join(testSiteDir, 'css');
      mkdirSync(cssDir);
      writeFileSync(
        join(cssDir, 'main.scss'),
        '---\n---\nbody { color: red; }'
      );
      writeFileSync(join(testSiteDir, 'app.js'), 'console.log("hello");');

      const site = new Site(testSiteDir);
      await site.read();

      // Only JS should be in static_files
      expect(site.static_files.length).toBe(1);
      expect(site.static_files[0]?.name).toBe('app.js');
    });
  });
});
