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

    describe('Array manipulation filters', () => {
      it('should support sort filter', async () => {
        const renderer = new Renderer(site);
        const template = '{{ items | sort | join: "," }}';
        const result = await renderer.render(template, { items: [3, 1, 2] });
        expect(result).toBe('1,2,3');
      });

      it('should support sort filter with property', async () => {
        const renderer = new Renderer(site);
        const items = [
          { name: 'banana', order: 2 },
          { name: 'apple', order: 1 },
          { name: 'cherry', order: 3 },
        ];
        const template = '{% assign sorted = items | sort: "order" %}{{ sorted[0].name }}';
        const result = await renderer.render(template, { items });
        expect(result).toBe('apple');
      });

      it('should support uniq filter', async () => {
        const renderer = new Renderer(site);
        const template = '{{ items | uniq | join: "," }}';
        const result = await renderer.render(template, { items: [1, 2, 2, 3, 1] });
        expect(result).toBe('1,2,3');
      });

      it('should support sample filter for single item', async () => {
        const renderer = new Renderer(site);
        const template = '{{ items | sample }}';
        const items = ['a', 'b', 'c'];
        const result = await renderer.render(template, { items });
        expect(items).toContain(result);
      });

      it('should support sample filter for multiple items', async () => {
        const renderer = new Renderer(site);
        const template = '{% assign samples = items | sample: 2 %}{{ samples.size }}';
        const result = await renderer.render(template, { items: ['a', 'b', 'c', 'd'] });
        expect(result).toBe('2');
      });

      it('should support pop filter', async () => {
        const renderer = new Renderer(site);
        const template = '{{ items | pop | join: "," }}';
        const result = await renderer.render(template, { items: ['a', 'b', 'c'] });
        expect(result).toBe('a,b');
      });

      it('should support pop filter with count', async () => {
        const renderer = new Renderer(site);
        const template = '{{ items | pop: 2 | join: "," }}';
        const result = await renderer.render(template, { items: ['a', 'b', 'c', 'd'] });
        expect(result).toBe('a,b');
      });

      it('should support pop filter with count 0', async () => {
        const renderer = new Renderer(site);
        const template = '{{ items | pop: 0 | join: "," }}';
        const result = await renderer.render(template, { items: ['a', 'b', 'c'] });
        expect(result).toBe('a,b,c');
      });

      it('should support pop filter with negative count', async () => {
        const renderer = new Renderer(site);
        const template = '{{ items | pop: -1 | join: "," }}';
        const result = await renderer.render(template, { items: ['a', 'b', 'c'] });
        expect(result).toBe('a,b,c');
      });

      it('should support push filter', async () => {
        const renderer = new Renderer(site);
        const template = '{{ items | push: "d" | join: "," }}';
        const result = await renderer.render(template, { items: ['a', 'b', 'c'] });
        expect(result).toBe('a,b,c,d');
      });

      it('should support shift filter', async () => {
        const renderer = new Renderer(site);
        const template = '{{ items | shift | join: "," }}';
        const result = await renderer.render(template, { items: ['a', 'b', 'c'] });
        expect(result).toBe('b,c');
      });

      it('should support shift filter with count', async () => {
        const renderer = new Renderer(site);
        const template = '{{ items | shift: 2 | join: "," }}';
        const result = await renderer.render(template, { items: ['a', 'b', 'c', 'd'] });
        expect(result).toBe('c,d');
      });

      it('should support shift filter with negative count', async () => {
        const renderer = new Renderer(site);
        const template = '{{ items | shift: -1 | join: "," }}';
        const result = await renderer.render(template, { items: ['a', 'b', 'c'] });
        expect(result).toBe('a,b,c');
      });

      it('should support unshift filter', async () => {
        const renderer = new Renderer(site);
        const template = '{{ items | unshift: "z" | join: "," }}';
        const result = await renderer.render(template, { items: ['a', 'b', 'c'] });
        expect(result).toBe('z,a,b,c');
      });
    });

    describe('String manipulation filters', () => {
      it('should support normalize_whitespace filter', async () => {
        const renderer = new Renderer(site);
        const template = '{{ text | normalize_whitespace }}';
        const result = await renderer.render(template, { text: '  hello   world  \n  test  ' });
        expect(result).toBe('hello world test');
      });

      it('should support newline_to_br filter', async () => {
        const renderer = new Renderer(site);
        const template = '{{ text | newline_to_br }}';
        const result = await renderer.render(template, { text: 'line1\nline2\nline3' });
        expect(result).toBe('line1<br>\nline2<br>\nline3');
      });

      it('should support strip_html filter', async () => {
        const renderer = new Renderer(site);
        const template = '{{ text | strip_html }}';
        const result = await renderer.render(template, { text: '<p>Hello <strong>world</strong></p>' });
        expect(result).toBe('Hello world');
      });

      it('should support strip_newlines filter', async () => {
        const renderer = new Renderer(site);
        const template = '{{ text | strip_newlines }}';
        const result = await renderer.render(template, { text: 'line1\nline2\nline3' });
        expect(result).toBe('line1line2line3');
      });
    });

    describe('Number/Math filters', () => {
      it('should support to_integer filter', async () => {
        const renderer = new Renderer(site);
        const template = '{{ value | to_integer }}';
        const result = await renderer.render(template, { value: '42' });
        expect(result).toBe('42');
      });

      it('should support to_integer filter with decimal', async () => {
        const renderer = new Renderer(site);
        const template = '{{ value | to_integer }}';
        const result = await renderer.render(template, { value: '42.99' });
        expect(result).toBe('42');
      });

      it('should support to_integer filter with invalid input', async () => {
        const renderer = new Renderer(site);
        const template = '{{ value | to_integer }}';
        const result = await renderer.render(template, { value: 'not-a-number' });
        expect(result).toBe('0');
      });

      it('should support abs filter', async () => {
        const renderer = new Renderer(site);
        const template = '{{ value | abs }}';
        const result = await renderer.render(template, { value: -42 });
        expect(result).toBe('42');
      });

      it('should support abs filter with positive number', async () => {
        const renderer = new Renderer(site);
        const template = '{{ value | abs }}';
        const result = await renderer.render(template, { value: 42 });
        expect(result).toBe('42');
      });

      it('should support at_least filter', async () => {
        const renderer = new Renderer(site);
        const template = '{{ value | at_least: 10 }}';
        const result = await renderer.render(template, { value: 5 });
        expect(result).toBe('10');
      });

      it('should support at_least filter with larger value', async () => {
        const renderer = new Renderer(site);
        const template = '{{ value | at_least: 10 }}';
        const result = await renderer.render(template, { value: 15 });
        expect(result).toBe('15');
      });

      it('should support at_most filter', async () => {
        const renderer = new Renderer(site);
        const template = '{{ value | at_most: 10 }}';
        const result = await renderer.render(template, { value: 15 });
        expect(result).toBe('10');
      });

      it('should support at_most filter with smaller value', async () => {
        const renderer = new Renderer(site);
        const template = '{{ value | at_most: 10 }}';
        const result = await renderer.render(template, { value: 5 });
        expect(result).toBe('5');
      });
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
});
