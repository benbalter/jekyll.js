import { Renderer } from '../Renderer';
import { Site } from '../Site';
import { Document, DocumentType } from '../Document';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';

// Mock the markdown module to avoid ESM import issues in Jest
jest.mock('../markdown', () => ({
  processMarkdown: jest.fn(async (input: string) => {
    // Simple markdown-to-HTML conversion for testing
    return input
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(?!<[h])/gm, '<p>')
      .replace(/$/gm, '</p>')
      .replace(/<p><\/p>/g, '')
      .replace(/<p>(<h\d>)/g, '$1')
      .replace(/(<\/h\d>)<\/p>/g, '$1');
  }),
  processMarkdownSync: jest.fn((_input: string) => {
    throw new Error('processMarkdownSync is not supported. Use processMarkdown instead.');
  }),
}));

describe('Renderer', () => {
  const testDir = join(__dirname, '../../../../tmp/test-renderer');
  let site: Site;

  beforeEach(() => {
    // Create test directory structure
    mkdirSync(testDir, { recursive: true });
    mkdirSync(join(testDir, '_layouts'), { recursive: true });
    mkdirSync(join(testDir, '_includes'), { recursive: true });
  });

  afterEach(() => {
    // Clean up
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('constructor', () => {
    it('should create a renderer instance', () => {
      site = new Site(testDir);
      const renderer = new Renderer(site);
      expect(renderer).toBeDefined();
      expect(renderer.getLiquid()).toBeDefined();
    });
  });

  describe('render', () => {
    it('should render a simple template', async () => {
      site = new Site(testDir);
      const renderer = new Renderer(site);
      const result = await renderer.render('Hello {{ name }}!', { name: 'World' });
      expect(result).toBe('Hello World!');
    });

    it('should render with Liquid control flow', async () => {
      site = new Site(testDir);
      const renderer = new Renderer(site);
      const template = '{% if show %}Visible{% endif %}';
      const result1 = await renderer.render(template, { show: true });
      const result2 = await renderer.render(template, { show: false });
      expect(result1).toBe('Visible');
      expect(result2).toBe('');
    });

    it('should render with loops', async () => {
      site = new Site(testDir);
      const renderer = new Renderer(site);
      const template = '{% for item in items %}{{ item }}{% endfor %}';
      const result = await renderer.render(template, { items: ['a', 'b', 'c'] });
      expect(result).toBe('abc');
    });
  });

  describe('Jekyll filters', () => {
    beforeEach(() => {
      site = new Site(testDir, { url: 'https://example.com', baseurl: '/blog' });
    });

    it('should support date_to_xmlschema filter', async () => {
      const renderer = new Renderer(site);
      const template = '{{ date | date_to_xmlschema }}';
      const result = await renderer.render(template, { date: '2024-01-15' });
      expect(result).toContain('2024-01-15');
      expect(result).toMatch(/T\d{2}:\d{2}:\d{2}/);
    });

    it('should support date_to_string filter', async () => {
      const renderer = new Renderer(site);
      const template = '{{ date | date_to_string }}';
      const result = await renderer.render(template, { date: '2024-01-15' });
      expect(result).toMatch(/15 Jan 2024/);
    });

    it('should handle invalid dates gracefully in date filters', async () => {
      const renderer = new Renderer(site);
      
      // Test invalid string date
      const template1 = '{{ date | date_to_xmlschema }}';
      const result1 = await renderer.render(template1, { date: 'not-a-date' });
      expect(result1).toBe('');
      
      // Test invalid object
      const template2 = '{{ date | date_to_string }}';
      const result2 = await renderer.render(template2, { date: { invalid: 'object' } });
      expect(result2).toBe('');
      
      // Test null (already handled by !date check)
      const template3 = '{{ date | date_to_rfc822 }}';
      const result3 = await renderer.render(template3, { date: null });
      expect(result3).toBe('');
    });

    it('should support relative_url filter', async () => {
      const renderer = new Renderer(site);
      const template = '{{ "/assets/style.css" | relative_url }}';
      const result = await renderer.render(template, {});
      expect(result).toBe('/blog/assets/style.css');
    });

    it('should support absolute_url filter', async () => {
      const renderer = new Renderer(site);
      const template = '{{ "/about" | absolute_url }}';
      const result = await renderer.render(template, {});
      expect(result).toBe('https://example.com/blog/about');
    });

    it('should support where filter', async () => {
      const renderer = new Renderer(site);
      const template = '{% assign filtered = items | where: "active", true %}{{ filtered.size }}';
      const items = [
        { name: 'a', active: true },
        { name: 'b', active: false },
        { name: 'c', active: true },
      ];
      const result = await renderer.render(template, { items });
      expect(result).toBe('2');
    });

    it('should support group_by filter', async () => {
      const renderer = new Renderer(site);
      const template = '{% assign groups = items | group_by: "type" %}{{ groups.size }}';
      const items = [
        { name: 'a', type: 'fruit' },
        { name: 'b', type: 'vegetable' },
        { name: 'c', type: 'fruit' },
      ];
      const result = await renderer.render(template, { items });
      expect(result).toBe('2');
    });

    it('should support xml_escape filter', async () => {
      const renderer = new Renderer(site);
      const template = '{{ text | xml_escape }}';
      const result = await renderer.render(template, { text: '<tag>content & "quotes"</tag>' });
      expect(result).toBe('&lt;tag&gt;content &amp; &quot;quotes&quot;&lt;/tag&gt;');
    });

    it('should support cgi_escape filter', async () => {
      const renderer = new Renderer(site);
      const template = '{{ text | cgi_escape }}';
      const result = await renderer.render(template, { text: 'hello world & stuff' });
      expect(result).toContain('hello%20world');
    });

    it('should support uri_escape filter', async () => {
      const renderer = new Renderer(site);
      const template = '{{ text | uri_escape }}';
      const result = await renderer.render(template, { text: 'hello world' });
      expect(result).toContain('hello%20world');
    });

    it('should support number_of_words filter', async () => {
      const renderer = new Renderer(site);
      const template = '{{ text | number_of_words }}';
      const result = await renderer.render(template, { text: 'one two three four' });
      expect(result).toBe('4');
    });

    it('should support array_to_sentence_string filter', async () => {
      const renderer = new Renderer(site);
      const template = '{{ items | array_to_sentence_string }}';
      const result = await renderer.render(template, { items: ['apple', 'banana', 'cherry'] });
      expect(result).toBe('apple, banana, and cherry');
    });

    it('should support slugify filter', async () => {
      const renderer = new Renderer(site);
      const template = '{{ text | slugify }}';
      const result = await renderer.render(template, { text: 'Hello World!' });
      expect(result).toBe('hello-world');
    });

    it('should support markdownify filter', async () => {
      const renderer = new Renderer(site);
      const template = '{{ text | markdownify }}';
      const result = await renderer.render(template, { text: '# Hello\n\nThis is **bold**' });
      expect(result).toContain('<h1>Hello</h1>');
      expect(result).toContain('<strong>bold</strong>');
    });

    it('should support jsonify filter', async () => {
      const renderer = new Renderer(site);
      const template = '{{ data | jsonify }}';
      const result = await renderer.render(template, { data: { key: 'value' } });
      expect(result).toBe('{"key":"value"}');
    });

    it('should support markdownify filter', async () => {
      const renderer = new Renderer(site);
      const template = '{{ text | markdownify }}';
      const result = await renderer.render(template, { text: '# Hello\n\nThis is **bold** text.' });
      // The mock converts markdown to simple HTML
      expect(result).toContain('<h1>');
      expect(result).toContain('Hello');
      expect(result).toContain('<strong>bold</strong>');
    });
  });

  describe('renderDocument', () => {
    it('should render a document without layout', async () => {
      site = new Site(testDir);
      await site.read();

      const docPath = join(testDir, 'test.md');
      writeFileSync(
        docPath,
        `---
title: Test Page
---
# {{ page.title }}

Hello World!`
      );

      const doc = new Document(docPath, testDir, DocumentType.PAGE);
      const renderer = new Renderer(site);
      const result = await renderer.renderDocument(doc);

      // Markdown should be converted to HTML
      expect(result).toContain('<h1>Test Page</h1>');
      expect(result).toContain('Hello World!');
    });

    it('should render a document with layout', async () => {
      // Create layout
      writeFileSync(
        join(testDir, '_layouts', 'default.html'),
        `<!DOCTYPE html>
<html>
<head><title>{{ page.title }}</title></head>
<body>{{ content }}</body>
</html>`
      );

      // Create document
      const docPath = join(testDir, 'test.md');
      writeFileSync(
        docPath,
        `---
title: Test Page
layout: default
---
<h1>{{ page.title }}</h1>
<p>Content here</p>`
      );

      site = new Site(testDir);
      await site.read();

      const doc = new Document(docPath, testDir, DocumentType.PAGE);
      const renderer = new Renderer(site);
      const result = await renderer.renderDocument(doc);

      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('<title>Test Page</title>');
      expect(result).toContain('<h1>Test Page</h1>');
      expect(result).toContain('<p>Content here</p>');
    });

    it('should render with nested layouts', async () => {
      // Create base layout
      writeFileSync(
        join(testDir, '_layouts', 'base.html'),
        `<!DOCTYPE html>
<html>{{ content }}</html>`
      );

      // Create child layout
      writeFileSync(
        join(testDir, '_layouts', 'default.html'),
        `---
layout: base
---
<body>{{ content }}</body>`
      );

      // Create document
      const docPath = join(testDir, 'test.md');
      writeFileSync(
        docPath,
        `---
title: Test Page
layout: default
---
<h1>Hello</h1>`
      );

      site = new Site(testDir);
      await site.read();

      const doc = new Document(docPath, testDir, DocumentType.PAGE);
      const renderer = new Renderer(site);
      const result = await renderer.renderDocument(doc);

      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('<body>');
      expect(result).toContain('<h1>Hello</h1>');
    });

    it('should have access to site data in templates', async () => {
      site = new Site(testDir, { title: 'My Site' });
      await site.read();

      const docPath = join(testDir, 'test.md');
      writeFileSync(
        docPath,
        `---
title: Test Page
---
Site: {{ site.config.title }}`
      );

      const doc = new Document(docPath, testDir, DocumentType.PAGE);
      const renderer = new Renderer(site);
      const result = await renderer.renderDocument(doc);

      expect(result).toContain('Site: My Site');
    });

    it('should have access to data files in templates', async () => {
      // Create data directory and files
      const dataDir = join(testDir, '_data');
      mkdirSync(dataDir, { recursive: true });
      writeFileSync(dataDir + '/author.yml', 'name: John Doe\nemail: john@example.com');
      writeFileSync(dataDir + '/settings.json', '{"theme": "dark", "version": "1.0"}');

      site = new Site(testDir);
      await site.read();

      const docPath = join(testDir, 'test.md');
      writeFileSync(
        docPath,
        `---
title: Test Page
---
Author: {{ site.data.author.name }}
Email: {{ site.data.author.email }}
Theme: {{ site.data.settings.theme }}
Version: {{ site.data.settings.version }}`
      );

      const doc = new Document(docPath, testDir, DocumentType.PAGE);
      const renderer = new Renderer(site);
      const result = await renderer.renderDocument(doc);

      expect(result).toContain('Author: John Doe');
      expect(result).toContain('Email: john@example.com');
      expect(result).toContain('Theme: dark');
      expect(result).toContain('Version: 1.0');
    });

    it('should have access to nested data files in templates', async () => {
      // Create nested data directory structure
      const dataDir = join(testDir, '_data');
      const teamDir = join(dataDir, 'team');
      mkdirSync(teamDir, { recursive: true });
      writeFileSync(teamDir + '/developers.yml', 'lead: Alice\ncount: 5');

      site = new Site(testDir);
      await site.read();

      const docPath = join(testDir, 'test.md');
      writeFileSync(
        docPath,
        `---
title: Test Page
---
Team Lead: {{ site.data.team.developers.lead }}
Team Size: {{ site.data.team.developers.count }}`
      );

      const doc = new Document(docPath, testDir, DocumentType.PAGE);
      const renderer = new Renderer(site);
      const result = await renderer.renderDocument(doc);

      expect(result).toContain('Team Lead: Alice');
      expect(result).toContain('Team Size: 5');
    });
  });

  describe('custom filters and tags', () => {
    it('should allow registering custom filters', async () => {
      site = new Site(testDir);
      const renderer = new Renderer(site);

      renderer.registerFilter('reverse', (str: string) => {
        return str.split('').reverse().join('');
      });

      const result = await renderer.render('{{ text | reverse }}', { text: 'hello' });
      expect(result).toBe('olleh');
    });

    it('should expose liquid instance for advanced usage', () => {
      site = new Site(testDir);
      const renderer = new Renderer(site);
      const liquid = renderer.getLiquid();

      expect(liquid).toBeDefined();
      expect(typeof liquid.parseAndRender).toBe('function');
    });
  });

  describe('edge cases', () => {
    it('should handle missing layout gracefully', async () => {
      site = new Site(testDir);
      await site.read();

      const docPath = join(testDir, 'test.md');
      writeFileSync(
        docPath,
        `---
title: Test Page
layout: nonexistent
---
Content`
      );

      const doc = new Document(docPath, testDir, DocumentType.PAGE);
      const renderer = new Renderer(site);
      const result = await renderer.renderDocument(doc);

      // Should render content even without layout (markdown gets converted to HTML)
      expect(result).toContain('Content');
    });

    it('should handle empty templates', async () => {
      site = new Site(testDir);
      const renderer = new Renderer(site);
      const result = await renderer.render('', {});
      expect(result).toBe('');
    });

    it('should handle undefined context values', async () => {
      site = new Site(testDir);
      const renderer = new Renderer(site);
      const result = await renderer.render('Hello {{ name }}!', {});
      expect(result).toBe('Hello !');
    });

    it('should detect and prevent circular layout references', async () => {
      // Create circular layouts: layout-a -> layout-b -> layout-a
      writeFileSync(
        join(testDir, '_layouts', 'layout-a.html'),
        `---
layout: layout-b
---
Layout A: {{ content }}`
      );

      writeFileSync(
        join(testDir, '_layouts', 'layout-b.html'),
        `---
layout: layout-a
---
Layout B: {{ content }}`
      );

      const docPath = join(testDir, 'test.md');
      writeFileSync(
        docPath,
        `---
title: Test Page
layout: layout-a
---
Content`
      );

      site = new Site(testDir);
      await site.read();

      const doc = new Document(docPath, testDir, DocumentType.PAGE);
      const renderer = new Renderer(site);

      await expect(renderer.renderDocument(doc)).rejects.toThrow('Circular layout reference detected');
    });
  });

  describe('Jekyll tags', () => {
    beforeEach(() => {
      site = new Site(testDir);
    });

    it('should support raw tag (liquidjs built-in)', async () => {
      const renderer = new Renderer(site);
      const template = '{% raw %}{{ this should not be processed }}{% endraw %}';
      const result = await renderer.render(template, {});
      expect(result).toBe('{{ this should not be processed }}');
    });

    it('should support include_relative tag', async () => {
      // Create a test file to include
      const includeDir = join(testDir, 'includes-test');
      mkdirSync(includeDir, { recursive: true });
      writeFileSync(
        join(includeDir, 'relative-include.md'),
        'This is relative content: {{ message }}'
      );

      // Create main page that uses include_relative
      const pagePath = join(includeDir, 'page.md');
      writeFileSync(
        pagePath,
        `---
title: Test Page
---
Main content
{% include_relative relative-include.md %}`
      );

      await site.read();

      const doc = new Document(pagePath, testDir, DocumentType.PAGE);
      const renderer = new Renderer(site);
      
      // Render with context
      const context = {
        page: {
          ...doc.data,
          path: doc.relativePath,
        },
        site: {
          source: testDir,
        },
        message: 'Hello World',
      };
      
      const result = await renderer.render(doc.content, context);
      expect(result).toContain('Main content');
      expect(result).toContain('This is relative content: Hello World');
    });

    it('should prevent directory traversal in include_relative tag', async () => {
      // Create a file outside the test directory that should not be accessible
      const outsideDir = join(testDir, '../outside');
      mkdirSync(outsideDir, { recursive: true });
      writeFileSync(join(outsideDir, 'secret.txt'), 'Secret content');

      // Create a page that tries to use directory traversal
      const pagePath = join(testDir, 'malicious.md');
      writeFileSync(
        pagePath,
        `---
title: Malicious Page
---
{% include_relative ../outside/secret.txt %}`
      );

      await site.read();

      const doc = new Document(pagePath, testDir, DocumentType.PAGE);
      const renderer = new Renderer(site);
      
      const context = {
        page: {
          ...doc.data,
          path: doc.relativePath,
        },
        site: {
          source: testDir,
        },
      };
      
      // Should throw an error about path being outside source directory
      await expect(renderer.render(doc.content, context)).rejects.toThrow(
        /resolves outside the site source directory/
      );

      // Clean up
      rmSync(outsideDir, { recursive: true, force: true });
    });
  });
});
