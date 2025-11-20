import { UrlGenerator } from '../UrlGenerator';
import { Document, DocumentType } from '../Document';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

describe('UrlGenerator', () => {
  const testDir = '/tmp/url-generator-test';

  beforeEach(() => {
    // Create test directory
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('generateUrl', () => {
    describe('for posts', () => {
      it('should generate URL with date style (default)', () => {
        const file = join(testDir, '2024-01-15-test-post.md');
        writeFileSync(file, '---\ntitle: Test Post\n---\nContent');

        const doc = new Document(file, testDir, DocumentType.POST);
        const generator = new UrlGenerator({});

        const url = generator.generateUrl(doc);
        expect(url).toBe('/2024/01/15/test-post.html');
      });

      it('should generate URL with pretty style', () => {
        const file = join(testDir, '2024-01-15-test-post.md');
        writeFileSync(file, '---\ntitle: Test Post\n---\nContent');

        const doc = new Document(file, testDir, DocumentType.POST);
        const generator = new UrlGenerator({ permalink: 'pretty' });

        const url = generator.generateUrl(doc);
        expect(url).toBe('/2024/01/15/test-post/');
      });

      it('should generate URL with ordinal style', () => {
        const file = join(testDir, '2024-01-15-test-post.md');
        writeFileSync(file, '---\ntitle: Test Post\n---\nContent');

        const doc = new Document(file, testDir, DocumentType.POST);
        const generator = new UrlGenerator({ permalink: 'ordinal' });

        const url = generator.generateUrl(doc);
        expect(url).toMatch(/^\/2024\/\d{3}\/test-post\.html$/);
      });

      it('should generate URL with none style', () => {
        const file = join(testDir, '2024-01-15-test-post.md');
        writeFileSync(file, '---\ntitle: Test Post\n---\nContent');

        const doc = new Document(file, testDir, DocumentType.POST);
        const generator = new UrlGenerator({ permalink: 'none' });

        const url = generator.generateUrl(doc);
        expect(url).toBe('/test-post.html');
      });

      it('should use custom permalink from front matter', () => {
        const file = join(testDir, '2024-01-15-test-post.md');
        writeFileSync(file, '---\npermalink: /custom/url.html\n---\nContent');

        const doc = new Document(file, testDir, DocumentType.POST);
        const generator = new UrlGenerator({});

        const url = generator.generateUrl(doc);
        expect(url).toBe('/custom/url.html');
      });

      it('should process permalink patterns', () => {
        const file = join(testDir, '2024-01-15-test-post.md');
        writeFileSync(file, '---\ntitle: Test Post\n---\nContent');

        const doc = new Document(file, testDir, DocumentType.POST);
        const generator = new UrlGenerator({
          permalink: '/:year/:month/:title',
        });

        const url = generator.generateUrl(doc);
        expect(url).toBe('/2024/01/test-post');
      });
    });

    describe('for pages', () => {
      it('should generate URL for page', () => {
        const file = join(testDir, 'about.md');
        writeFileSync(file, '---\ntitle: About\n---\nContent');

        const doc = new Document(file, testDir, DocumentType.PAGE);
        const generator = new UrlGenerator({});

        const url = generator.generateUrl(doc);
        expect(url).toBe('/about.html');
      });

      it('should generate URL for nested page', () => {
        const dir = join(testDir, 'docs');
        mkdirSync(dir, { recursive: true });
        const file = join(dir, 'guide.md');
        writeFileSync(file, '---\ntitle: Guide\n---\nContent');

        const doc = new Document(file, testDir, DocumentType.PAGE);
        const generator = new UrlGenerator({});

        const url = generator.generateUrl(doc);
        expect(url).toBe('/docs/guide.html');
      });

      it('should generate URL for index page', () => {
        const file = join(testDir, 'index.md');
        writeFileSync(file, '---\ntitle: Home\n---\nContent');

        const doc = new Document(file, testDir, DocumentType.PAGE);
        const generator = new UrlGenerator({});

        const url = generator.generateUrl(doc);
        expect(url).toBe('/');
      });

      it('should handle custom permalink for page', () => {
        const file = join(testDir, 'about.md');
        writeFileSync(file, '---\npermalink: /custom-about/\n---\nContent');

        const doc = new Document(file, testDir, DocumentType.PAGE);
        const generator = new UrlGenerator({});

        const url = generator.generateUrl(doc);
        expect(url).toBe('/custom-about/');
      });
    });

    describe('for collections', () => {
      it('should generate URL for collection document', () => {
        const dir = join(testDir, '_recipes');
        mkdirSync(dir, { recursive: true });
        const file = join(dir, 'chocolate-cake.md');
        writeFileSync(file, '---\ntitle: Chocolate Cake\n---\nContent');

        const doc = new Document(file, testDir, DocumentType.COLLECTION, 'recipes');
        const generator = new UrlGenerator({
          collections: {
            recipes: { output: true },
          },
        });

        const url = generator.generateUrl(doc);
        expect(url).toBe('/recipes/chocolate-cake.html');
      });

      it('should use custom permalink from collection config', () => {
        const dir = join(testDir, '_recipes');
        mkdirSync(dir, { recursive: true });
        const file = join(dir, 'chocolate-cake.md');
        writeFileSync(file, '---\ntitle: Chocolate Cake\n---\nContent');

        const doc = new Document(file, testDir, DocumentType.COLLECTION, 'recipes');
        const generator = new UrlGenerator({
          collections: {
            recipes: {
              output: true,
              permalink: '/cooking/:title',
            },
          },
        });

        const url = generator.generateUrl(doc);
        expect(url).toBe('/cooking/chocolate-cake');
      });
    });
  });

  describe('generateOutputPath', () => {
    it('should generate output path for HTML file', () => {
      const file = join(testDir, 'about.md');
      writeFileSync(file, '---\ntitle: About\n---\nContent');

      const doc = new Document(file, testDir, DocumentType.PAGE);
      const generator = new UrlGenerator({});
      doc.url = generator.generateUrl(doc);

      const outputPath = generator.generateOutputPath(doc);
      expect(outputPath).toBe('about.html');
    });

    it('should generate output path for pretty URL', () => {
      const file = join(testDir, '2024-01-15-test-post.md');
      writeFileSync(file, '---\ntitle: Test Post\n---\nContent');

      const doc = new Document(file, testDir, DocumentType.POST);
      const generator = new UrlGenerator({ permalink: 'pretty' });
      doc.url = generator.generateUrl(doc);

      const outputPath = generator.generateOutputPath(doc);
      expect(outputPath).toBe('2024/01/15/test-post/index.html');
    });

    it('should generate output path for root index', () => {
      const file = join(testDir, 'index.md');
      writeFileSync(file, '---\ntitle: Home\n---\nContent');

      const doc = new Document(file, testDir, DocumentType.PAGE);
      const generator = new UrlGenerator({});
      doc.url = generator.generateUrl(doc);

      const outputPath = generator.generateOutputPath(doc);
      expect(outputPath).toBe('index.html');
    });
  });
});
