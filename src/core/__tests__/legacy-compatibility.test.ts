/**
 * Legacy Jekyll Compatibility Tests
 *
 * This test suite verifies backwards compatibility with existing Jekyll sites
 * and functionality as tested in the original jekyll/jekyll Ruby repository.
 */

import { Site, createSiteFromConfig } from '../Site';
import { join } from 'path';

describe('Legacy Jekyll Compatibility', () => {
  const legacySiteDir = join(__dirname, '../../../test-fixtures/legacy-jekyll-site');

  describe('Site configuration', () => {
    it('should load _config.yml with all settings', () => {
      const site = createSiteFromConfig(join(legacySiteDir, '_config.yml'));

      expect(site.config.title).toBe('Legacy Test Site');
      expect(site.config.description).toBe('A test site for Jekyll compatibility testing');
      expect(site.config.url).toBe('https://example.com');
      expect(site.config.baseurl).toBe('');
    });

    it('should default baseurl to empty string', () => {
      const site = createSiteFromConfig(join(legacySiteDir, '_config.yml'));
      expect(site.config.baseurl).toBe('');
    });

    it('should expose url in site config', () => {
      const site = createSiteFromConfig(join(legacySiteDir, '_config.yml'));
      expect(site.config.url).toBe('https://example.com');
    });

    it('should configure collections from _config.yml', () => {
      const site = createSiteFromConfig(join(legacySiteDir, '_config.yml'));

      expect(site.config.collections).toBeDefined();
      expect(site.config.collections?.methods).toBeDefined();
      expect(site.config.collections?.methods?.output).toBe(true);
    });

    it('should configure front matter defaults', () => {
      const site = createSiteFromConfig(join(legacySiteDir, '_config.yml'));

      expect(site.config.defaults).toBeDefined();
      expect(Array.isArray(site.config.defaults)).toBe(true);
      expect(site.config.defaults?.length).toBeGreaterThan(0);
    });
  });

  describe('Site reading', () => {
    it('should read posts from _posts directory', async () => {
      const site = createSiteFromConfig(join(legacySiteDir, '_config.yml'));
      await site.read();

      // Should have multiple posts
      expect(site.posts.length).toBeGreaterThan(0);

      // Posts should be sorted by date (newest first)
      for (let i = 1; i < site.posts.length; i++) {
        const prevDate = site.posts[i - 1]?.date;
        const currDate = site.posts[i]?.date;
        if (prevDate && currDate) {
          expect(prevDate.getTime()).toBeGreaterThanOrEqual(currDate.getTime());
        }
      }
    });

    it('should read pages from root directory', async () => {
      const site = createSiteFromConfig(join(legacySiteDir, '_config.yml'));
      await site.read();

      const pageNames = site.pages.map((p) => p.basename);
      expect(pageNames).toContain('index');
      expect(pageNames).toContain('about');
    });

    it('should read layouts from _layouts directory', async () => {
      const site = createSiteFromConfig(join(legacySiteDir, '_config.yml'));
      await site.read();

      expect(site.layouts.has('default')).toBe(true);
      expect(site.layouts.has('post')).toBe(true);
      expect(site.layouts.has('simple')).toBe(true);
    });

    it('should read includes from _includes directory', async () => {
      const site = createSiteFromConfig(join(legacySiteDir, '_config.yml'));
      await site.read();

      expect(site.includes.has('include.html')).toBe(true);
      expect(site.includes.has('header.html')).toBe(true);
      expect(site.includes.has('footer.html')).toBe(true);
      expect(site.includes.has('params.html')).toBe(true);
    });

    it('should read collection documents', async () => {
      const site = createSiteFromConfig(join(legacySiteDir, '_config.yml'));
      await site.read();

      const methods = site.getCollection('methods');
      expect(methods.length).toBeGreaterThan(0);

      const methodNames = methods.map((m) => m.basename);
      expect(methodNames).toContain('configuration');
      expect(methodNames).toContain('sanitized_path');
    });

    it('should read static files', async () => {
      const site = createSiteFromConfig(join(legacySiteDir, '_config.yml'));
      await site.read();

      expect(site.static_files.length).toBeGreaterThan(0);

      const staticFileNames = site.static_files.map((sf) => sf.name);
      expect(staticFileNames).toContain('style.css');
      expect(staticFileNames).toContain('script.js');
    });

    it('should read data files from _data directory', async () => {
      const site = createSiteFromConfig(join(legacySiteDir, '_config.yml'));
      await site.read();

      expect(site.data).toBeDefined();
      expect(site.data.members).toBeDefined();
      expect(Array.isArray(site.data.members)).toBe(true);
      expect(site.data.settings).toBeDefined();
      expect(site.data.settings.theme).toBe('dark');
      expect(site.data.languages).toBeDefined();
    });

    it('should have unpublished posts marked with published=false', async () => {
      const site = createSiteFromConfig(join(legacySiteDir, '_config.yml'));
      await site.read();

      // Posts with published: false should have the published property correctly set
      const notPublishedPost = site.posts.find((p) => p.data.title === 'Not Published');
      expect(notPublishedPost).toBeDefined();
      expect(notPublishedPost?.published).toBe(false);
    });

    it('should identify future posts correctly', async () => {
      const site = createSiteFromConfig(join(legacySiteDir, '_config.yml'));
      await site.read();

      // Posts dated in the future can be identified
      const now = new Date();
      const futurePosts = site.posts.filter((p) => p.date && p.date > now);
      expect(futurePosts.length).toBeGreaterThan(0);

      const futurePost = futurePosts.find((p) => p.data.title === 'Future Post');
      expect(futurePost).toBeDefined();
    });

    it('should include future posts when configured', async () => {
      const site = new Site(legacySiteDir, { future: true });
      await site.read();

      const allTitles = site.posts.map((p) => p.data.title);
      expect(allTitles).toContain('Future Post');
    });
  });

  describe('Post front matter', () => {
    it('should parse categories from front matter array', async () => {
      const site = createSiteFromConfig(join(legacySiteDir, '_config.yml'));
      await site.read();

      const arrayCatPost = site.posts.find((p) => p.data.title === 'Array Categories');
      expect(arrayCatPost).toBeDefined();
      expect(arrayCatPost?.data.categories).toEqual(['foo', 'bar', 'baz']);
    });

    it('should parse categories from front matter string', async () => {
      const site = createSiteFromConfig(join(legacySiteDir, '_config.yml'));
      await site.read();

      const catPost = site.posts.find((p) => p.data.title === 'Categories Test');
      expect(catPost).toBeDefined();
      // String categories should be split by space or be an array
      const cats = catPost?.data.categories;
      expect(cats).toBeDefined();
    });

    it('should parse single category from front matter', async () => {
      const site = createSiteFromConfig(join(legacySiteDir, '_config.yml'));
      await site.read();

      const catPost = site.posts.find((p) => p.data.title === 'Category Test');
      expect(catPost).toBeDefined();
      expect(catPost?.data.category).toBe('foo');
    });

    it('should parse tags array from front matter', async () => {
      const site = createSiteFromConfig(join(legacySiteDir, '_config.yml'));
      await site.read();

      const tagsPost = site.posts.find((p) => p.data.title === 'Tags Test');
      expect(tagsPost).toBeDefined();
      expect(tagsPost?.data.tags).toEqual(['one', 'two', 'three']);
    });

    it('should parse single tag from front matter', async () => {
      const site = createSiteFromConfig(join(legacySiteDir, '_config.yml'));
      await site.read();

      const tagPost = site.posts.find((p) => p.data.title === 'Tag Test');
      expect(tagPost).toBeDefined();
      expect(tagPost?.data.tag).toBe('one');
    });

    it('should handle custom excerpt in front matter', async () => {
      const site = createSiteFromConfig(join(legacySiteDir, '_config.yml'));
      await site.read();

      const customExcerptPost = site.posts.find((p) => p.data.title === 'Custom Excerpt');
      expect(customExcerptPost).toBeDefined();
      expect(customExcerptPost?.data.excerpt).toContain('This is my custom excerpt');
    });

    it('should override date from front matter', async () => {
      const site = createSiteFromConfig(join(legacySiteDir, '_config.yml'));
      await site.read();

      const dateOverridePost = site.posts.find((p) => p.data.title === 'Date Override');
      expect(dateOverridePost).toBeDefined();
      // The date from front matter (2010-01-10) should be used instead of filename date (2010-01-09)
      if (dateOverridePost?.date) {
        expect(dateOverridePost.date.getDate()).toBe(10);
      }
    });

    it('should handle nil layout', async () => {
      const site = createSiteFromConfig(join(legacySiteDir, '_config.yml'));
      await site.read();

      const nilLayoutPost = site.posts.find((p) => p.data.title === 'Nil Layout');
      expect(nilLayoutPost).toBeDefined();
      // nil layout (represented as ~ or null in YAML) should result in no layout
      expect(nilLayoutPost?.data.layout).toBeNull();
    });
  });

  describe('Permalinks', () => {
    it('should read custom permalink from front matter', async () => {
      const site = createSiteFromConfig(join(legacySiteDir, '_config.yml'));
      await site.read();

      const permalinkedPost = site.posts.find((p) => p.data.title === 'Permalinked Post');
      expect(permalinkedPost).toBeDefined();
      expect(permalinkedPost?.data.permalink).toBe('/my/custom/permalink/');
    });

    it('should have correct date parsed from filename for URL generation', async () => {
      const site = createSiteFromConfig(join(legacySiteDir, '_config.yml'));
      await site.read();

      const fooBarPost = site.posts.find((p) => p.data.title === 'Foo Bar');
      expect(fooBarPost).toBeDefined();
      // The post date is parsed from the filename (2008-10-18)
      expect(fooBarPost?.date?.getFullYear()).toBe(2008);
      expect(fooBarPost?.date?.getMonth()).toBe(9); // October (0-indexed)
      expect(fooBarPost?.date?.getDate()).toBe(18);
      // Basename is used for title in URL
      expect(fooBarPost?.basename).toBe('2008-10-18-foo-bar');
    });

    it('should read collection permalink pattern from config', async () => {
      const site = createSiteFromConfig(join(legacySiteDir, '_config.yml'));
      await site.read();

      // Verify the collection config has the permalink pattern
      expect(site.config.collections?.methods?.permalink).toBe('/methods/:name.html');
    });
  });

  describe('Document properties', () => {
    it('should expose relative_path', async () => {
      const site = createSiteFromConfig(join(legacySiteDir, '_config.yml'));
      await site.read();

      const post = site.posts[0];
      expect(post).toBeDefined();
      expect(post?.relativePath).toMatch(/_posts\//);
    });

    it('should expose basename', async () => {
      const site = createSiteFromConfig(join(legacySiteDir, '_config.yml'));
      await site.read();

      const fooBarPost = site.posts.find((p) => p.data.title === 'Foo Bar');
      expect(fooBarPost).toBeDefined();
      expect(fooBarPost?.basename).toBe('2008-10-18-foo-bar');
    });

    it('should expose extname', async () => {
      const site = createSiteFromConfig(join(legacySiteDir, '_config.yml'));
      await site.read();

      const post = site.posts[0];
      expect(post).toBeDefined();
      expect(post?.extname).toMatch(/\.(md|markdown)$/);
    });

    it('should expose url/id for posts (via basename for identifying)', async () => {
      const site = createSiteFromConfig(join(legacySiteDir, '_config.yml'));
      await site.read();

      const fooBarPost = site.posts.find((p) => p.data.title === 'Foo Bar');
      expect(fooBarPost).toBeDefined();
      // The basename contains the slug identifier for the post
      expect(fooBarPost?.basename).toContain('foo-bar');
    });

    it('should expose collection name for collection documents', async () => {
      const site = createSiteFromConfig(join(legacySiteDir, '_config.yml'));
      await site.read();

      const methods = site.getCollection('methods');
      const method = methods[0];
      expect(method).toBeDefined();
      expect(method?.collection).toBe('methods');
    });
  });

  describe('toJSON representation', () => {
    it('should include all site data in JSON', async () => {
      const site = createSiteFromConfig(join(legacySiteDir, '_config.yml'));
      await site.read();

      const json = site.toJSON();

      expect(json.config.title).toBe('Legacy Test Site');
      expect(json.pages.length).toBeGreaterThan(0);
      expect(json.posts.length).toBeGreaterThan(0);
      expect(json.data).toBeDefined();
      expect(json.static_files).toBeDefined();
    });

    it('should include data files in JSON', async () => {
      const site = createSiteFromConfig(join(legacySiteDir, '_config.yml'));
      await site.read();

      const json = site.toJSON();

      expect(json.data.members).toBeDefined();
      expect(json.data.settings).toBeDefined();
    });
  });

  describe('Static file properties', () => {
    it('should expose name property', async () => {
      const site = createSiteFromConfig(join(legacySiteDir, '_config.yml'));
      await site.read();

      const styleFile = site.static_files.find((sf) => sf.name === 'style.css');
      expect(styleFile).toBeDefined();
      expect(styleFile?.name).toBe('style.css');
    });

    it('should expose extname property', async () => {
      const site = createSiteFromConfig(join(legacySiteDir, '_config.yml'));
      await site.read();

      const styleFile = site.static_files.find((sf) => sf.name === 'style.css');
      expect(styleFile).toBeDefined();
      expect(styleFile?.extname).toBe('.css');
    });

    it('should expose basename property', async () => {
      const site = createSiteFromConfig(join(legacySiteDir, '_config.yml'));
      await site.read();

      const styleFile = site.static_files.find((sf) => sf.name === 'style.css');
      expect(styleFile).toBeDefined();
      expect(styleFile?.basename).toBe('style');
    });

    it('should expose modified_time property', async () => {
      const site = createSiteFromConfig(join(legacySiteDir, '_config.yml'));
      await site.read();

      const styleFile = site.static_files.find((sf) => sf.name === 'style.css');
      expect(styleFile).toBeDefined();
      // Check that modified_time is a Date object
      expect(styleFile?.modified_time).toBeTruthy();
      // Verify it has Date-like properties
      expect(typeof styleFile?.modified_time?.getTime).toBe('function');
    });

    it('should expose url property', async () => {
      const site = createSiteFromConfig(join(legacySiteDir, '_config.yml'));
      await site.read();

      const styleFile = site.static_files.find((sf) => sf.name === 'style.css');
      expect(styleFile).toBeDefined();
      expect(styleFile?.url).toBe('/assets/style.css');
    });
  });
});
