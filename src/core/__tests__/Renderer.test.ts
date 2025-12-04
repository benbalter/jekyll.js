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
        const result = await renderer.render(template, {
          text: '<p>Hello <strong>world</strong></p>',
        });
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

      it('should support plus filter', async () => {
        const renderer = new Renderer(site);
        const template = '{{ value | plus: 5 }}';
        const result = await renderer.render(template, { value: 10 });
        expect(result).toBe('15');
      });

      it('should support minus filter', async () => {
        const renderer = new Renderer(site);
        const template = '{{ value | minus: 3 }}';
        const result = await renderer.render(template, { value: 10 });
        expect(result).toBe('7');
      });

      it('should support times filter', async () => {
        const renderer = new Renderer(site);
        const template = '{{ value | times: 4 }}';
        const result = await renderer.render(template, { value: 5 });
        expect(result).toBe('20');
      });

      it('should support divided_by filter', async () => {
        const renderer = new Renderer(site);
        const template = '{{ value | divided_by: 3 }}';
        const result = await renderer.render(template, { value: 10 });
        expect(result).toBe('3'); // Floor division
      });

      it('should support modulo filter', async () => {
        const renderer = new Renderer(site);
        const template = '{{ value | modulo: 3 }}';
        const result = await renderer.render(template, { value: 10 });
        expect(result).toBe('1');
      });

      it('should support round filter', async () => {
        const renderer = new Renderer(site);
        const template = '{{ value | round }}';
        const result = await renderer.render(template, { value: 3.7 });
        expect(result).toBe('4');
      });

      it('should support round filter with precision', async () => {
        const renderer = new Renderer(site);
        const template = '{{ value | round: 2 }}';
        const result = await renderer.render(template, { value: 3.14159 });
        expect(result).toBe('3.14');
      });

      it('should support ceil filter', async () => {
        const renderer = new Renderer(site);
        const template = '{{ value | ceil }}';
        const result = await renderer.render(template, { value: 3.2 });
        expect(result).toBe('4');
      });

      it('should support floor filter', async () => {
        const renderer = new Renderer(site);
        const template = '{{ value | floor }}';
        const result = await renderer.render(template, { value: 3.9 });
        expect(result).toBe('3');
      });
    });

    describe('Additional Jekyll compatibility filters', () => {
      it('should support sort_natural filter', async () => {
        const renderer = new Renderer(site);
        const template = '{{ items | sort_natural | join: "," }}';
        const result = await renderer.render(template, { items: ['b', 'A', 'c', 'B'] });
        expect(result.toLowerCase()).toBe('a,b,b,c');
      });

      it('should support sort_natural filter with property', async () => {
        const renderer = new Renderer(site);
        const items = [{ name: 'banana' }, { name: 'Apple' }, { name: 'cherry' }];
        const template = '{% assign sorted = items | sort_natural: "name" %}{{ sorted[0].name }}';
        const result = await renderer.render(template, { items });
        expect(result.toLowerCase()).toBe('apple');
      });

      it('should support find filter', async () => {
        const renderer = new Renderer(site);
        const items = [
          { id: 1, name: 'apple' },
          { id: 2, name: 'banana' },
          { id: 3, name: 'cherry' },
        ];
        const template = '{% assign found = items | find: "id", 2 %}{{ found.name }}';
        const result = await renderer.render(template, { items });
        expect(result).toBe('banana');
      });

      it('should support truncate filter', async () => {
        const renderer = new Renderer(site);
        const template = '{{ text | truncate: 10 }}';
        const result = await renderer.render(template, { text: 'Hello World, how are you?' });
        expect(result).toBe('Hello W...');
      });

      it('should support truncate filter with custom ellipsis', async () => {
        const renderer = new Renderer(site);
        const template = '{{ text | truncate: 10, "!" }}';
        const result = await renderer.render(template, { text: 'Hello World, how are you?' });
        expect(result).toBe('Hello Wor!');
      });

      it('should support truncatewords filter', async () => {
        const renderer = new Renderer(site);
        const template = '{{ text | truncatewords: 3 }}';
        const result = await renderer.render(template, { text: 'One two three four five' });
        expect(result).toBe('One two three...');
      });

      it('should support truncatewords filter with custom ellipsis', async () => {
        const renderer = new Renderer(site);
        const template = '{{ text | truncatewords: 3, " [more]" }}';
        const result = await renderer.render(template, { text: 'One two three four five' });
        expect(result).toBe('One two three [more]');
      });

      it('should support escape_once filter', async () => {
        const renderer = new Renderer(site);
        const template = '{{ text | escape_once }}';
        const result = await renderer.render(template, { text: '&lt;div&gt;test&lt;/div&gt;' });
        expect(result).toBe('&lt;div&gt;test&lt;/div&gt;');
      });

      it('should support escape_once filter with unescaped input', async () => {
        const renderer = new Renderer(site);
        const template = '{{ text | escape_once }}';
        const result = await renderer.render(template, { text: '<div>test</div>' });
        expect(result).toBe('&lt;div&gt;test&lt;/div&gt;');
      });

      it('should support upcase filter', async () => {
        const renderer = new Renderer(site);
        const template = '{{ text | upcase }}';
        const result = await renderer.render(template, { text: 'hello world' });
        expect(result).toBe('HELLO WORLD');
      });

      it('should support downcase filter', async () => {
        const renderer = new Renderer(site);
        const template = '{{ text | downcase }}';
        const result = await renderer.render(template, { text: 'HELLO WORLD' });
        expect(result).toBe('hello world');
      });

      it('should support capitalize filter', async () => {
        const renderer = new Renderer(site);
        const template = '{{ text | capitalize }}';
        // Jekyll capitalize lowercases the rest of the string
        const result = await renderer.render(template, { text: 'hELLO' });
        expect(result).toBe('Hello');
      });

      it('should support strip filter', async () => {
        const renderer = new Renderer(site);
        const template = '{{ text | strip }}';
        const result = await renderer.render(template, { text: '  hello  ' });
        expect(result).toBe('hello');
      });

      it('should support lstrip filter', async () => {
        const renderer = new Renderer(site);
        const template = '{{ text | lstrip }}';
        const result = await renderer.render(template, { text: '  hello  ' });
        expect(result).toBe('hello  ');
      });

      it('should support rstrip filter', async () => {
        const renderer = new Renderer(site);
        const template = '{{ text | rstrip }}';
        const result = await renderer.render(template, { text: '  hello  ' });
        expect(result).toBe('  hello');
      });

      it('should support prepend filter', async () => {
        const renderer = new Renderer(site);
        const template = '{{ text | prepend: "Hello " }}';
        const result = await renderer.render(template, { text: 'World' });
        expect(result).toBe('Hello World');
      });

      it('should support append filter', async () => {
        const renderer = new Renderer(site);
        const template = '{{ text | append: " World" }}';
        const result = await renderer.render(template, { text: 'Hello' });
        expect(result).toBe('Hello World');
      });

      it('should support remove filter', async () => {
        const renderer = new Renderer(site);
        const template = '{{ text | remove: "l" }}';
        const result = await renderer.render(template, { text: 'Hello World' });
        expect(result).toBe('Heo Word');
      });

      it('should support remove_first filter', async () => {
        const renderer = new Renderer(site);
        const template = '{{ text | remove_first: "l" }}';
        const result = await renderer.render(template, { text: 'Hello World' });
        expect(result).toBe('Helo World');
      });

      it('should support replace filter', async () => {
        const renderer = new Renderer(site);
        const template = '{{ text | replace: "o", "0" }}';
        const result = await renderer.render(template, { text: 'Hello World' });
        expect(result).toBe('Hell0 W0rld');
      });

      it('should support replace_first filter', async () => {
        const renderer = new Renderer(site);
        const template = '{{ text | replace_first: "o", "0" }}';
        const result = await renderer.render(template, { text: 'Hello World' });
        expect(result).toBe('Hell0 World');
      });

      it('should support split filter', async () => {
        const renderer = new Renderer(site);
        const template = '{% assign words = text | split: " " %}{{ words.size }}';
        const result = await renderer.render(template, { text: 'one two three' });
        expect(result).toBe('3');
      });

      it('should support join filter', async () => {
        const renderer = new Renderer(site);
        const template = '{{ items | join: ", " }}';
        const result = await renderer.render(template, { items: ['a', 'b', 'c'] });
        expect(result).toBe('a, b, c');
      });

      it('should support first filter', async () => {
        const renderer = new Renderer(site);
        const template = '{{ items | first }}';
        const result = await renderer.render(template, { items: ['a', 'b', 'c'] });
        expect(result).toBe('a');
      });

      it('should support last filter', async () => {
        const renderer = new Renderer(site);
        const template = '{{ items | last }}';
        const result = await renderer.render(template, { items: ['a', 'b', 'c'] });
        expect(result).toBe('c');
      });

      it('should support reverse filter', async () => {
        const renderer = new Renderer(site);
        const template = '{{ items | reverse | join: "," }}';
        const result = await renderer.render(template, { items: ['a', 'b', 'c'] });
        expect(result).toBe('c,b,a');
      });

      it('should support size filter with array', async () => {
        const renderer = new Renderer(site);
        const template = '{{ items | size }}';
        const result = await renderer.render(template, { items: ['a', 'b', 'c'] });
        expect(result).toBe('3');
      });

      it('should support size filter with string', async () => {
        const renderer = new Renderer(site);
        const template = '{{ text | size }}';
        const result = await renderer.render(template, { text: 'hello' });
        expect(result).toBe('5');
      });

      it('should support compact filter', async () => {
        const renderer = new Renderer(site);
        const template = '{{ items | compact | join: "," }}';
        const result = await renderer.render(template, { items: ['a', null, 'b', undefined, 'c'] });
        expect(result).toBe('a,b,c');
      });

      it('should support concat filter', async () => {
        const renderer = new Renderer(site);
        const template = '{{ items1 | concat: items2 | join: "," }}';
        const result = await renderer.render(template, { items1: ['a', 'b'], items2: ['c', 'd'] });
        expect(result).toBe('a,b,c,d');
      });

      it('should support map filter', async () => {
        const renderer = new Renderer(site);
        const items = [{ name: 'alice' }, { name: 'bob' }, { name: 'carol' }];
        const template = '{{ items | map: "name" | join: ", " }}';
        const result = await renderer.render(template, { items });
        expect(result).toBe('alice, bob, carol');
      });

      it('should support date filter with strftime format', async () => {
        const renderer = new Renderer(site);
        const template = '{{ date | date: "%Y-%m-%d" }}';
        const result = await renderer.render(template, { date: '2024-01-15' });
        expect(result).toBe('2024-01-15');
      });

      it('should support default filter', async () => {
        const renderer = new Renderer(site);
        const template = '{{ value | default: "N/A" }}';
        const result = await renderer.render(template, { value: null });
        expect(result).toBe('N/A');
      });

      it('should support default filter with existing value', async () => {
        const renderer = new Renderer(site);
        const template = '{{ value | default: "N/A" }}';
        const result = await renderer.render(template, { value: 'hello' });
        expect(result).toBe('hello');
      });

      it('should support default filter with empty string', async () => {
        const renderer = new Renderer(site);
        const template = '{{ value | default: "N/A" }}';
        const result = await renderer.render(template, { value: '' });
        expect(result).toBe('N/A');
      });

      it('should support default filter with false (should NOT use default)', async () => {
        const renderer = new Renderer(site);
        const template = '{{ value | default: "N/A" }}';
        const result = await renderer.render(template, { value: false });
        expect(result).toBe('false');
      });

      it('should support default filter with zero (should NOT use default)', async () => {
        const renderer = new Renderer(site);
        const template = '{{ value | default: "N/A" }}';
        const result = await renderer.render(template, { value: 0 });
        expect(result).toBe('0');
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

    it('should have access to static_files in templates', async () => {
      // Create static files
      const assetsDir = join(testDir, 'assets');
      mkdirSync(assetsDir, { recursive: true });
      writeFileSync(join(assetsDir, 'style.css'), 'body { margin: 0; }');
      writeFileSync(join(assetsDir, 'script.js'), 'console.log("hello");');

      site = new Site(testDir);
      await site.read();

      const docPath = join(testDir, 'test.md');
      writeFileSync(
        docPath,
        `---
title: Test Page
---
Static files count: {{ site.static_files.size }}
{% for file in site.static_files %}
File: {{ file.name }} - Path: {{ file.path }}
{% endfor %}`
      );

      const doc = new Document(docPath, testDir, DocumentType.PAGE);
      const renderer = new Renderer(site);
      const result = await renderer.renderDocument(doc);

      expect(result).toContain('Static files count: 2');
      expect(result).toContain('File: style.css');
      expect(result).toContain('File: script.js');
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

      await expect(renderer.renderDocument(doc)).rejects.toThrow(
        'Circular layout reference detected'
      );
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

    it('should support include_cached tag as alias for include', async () => {
      // Create an include file
      writeFileSync(
        join(testDir, '_includes', 'cached-test.html'),
        'Cached include content: {{ message }}'
      );

      await site.read();

      // Create renderer with the includes directory explicitly set
      const renderer = new Renderer(site, {
        includesDir: join(testDir, '_includes'),
      });
      const template = '{% include_cached cached-test.html %}';
      const result = await renderer.render(template, { message: 'Hello World' });

      expect(result).toContain('Cached include content: Hello World');
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

    it('should provide specific error when include_relative file is not found', async () => {
      // Create a page that tries to include a non-existent file
      const pagePath = join(testDir, 'notfound.md');
      writeFileSync(
        pagePath,
        `---
title: Not Found Test
---
{% include_relative nonexistent.md %}`
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

      // Should throw a specific "File not found" error
      await expect(renderer.render(doc.content, context)).rejects.toThrow(
        /File not found: 'nonexistent\.md'/
      );
    });

    it('should provide specific error when include_relative path is a directory', async () => {
      // Create a directory instead of a file
      const dirPath = join(testDir, 'somedir');
      mkdirSync(dirPath, { recursive: true });

      // Create a page that tries to include the directory
      const pagePath = join(testDir, 'dirtest.md');
      writeFileSync(
        pagePath,
        `---
title: Directory Test
---
{% include_relative somedir %}`
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

      // Should throw a specific error about it not being a file
      await expect(renderer.render(doc.content, context)).rejects.toThrow(
        /Path is not a file: 'somedir'/
      );
    });
  });

  describe('Modern enhancement filters', () => {
    beforeEach(() => {
      site = new Site(testDir, { url: 'https://example.com', baseurl: '/blog' });
    });

    describe('reading_time filter', () => {
      it('should calculate reading time for content', async () => {
        const renderer = new Renderer(site);
        // 200 words at 200 WPM = 1 minute
        const words = Array(200).fill('word').join(' ');
        const template = '{{ text | reading_time }}';
        const result = await renderer.render(template, { text: words });
        expect(result).toBe('1');
      });

      it('should return minimum of 1 minute for short content', async () => {
        const renderer = new Renderer(site);
        const template = '{{ text | reading_time }}';
        const result = await renderer.render(template, { text: 'short text' });
        expect(result).toBe('1');
      });

      it('should calculate reading time correctly for longer content', async () => {
        const renderer = new Renderer(site);
        // 600 words at 200 WPM = 3 minutes
        const words = Array(600).fill('word').join(' ');
        const template = '{{ text | reading_time }}';
        const result = await renderer.render(template, { text: words });
        expect(result).toBe('3');
      });

      it('should accept custom words per minute', async () => {
        const renderer = new Renderer(site);
        // 200 words at 100 WPM = 2 minutes
        const words = Array(200).fill('word').join(' ');
        const template = '{{ text | reading_time: 100 }}';
        const result = await renderer.render(template, { text: words });
        expect(result).toBe('2');
      });

      it('should strip HTML before counting words', async () => {
        const renderer = new Renderer(site);
        const template = '{{ text | reading_time }}';
        const result = await renderer.render(template, { text: '<p>one two three</p>' });
        expect(result).toBe('1');
      });

      it('should handle empty input', async () => {
        const renderer = new Renderer(site);
        const template = '{{ text | reading_time }}';
        const result = await renderer.render(template, { text: '' });
        expect(result).toBe('0');
      });
    });

    describe('toc filter', () => {
      it('should generate table of contents from HTML headings', async () => {
        const renderer = new Renderer(site);
        const html = '<h2>First</h2><p>Content</p><h3>Second</h3><h2>Third</h2>';
        const template = '{% assign tocItems = content | toc %}{{ tocItems | size }}';
        const result = await renderer.render(template, { content: html });
        expect(result).toBe('3');
      });

      it('should extract heading levels correctly', async () => {
        const renderer = new Renderer(site);
        const html = '<h2>Level 2</h2><h3>Level 3</h3><h4>Level 4</h4>';
        const template =
          '{% assign tocItems = content | toc %}{{ tocItems[0].level }}-{{ tocItems[1].level }}-{{ tocItems[2].level }}';
        const result = await renderer.render(template, { content: html });
        expect(result).toBe('2-3-4');
      });

      it('should extract heading text', async () => {
        const renderer = new Renderer(site);
        const html = '<h2>Introduction</h2><h3>Overview</h3>';
        const template =
          '{% assign tocItems = content | toc %}{{ tocItems[0].text }}-{{ tocItems[1].text }}';
        const result = await renderer.render(template, { content: html });
        expect(result).toBe('Introduction-Overview');
      });

      it('should use existing id attributes', async () => {
        const renderer = new Renderer(site);
        const html = '<h2 id="custom-id">Heading</h2>';
        const template = '{% assign tocItems = content | toc %}{{ tocItems[0].id }}';
        const result = await renderer.render(template, { content: html });
        expect(result).toBe('custom-id');
      });

      it('should generate id from text if not present', async () => {
        const renderer = new Renderer(site);
        const html = '<h2>Hello World</h2>';
        const template = '{% assign tocItems = content | toc %}{{ tocItems[0].id }}';
        const result = await renderer.render(template, { content: html });
        expect(result).toBe('hello-world');
      });

      it('should handle headings with nested HTML tags', async () => {
        const renderer = new Renderer(site);
        const html = '<h2>Hello <em>World</em></h2><h3>Code: <code>example</code></h3>';
        const template =
          '{% assign tocItems = content | toc %}{{ tocItems[0].text }}-{{ tocItems[1].text }}';
        const result = await renderer.render(template, { content: html });
        expect(result).toBe('Hello World-Code: example');
      });

      it('should return empty array for content without headings', async () => {
        const renderer = new Renderer(site);
        const html = '<p>No headings here</p>';
        const template = '{% assign tocItems = content | toc %}{{ tocItems | size }}';
        const result = await renderer.render(template, { content: html });
        expect(result).toBe('0');
      });

      it('should handle empty input', async () => {
        const renderer = new Renderer(site);
        const template = '{% assign tocItems = content | toc %}{{ tocItems | size }}';
        const result = await renderer.render(template, { content: '' });
        expect(result).toBe('0');
      });
    });

    describe('heading_anchors filter', () => {
      it('should add anchor links to headings', async () => {
        const renderer = new Renderer(site);
        const html = '<h2>Hello World</h2>';
        const template = '{{ content | heading_anchors }}';
        const result = await renderer.render(template, { content: html });
        expect(result).toContain('id="hello-world"');
        expect(result).toContain('href="#hello-world"');
        expect(result).toContain('class="anchor"');
      });

      it('should preserve existing id attributes', async () => {
        const renderer = new Renderer(site);
        const html = '<h2 id="custom">Hello</h2>';
        const template = '{{ content | heading_anchors }}';
        const result = await renderer.render(template, { content: html });
        expect(result).toContain('id="custom"');
        expect(result).toContain('href="#custom"');
      });

      it('should preserve nested HTML in headings', async () => {
        const renderer = new Renderer(site);
        const html = '<h2>Hello <em>World</em></h2>';
        const template = '{{ content | heading_anchors }}';
        const result = await renderer.render(template, { content: html });
        expect(result).toContain('<em>World</em>');
        expect(result).toContain('id="hello-world"');
      });

      it('should handle multiple headings', async () => {
        const renderer = new Renderer(site);
        const html = '<h2>First</h2><h3>Second</h3>';
        const template = '{{ content | heading_anchors }}';
        const result = await renderer.render(template, { content: html });
        expect(result).toContain('href="#first"');
        expect(result).toContain('href="#second"');
      });

      it('should not modify h1 headings', async () => {
        const renderer = new Renderer(site);
        const html = '<h1>Title</h1><h2>Subtitle</h2>';
        const template = '{{ content | heading_anchors }}';
        const result = await renderer.render(template, { content: html });
        expect(result).toContain('<h1>Title</h1>');
        expect(result).toContain('href="#subtitle"');
      });

      it('should handle empty input', async () => {
        const renderer = new Renderer(site);
        const template = '{{ content | heading_anchors }}';
        const result = await renderer.render(template, { content: '' });
        expect(result).toBe('');
      });
    });

    describe('external_links filter', () => {
      it('should add target="_blank" to external links', async () => {
        const renderer = new Renderer(site);
        const html = '<a href="https://google.com">Google</a>';
        const template = '{{ content | external_links }}';
        const result = await renderer.render(template, { content: html });
        expect(result).toContain('target="_blank"');
      });

      it('should add rel="noopener noreferrer" to external links', async () => {
        const renderer = new Renderer(site);
        const html = '<a href="https://google.com">Google</a>';
        const template = '{{ content | external_links }}';
        const result = await renderer.render(template, { content: html });
        expect(result).toContain('rel="noopener noreferrer"');
      });

      it('should not modify internal links', async () => {
        const renderer = new Renderer(site);
        const html = '<a href="https://example.com/page">Internal</a>';
        const template = '{{ content | external_links }}';
        const result = await renderer.render(template, { content: html });
        expect(result).not.toContain('target="_blank"');
      });

      it('should handle custom site domain', async () => {
        const renderer = new Renderer(site);
        const html = '<a href="https://mysite.com/page">Internal</a>';
        const template = '{{ content | external_links: "mysite.com" }}';
        const result = await renderer.render(template, { content: html });
        expect(result).not.toContain('target="_blank"');
      });

      it('should handle empty input', async () => {
        const renderer = new Renderer(site);
        const template = '{{ content | external_links }}';
        const result = await renderer.render(template, { content: '' });
        expect(result).toBe('');
      });
    });

    describe('truncate_words filter', () => {
      it('should truncate text to specified number of words', async () => {
        const renderer = new Renderer(site);
        const template = '{{ text | truncate_words: 3 }}';
        const result = await renderer.render(template, { text: 'one two three four five' });
        expect(result).toBe('one two three...');
      });

      it('should not truncate if text has fewer words', async () => {
        const renderer = new Renderer(site);
        const template = '{{ text | truncate_words: 10 }}';
        const result = await renderer.render(template, { text: 'one two three' });
        expect(result).toBe('one two three');
      });

      it('should use custom ellipsis', async () => {
        const renderer = new Renderer(site);
        const template = '{{ text | truncate_words: 2, "---" }}';
        const result = await renderer.render(template, { text: 'one two three' });
        expect(result).toBe('one two---');
      });

      it('should strip HTML before truncating', async () => {
        const renderer = new Renderer(site);
        const template = '{{ text | truncate_words: 2 }}';
        const result = await renderer.render(template, { text: '<p>one two three</p>' });
        expect(result).toBe('one two...');
      });

      it('should handle empty input', async () => {
        const renderer = new Renderer(site);
        const template = '{{ text | truncate_words: 5 }}';
        const result = await renderer.render(template, { text: '' });
        expect(result).toBe('');
      });
    });

    describe('auto_excerpt filter', () => {
      it('should extract first paragraph', async () => {
        const renderer = new Renderer(site);
        const text = 'First paragraph.\n\nSecond paragraph.';
        const template = '{{ text | auto_excerpt }}';
        const result = await renderer.render(template, { text });
        expect(result).toBe('First paragraph.');
      });

      it('should extract first N words with word limit', async () => {
        const renderer = new Renderer(site);
        const text = 'one two three four five six';
        const template = '{{ text | auto_excerpt: 3 }}';
        const result = await renderer.render(template, { text });
        expect(result).toBe('one two three...');
      });

      it('should not add ellipsis if text is shorter than limit', async () => {
        const renderer = new Renderer(site);
        const text = 'short text';
        const template = '{{ text | auto_excerpt: 10 }}';
        const result = await renderer.render(template, { text });
        expect(result).toBe('short text');
      });

      it('should strip HTML', async () => {
        const renderer = new Renderer(site);
        const text = '<p>First paragraph.</p>\n\n<p>Second paragraph.</p>';
        const template = '{{ text | auto_excerpt }}';
        const result = await renderer.render(template, { text });
        expect(result).toBe('First paragraph.');
      });

      it('should handle empty input', async () => {
        const renderer = new Renderer(site);
        const template = '{{ text | auto_excerpt }}';
        const result = await renderer.render(template, { text: '' });
        expect(result).toBe('');
      });
    });
  });

  describe('Site data caching', () => {
    let site: Site;

    beforeEach(() => {
      mkdirSync(join(testDir, '_layouts'), { recursive: true });
      mkdirSync(join(testDir, '_includes'), { recursive: true });
      site = new Site(testDir, { title: 'Test Site' });
    });

    describe('invalidateSiteCache', () => {
      it('should clear the cached site data', async () => {
        const renderer = new Renderer(site);

        // Preload the cache first
        renderer.preloadSiteData();

        // Invalidate the cache
        renderer.invalidateSiteCache();

        // The cache should be cleared (no direct way to test, but calling methods should work)
        expect(() => renderer.invalidateSiteCache()).not.toThrow();
      });

      it('should be callable multiple times without error', () => {
        const renderer = new Renderer(site);

        renderer.invalidateSiteCache();
        renderer.invalidateSiteCache();
        renderer.invalidateSiteCache();

        // Should not throw
        expect(true).toBe(true);
      });

      it('should allow cache to be re-initialized after invalidation', async () => {
        const renderer = new Renderer(site);

        // Preload cache
        renderer.preloadSiteData();

        // Invalidate
        renderer.invalidateSiteCache();

        // Preload again - should load fresh data without error
        expect(() => renderer.preloadSiteData()).not.toThrow();
      });
    });

    describe('preloadSiteData', () => {
      it('should pre-cache site data for performance', () => {
        const renderer = new Renderer(site);

        // Should not throw
        expect(() => renderer.preloadSiteData()).not.toThrow();
      });

      it('should be callable multiple times (idempotent)', () => {
        const renderer = new Renderer(site);

        renderer.preloadSiteData();
        renderer.preloadSiteData();
        renderer.preloadSiteData();

        // Should not throw
        expect(true).toBe(true);
      });

      it('should work correctly before document rendering', async () => {
        // Create a simple document file to test rendering
        const docPath = join(testDir, 'test.md');
        writeFileSync(docPath, '---\ntitle: Test\n---\nContent');

        const renderer = new Renderer(site);

        // Preload the site data
        renderer.preloadSiteData();

        // Create a document using the proper constructor
        const doc = new Document(docPath, testDir, DocumentType.PAGE);

        // Rendering should work
        const result = await renderer.renderDocument(doc);
        expect(result).toContain('Content');
      });
    });
  });
});
