import { Site, SiteConfig } from '../Site';
import { DocumentType } from '../Document';
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
  });

  describe('read method', () => {
    it('should read pages from the site directory', async () => {
      // Create test pages
      writeFileSync(
        join(testSiteDir, 'index.md'),
        '---\ntitle: Home\n---\nHome page'
      );
      writeFileSync(
        join(testSiteDir, 'about.md'),
        '---\ntitle: About\n---\nAbout page'
      );

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
      writeFileSync(
        join(recipesDir, 'apple-pie.md'),
        '---\ntitle: Apple Pie\n---\nRecipe'
      );

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
  });
});
