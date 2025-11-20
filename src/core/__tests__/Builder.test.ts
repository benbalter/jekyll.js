import { Builder, BuilderOptions } from '../Builder';
import { Site } from '../Site';
import { mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

describe('Builder', () => {
  const testSiteDir = join(__dirname, '../../../../tmp/test-builder');
  const destDir = join(testSiteDir, '_site');

  beforeEach(() => {
    // Clean up and create fresh test site directory
    if (rmSync) {
      rmSync(testSiteDir, { recursive: true, force: true });
    }
    mkdirSync(testSiteDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    if (rmSync) {
      rmSync(testSiteDir, { recursive: true, force: true });
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
      rmSync(destDir, { recursive: true, force: true });

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
      rmSync(destDir, { recursive: true, force: true });

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
});
