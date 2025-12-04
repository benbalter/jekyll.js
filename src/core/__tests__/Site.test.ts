import { Site, SiteConfig, createSiteFromConfig } from '../Site';
import { DocumentType } from '../Document';
import { FileSystemError } from '../../utils/errors';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';

describe('Site', () => {
  const testSiteDir = join(__dirname, '../../../../tmp/test-site');

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
    it('should create a site with default configuration', () => {
      const site = new Site(testSiteDir);

      expect(site.source).toBe(testSiteDir);
      expect(site.destination).toBe(join(testSiteDir, '_site'));
      expect(site.config.exclude).toContain('_site');
      expect(site.config.exclude).toContain('node_modules');
    });

    it('should accept custom configuration', () => {
      const config: SiteConfig = {
        title: 'My Site',
        destination: join(testSiteDir, 'dist'),
        exclude: ['custom-exclude'],
      };

      const site = new Site(testSiteDir, config);

      expect(site.config.title).toBe('My Site');
      expect(site.destination).toBe(join(testSiteDir, 'dist'));
      expect(site.config.exclude).toContain('custom-exclude');
      expect(site.config.exclude).toContain('_site'); // Default excludes are still there
    });

    it('should throw FileSystemError when source directory does not exist', () => {
      const nonExistentDir = join(testSiteDir, 'nonexistent');

      expect(() => new Site(nonExistentDir)).toThrow(FileSystemError);
      expect(() => new Site(nonExistentDir)).toThrow(/Source directory does not exist/);
    });
  });

  describe('createSiteFromConfig', () => {
    it('should create a site from a configuration file', () => {
      const configPath = join(testSiteDir, '_config.yml');
      const configContent = `
title: Test Site from Config
description: A test site
collections:
  recipes:
    output: true
`;
      writeFileSync(configPath, configContent);

      const site = createSiteFromConfig(configPath);

      expect(site.config.title).toBe('Test Site from Config');
      expect(site.config.description).toBe('A test site');
      expect(site.config.collections?.recipes).toBeDefined();
    });

    it('should use defaults when config file does not exist', () => {
      const configPath = join(testSiteDir, 'nonexistent.yml');

      const site = createSiteFromConfig(configPath);

      expect(site.source).toBeDefined();
      expect(site.config.markdown).toBe('kramdown');
    });
  });

  describe('read method', () => {
    it('should read pages from the site directory', async () => {
      // Create test pages
      writeFileSync(join(testSiteDir, 'index.md'), '---\ntitle: Home\n---\nHome page');
      writeFileSync(join(testSiteDir, 'about.md'), '---\ntitle: About\n---\nAbout page');

      const site = new Site(testSiteDir);
      await site.read();

      expect(site.pages).toHaveLength(2);
      expect(site.pages[0]?.type).toBe(DocumentType.PAGE);
      expect(site.pages.some((p) => p.basename === 'index')).toBe(true);
      expect(site.pages.some((p) => p.basename === 'about')).toBe(true);
    });

    it('should read posts from _posts directory', async () => {
      // Create _posts directory and test posts
      const postsDir = join(testSiteDir, '_posts');
      mkdirSync(postsDir);

      writeFileSync(
        join(postsDir, '2023-01-01-first-post.md'),
        '---\ntitle: First Post\n---\nContent'
      );
      writeFileSync(
        join(postsDir, '2023-01-15-second-post.md'),
        '---\ntitle: Second Post\n---\nContent'
      );

      const site = new Site(testSiteDir);
      await site.read();

      expect(site.posts).toHaveLength(2);
      expect(site.posts[0]?.type).toBe(DocumentType.POST);
      // Posts should be sorted by date (newest first)
      expect(site.posts[0]?.basename).toBe('2023-01-15-second-post');
      expect(site.posts[1]?.basename).toBe('2023-01-01-first-post');
    });

    it('should read layouts from _layouts directory', async () => {
      // Create _layouts directory and test layouts
      const layoutsDir = join(testSiteDir, '_layouts');
      mkdirSync(layoutsDir);

      writeFileSync(join(layoutsDir, 'default.html'), '<html>{{ content }}</html>');
      writeFileSync(join(layoutsDir, 'post.html'), '<article>{{ content }}</article>');

      const site = new Site(testSiteDir);
      await site.read();

      expect(site.layouts.size).toBe(2);
      expect(site.layouts.has('default')).toBe(true);
      expect(site.layouts.has('post')).toBe(true);
      expect(site.layouts.get('default')?.type).toBe(DocumentType.LAYOUT);
    });

    it('should read includes from _includes directory', async () => {
      // Create _includes directory and test includes
      const includesDir = join(testSiteDir, '_includes');
      mkdirSync(includesDir);

      writeFileSync(join(includesDir, 'header.html'), '<header>Header</header>');
      writeFileSync(join(includesDir, 'footer.html'), '<footer>Footer</footer>');

      const site = new Site(testSiteDir);
      await site.read();

      expect(site.includes.size).toBe(2);
      expect(site.includes.has('header.html')).toBe(true);
      expect(site.includes.has('footer.html')).toBe(true);
      expect(site.includes.get('header.html')?.type).toBe(DocumentType.INCLUDE);
    });

    it('should read collections when configured', async () => {
      // Create collection directory
      const recipesDir = join(testSiteDir, '_recipes');
      mkdirSync(recipesDir);

      writeFileSync(
        join(recipesDir, 'chocolate-chip.md'),
        '---\ntitle: Chocolate Chip Cookies\n---\nRecipe'
      );
      writeFileSync(join(recipesDir, 'apple-pie.md'), '---\ntitle: Apple Pie\n---\nRecipe');

      const config: SiteConfig = {
        collections: {
          recipes: {
            output: true,
          },
        },
      };

      const site = new Site(testSiteDir, config);
      await site.read();

      expect(site.collections.size).toBe(1);
      expect(site.collections.has('recipes')).toBe(true);

      const recipes = site.collections.get('recipes');
      expect(recipes).toHaveLength(2);
      expect(recipes?.[0]?.type).toBe(DocumentType.COLLECTION);
      expect(recipes?.[0]?.collection).toBe('recipes');
    });

    it('should not include files from excluded directories', async () => {
      // Create some pages and an excluded directory
      writeFileSync(join(testSiteDir, 'index.md'), '---\ntitle: Home\n---\nHome');

      const nodeModulesDir = join(testSiteDir, 'node_modules');
      mkdirSync(nodeModulesDir);
      writeFileSync(join(nodeModulesDir, 'test.md'), 'Should not be included');

      const site = new Site(testSiteDir);
      await site.read();

      expect(site.pages).toHaveLength(1);
      expect(site.pages[0]?.basename).toBe('index');
    });

    it('should handle nested includes', async () => {
      // Create nested includes directory structure
      const includesDir = join(testSiteDir, '_includes');
      const socialDir = join(includesDir, 'social');
      mkdirSync(socialDir, { recursive: true });

      writeFileSync(join(socialDir, 'twitter.html'), '<a>Twitter</a>');

      const site = new Site(testSiteDir);
      await site.read();

      expect(site.includes.size).toBe(1);
      expect(site.includes.has('social/twitter.html')).toBe(true);
    });

    it('should read data files from _data directory', async () => {
      // Create _data directory and test data files
      const dataDir = join(testSiteDir, '_data');
      mkdirSync(dataDir);

      // YAML data file
      writeFileSync(join(dataDir, 'members.yml'), 'name: Alice\nrole: Developer');

      // JSON data file
      writeFileSync(join(dataDir, 'settings.json'), '{"theme": "dark", "lang": "en"}');

      const site = new Site(testSiteDir);
      await site.read();

      expect(site.data).toBeDefined();
      expect(site.data.members).toEqual({ name: 'Alice', role: 'Developer' });
      expect(site.data.settings).toEqual({ theme: 'dark', lang: 'en' });
    });

    it('should read nested data files', async () => {
      // Create nested _data directory structure
      const dataDir = join(testSiteDir, '_data');
      const teamDir = join(dataDir, 'team');
      mkdirSync(teamDir, { recursive: true });

      writeFileSync(join(teamDir, 'developers.yml'), 'lead: Alice\nmembers:\n  - Bob\n  - Carol');

      const site = new Site(testSiteDir);
      await site.read();

      expect(site.data.team).toBeDefined();
      expect(site.data.team.developers).toBeDefined();
      expect(site.data.team.developers.lead).toBe('Alice');
      expect(site.data.team.developers.members).toEqual(['Bob', 'Carol']);
    });

    it('should handle invalid data files gracefully', async () => {
      const dataDir = join(testSiteDir, '_data');
      mkdirSync(dataDir);

      // Invalid YAML
      writeFileSync(join(dataDir, 'invalid.yml'), '{ invalid yaml content [');

      // Valid JSON for comparison
      writeFileSync(join(dataDir, 'valid.json'), '{"key": "value"}');

      const site = new Site(testSiteDir);

      // Should not throw, just warn
      await expect(site.read()).resolves.not.toThrow();

      // Valid data should still be loaded
      expect(site.data.valid).toEqual({ key: 'value' });
      // Invalid data should not be loaded
      expect(site.data.invalid).toBeUndefined();
    });

    it('should support custom data_dir configuration', async () => {
      // Create custom data directory
      const customDataDir = join(testSiteDir, 'custom_data');
      mkdirSync(customDataDir);

      writeFileSync(join(customDataDir, 'info.yml'), 'name: Custom');

      const config: SiteConfig = {
        data_dir: 'custom_data',
      };

      const site = new Site(testSiteDir, config);
      await site.read();

      expect(site.data.info).toEqual({ name: 'Custom' });
    });
  });

  describe('getLayout method', () => {
    it('should retrieve a layout by name', async () => {
      const layoutsDir = join(testSiteDir, '_layouts');
      mkdirSync(layoutsDir);
      writeFileSync(join(layoutsDir, 'post.html'), '<article>{{ content }}</article>');

      const site = new Site(testSiteDir);
      await site.read();

      const layout = site.getLayout('post');
      expect(layout).toBeDefined();
      expect(layout?.basename).toBe('post');
    });

    it('should return undefined for non-existent layout', async () => {
      const site = new Site(testSiteDir);
      await site.read();

      const layout = site.getLayout('nonexistent');
      expect(layout).toBeUndefined();
    });
  });

  describe('getInclude method', () => {
    it('should retrieve an include by path', async () => {
      const includesDir = join(testSiteDir, '_includes');
      mkdirSync(includesDir);
      writeFileSync(join(includesDir, 'header.html'), '<header>Header</header>');

      const site = new Site(testSiteDir);
      await site.read();

      const include = site.getInclude('header.html');
      expect(include).toBeDefined();
      expect(include?.basename).toBe('header');
    });

    it('should return undefined for non-existent include', async () => {
      const site = new Site(testSiteDir);
      await site.read();

      const include = site.getInclude('nonexistent.html');
      expect(include).toBeUndefined();
    });
  });

  describe('getCollection method', () => {
    it('should retrieve documents from a collection', async () => {
      const recipesDir = join(testSiteDir, '_recipes');
      mkdirSync(recipesDir);
      writeFileSync(join(recipesDir, 'cookies.md'), '---\ntitle: Cookies\n---\nRecipe');

      const config: SiteConfig = {
        collections: { recipes: {} },
      };

      const site = new Site(testSiteDir, config);
      await site.read();

      const recipes = site.getCollection('recipes');
      expect(recipes).toHaveLength(1);
      expect(recipes[0]?.basename).toBe('cookies');
    });

    it('should return empty array for non-existent collection', async () => {
      const site = new Site(testSiteDir);
      await site.read();

      const collection = site.getCollection('nonexistent');
      expect(collection).toEqual([]);
    });
  });

  describe('getAllDocuments method', () => {
    it('should return all documents from the site', async () => {
      // Create various documents
      writeFileSync(join(testSiteDir, 'index.md'), '---\ntitle: Home\n---\nHome');

      const postsDir = join(testSiteDir, '_posts');
      mkdirSync(postsDir);
      writeFileSync(join(postsDir, '2023-01-01-post.md'), '---\ntitle: Post\n---\nPost');

      const layoutsDir = join(testSiteDir, '_layouts');
      mkdirSync(layoutsDir);
      writeFileSync(join(layoutsDir, 'default.html'), '<html>{{ content }}</html>');

      const site = new Site(testSiteDir);
      await site.read();

      const allDocs = site.getAllDocuments();
      expect(allDocs.length).toBeGreaterThanOrEqual(3);
      expect(allDocs.some((d) => d.type === DocumentType.PAGE)).toBe(true);
      expect(allDocs.some((d) => d.type === DocumentType.POST)).toBe(true);
      expect(allDocs.some((d) => d.type === DocumentType.LAYOUT)).toBe(true);
    });
  });

  describe('toJSON method', () => {
    it('should return JSON representation of the site', async () => {
      writeFileSync(join(testSiteDir, 'index.md'), '---\ntitle: Home\n---\nHome');

      const site = new Site(testSiteDir, { title: 'Test Site' });
      await site.read();

      const json = site.toJSON();
      expect(json.config.title).toBe('Test Site');
      expect(json.source).toBe(testSiteDir);
      expect(json.pages).toHaveLength(1);
      expect(Array.isArray(json.pages)).toBe(true);
    });

    it('should include data in JSON representation', async () => {
      const dataDir = join(testSiteDir, '_data');
      mkdirSync(dataDir);
      writeFileSync(join(dataDir, 'info.json'), '{"version": "1.0"}');

      const site = new Site(testSiteDir);
      await site.read();

      const json = site.toJSON();
      expect(json.data).toBeDefined();
      expect(json.data.info).toEqual({ version: '1.0' });
    });

    it('should include static_files in JSON representation', async () => {
      const assetsDir = join(testSiteDir, 'assets');
      mkdirSync(assetsDir);
      writeFileSync(join(assetsDir, 'style.css'), 'body { margin: 0; }');

      const site = new Site(testSiteDir);
      await site.read();

      const json = site.toJSON();
      expect(json.static_files).toBeDefined();
      expect(Array.isArray(json.static_files)).toBe(true);
      expect(json.static_files.length).toBeGreaterThan(0);
      expect(json.static_files[0].name).toBe('style.css');
    });
  });

  describe('static_files reading', () => {
    it('should read static files from site directory', async () => {
      // Create static files
      const assetsDir = join(testSiteDir, 'assets');
      mkdirSync(assetsDir);
      writeFileSync(join(assetsDir, 'style.css'), 'body { margin: 0; }');
      writeFileSync(join(assetsDir, 'script.js'), 'console.log("hello");');

      const site = new Site(testSiteDir);
      await site.read();

      expect(site.static_files.length).toBe(2);
      const names = site.static_files.map((sf) => sf.name);
      expect(names).toContain('style.css');
      expect(names).toContain('script.js');
    });

    it('should include correct metadata for static files', async () => {
      writeFileSync(join(testSiteDir, 'favicon.ico'), 'fake-icon-data');

      const site = new Site(testSiteDir);
      await site.read();

      const favicon = site.static_files.find((sf) => sf.name === 'favicon.ico');
      expect(favicon).toBeDefined();
      expect(favicon?.basename).toBe('favicon');
      expect(favicon?.extname).toBe('.ico');
      expect(favicon?.modified_time).toBeDefined();
      expect(favicon?.modified_time.getTime()).toBeGreaterThan(0);
      expect(favicon?.size).toBeGreaterThan(0);
    });

    it('should handle nested static files', async () => {
      const nestedDir = join(testSiteDir, 'assets/images/icons');
      mkdirSync(nestedDir, { recursive: true });
      writeFileSync(join(nestedDir, 'icon.png'), 'fake-icon-data');

      const site = new Site(testSiteDir);
      await site.read();

      const icon = site.static_files.find((sf) => sf.name === 'icon.png');
      expect(icon).toBeDefined();
      expect(icon?.relativePath).toBe('assets/images/icons/icon.png');
      expect(icon?.url).toBe('/assets/images/icons/icon.png');
    });

    it('should not include files from excluded directories', async () => {
      const nodeModulesDir = join(testSiteDir, 'node_modules');
      mkdirSync(nodeModulesDir);
      writeFileSync(join(nodeModulesDir, 'package.json'), '{}');

      writeFileSync(join(testSiteDir, 'app.js'), 'console.log("hello");');

      const site = new Site(testSiteDir);
      await site.read();

      // Only app.js should be in static_files, not node_modules contents
      expect(site.static_files.length).toBe(1);
      expect(site.static_files[0]?.name).toBe('app.js');
    });

    it('should not include files from underscore-prefixed directories', async () => {
      const postsDir = join(testSiteDir, '_posts');
      mkdirSync(postsDir);
      writeFileSync(join(postsDir, '2024-01-01-post.md'), '---\ntitle: Post\n---\nContent');

      writeFileSync(join(testSiteDir, 'style.css'), 'body { margin: 0; }');

      const site = new Site(testSiteDir);
      await site.read();

      // Only style.css should be in static_files
      const staticFileNames = site.static_files.map((sf) => sf.name);
      expect(staticFileNames).toContain('style.css');
      expect(staticFileNames).not.toContain('2024-01-01-post.md');
    });
  });
});
