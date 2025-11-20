import { Renderer } from '../Renderer';
import { Site } from '../Site';
import { Document, DocumentType } from '../Document';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Renderer', () => {
  const testDir = join(tmpdir(), 'renderer-test');

  beforeEach(() => {
    // Create test directory structure
    mkdirSync(testDir, { recursive: true });
    mkdirSync(join(testDir, '_layouts'), { recursive: true });
    mkdirSync(join(testDir, '_includes'), { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('renderDocument', () => {
    it('should render simple content without layout', async () => {
      const file = join(testDir, 'test.md');
      writeFileSync(file, '---\ntitle: Test\n---\nHello World');

      const site = new Site(testDir);
      await site.read();

      const doc = new Document(file, testDir, DocumentType.PAGE);
      const renderer = new Renderer(site);

      const result = await renderer.renderDocument(doc);
      expect(result).toBe('Hello World');
    });

    it('should render Liquid variables', async () => {
      const file = join(testDir, 'test.md');
      writeFileSync(file, '---\ntitle: Test Page\n---\nTitle: {{ page.title }}');

      const site = new Site(testDir);
      await site.read();

      const doc = new Document(file, testDir, DocumentType.PAGE);
      const renderer = new Renderer(site);

      const result = await renderer.renderDocument(doc);
      expect(result).toBe('Title: Test Page');
    });

    it('should apply layout', async () => {
      const layoutFile = join(testDir, '_layouts', 'default.html');
      writeFileSync(layoutFile, '<html><body>{{ content }}</body></html>');

      const file = join(testDir, 'test.md');
      writeFileSync(file, '---\ntitle: Test\nlayout: default\n---\nHello World');

      const site = new Site(testDir);
      await site.read();

      const doc = new Document(file, testDir, DocumentType.PAGE);
      const renderer = new Renderer(site);

      const result = await renderer.renderDocument(doc);
      expect(result).toBe('<html><body>Hello World</body></html>');
    });

    it('should apply nested layouts', async () => {
      const baseLayout = join(testDir, '_layouts', 'base.html');
      writeFileSync(baseLayout, '<html>{{ content }}</html>');

      const pageLayout = join(testDir, '_layouts', 'page.html');
      writeFileSync(pageLayout, '---\nlayout: base\n---\n<body>{{ content }}</body>');

      const file = join(testDir, 'test.md');
      writeFileSync(file, '---\ntitle: Test\nlayout: page\n---\nHello World');

      const site = new Site(testDir);
      await site.read();

      const doc = new Document(file, testDir, DocumentType.PAGE);
      const renderer = new Renderer(site);

      const result = await renderer.renderDocument(doc);
      expect(result).toBe('<html><body>Hello World</body></html>');
    });

    it('should have access to site variables', async () => {
      const file = join(testDir, 'test.md');
      writeFileSync(file, '---\ntitle: Test\n---\nTitle: {{ site.title }}');

      const site = new Site(testDir, { title: 'My Site' });
      await site.read();

      const doc = new Document(file, testDir, DocumentType.PAGE);
      const renderer = new Renderer(site);

      const result = await renderer.renderDocument(doc);
      expect(result).toBe('Title: My Site');
    });

    it('should throw error for missing layout', async () => {
      const file = join(testDir, 'test.md');
      writeFileSync(file, '---\ntitle: Test\nlayout: nonexistent\n---\nContent');

      const site = new Site(testDir);
      await site.read();

      const doc = new Document(file, testDir, DocumentType.PAGE);
      const renderer = new Renderer(site);

      await expect(renderer.renderDocument(doc)).rejects.toThrow(
        /Layout "nonexistent" not found/
      );
    });
  });

  describe('filters', () => {
    it('should apply relative_url filter', async () => {
      const file = join(testDir, 'test.md');
      writeFileSync(file, '---\n---\n{{ "/about" | relative_url }}');

      const site = new Site(testDir, { baseurl: '/blog' });
      await site.read();

      const doc = new Document(file, testDir, DocumentType.PAGE);
      const renderer = new Renderer(site);

      const result = await renderer.renderDocument(doc);
      expect(result).toBe('/blog/about');
    });

    it('should apply absolute_url filter', async () => {
      const file = join(testDir, 'test.md');
      writeFileSync(file, '---\n---\n{{ "/about" | absolute_url }}');

      const site = new Site(testDir, { url: 'https://example.com', baseurl: '/blog' });
      await site.read();

      const doc = new Document(file, testDir, DocumentType.PAGE);
      const renderer = new Renderer(site);

      const result = await renderer.renderDocument(doc);
      expect(result).toBe('https://example.com/blog/about');
    });

    it('should apply slugify filter', async () => {
      const file = join(testDir, 'test.md');
      writeFileSync(file, '---\n---\n{{ "Hello World!" | slugify }}');

      const site = new Site(testDir);
      await site.read();

      const doc = new Document(file, testDir, DocumentType.PAGE);
      const renderer = new Renderer(site);

      const result = await renderer.renderDocument(doc);
      expect(result).toBe('hello-world');
    });

    it('should apply date filters', async () => {
      const file = join(testDir, '2024-01-15-test.md');
      writeFileSync(
        file,
        '---\ndate: 2024-01-15\n---\n{{ page.date | date_to_xmlschema }}'
      );

      const site = new Site(testDir);
      await site.read();

      const doc = new Document(file, testDir, DocumentType.POST);
      const renderer = new Renderer(site);

      const result = await renderer.renderDocument(doc);
      expect(result).toContain('2024-01-15');
    });

    it('should apply xml_escape filter', async () => {
      const file = join(testDir, 'test.md');
      writeFileSync(file, '---\n---\n{{ "<div>Hello</div>" | xml_escape }}');

      const site = new Site(testDir);
      await site.read();

      const doc = new Document(file, testDir, DocumentType.PAGE);
      const renderer = new Renderer(site);

      const result = await renderer.renderDocument(doc);
      expect(result).toBe('&lt;div&gt;Hello&lt;/div&gt;');
    });

    it('should apply where filter', async () => {
      const postFile = join(testDir, '_posts', '2024-01-15-test.md');
      mkdirSync(join(testDir, '_posts'), { recursive: true });
      writeFileSync(postFile, '---\ntitle: Test\ncategory: tech\n---\nContent');

      const file = join(testDir, 'test.md');
      writeFileSync(
        file,
        '---\n---\n{% assign tech_posts = site.posts | where: "category", "tech" %}{{ tech_posts.size }}'
      );

      const site = new Site(testDir);
      await site.read();

      const doc = new Document(file, testDir, DocumentType.PAGE);
      const renderer = new Renderer(site);

      const result = await renderer.renderDocument(doc);
      expect(result).toContain('1');
    });
  });
});
