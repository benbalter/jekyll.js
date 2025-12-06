/**
 * Integration tests for syntax highlighting in markdown processing
 *
 * These tests verify that code blocks in markdown are properly syntax highlighted
 * when the syntaxHighlighting option is enabled.
 */

// Mock shiki to avoid ESM module issues in Jest
jest.mock('shiki', () => ({
  createHighlighter: jest.fn().mockResolvedValue({
    codeToHtml: jest.fn((code: string, options: { lang: string; theme: string }) => {
      // Simple HTML escaping for the mock
      const escaped = code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
      return `<pre class="shiki ${options.theme}" style="background-color:#fff;color:#24292e" tabindex="0"><code><span class="line"><span style="color:#24292e">${escaped}</span></span></code></pre>`;
    }),
    getLoadedLanguages: jest.fn(() => ['javascript', 'typescript', 'python']),
  }),
}));

import { highlightCode, disposeHighlighter } from '../../plugins/syntax-highlighting';

describe('Syntax Highlighting Integration', () => {
  afterAll(() => {
    disposeHighlighter();
  });

  describe('highlightCode', () => {
    it('should return highlighted HTML for JavaScript code', async () => {
      const code = 'const x = 1;';
      const html = await highlightCode(code, 'javascript');

      expect(html).toContain('shiki');
      expect(html).toContain('<pre');
      expect(html).toContain('<code');
      expect(html).toContain('const x = 1;');
    });

    it('should handle multi-line code', async () => {
      const code = 'function hello() {\n  console.log("Hello");\n}';
      const html = await highlightCode(code, 'javascript');

      expect(html).toContain('shiki');
      expect(html).toContain('function hello()');
    });

    it('should escape HTML in code to prevent XSS', async () => {
      const code = '<script>alert("xss")</script>';
      const html = await highlightCode(code, 'text');

      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });

    it('should use the specified theme', async () => {
      const code = 'const x = 1;';
      const html = await highlightCode(code, 'javascript', { theme: 'github-dark' });

      expect(html).toContain('github-dark');
    });
  });

  describe('Code block pattern matching', () => {
    it('should match code blocks with language class', () => {
      const { CODE_BLOCK_PATTERN } = require('../markdown');
      const html = '<pre><code class="language-javascript">const x = 1;</code></pre>';
      CODE_BLOCK_PATTERN.lastIndex = 0; // Reset for global pattern
      const match = CODE_BLOCK_PATTERN.exec(html);

      expect(match).not.toBeNull();
      expect(match![1]).toBe('javascript');
      expect(match![2]).toBe('const x = 1;');
    });

    it('should match code blocks without language class', () => {
      const { CODE_BLOCK_PATTERN } = require('../markdown');
      const html = '<pre><code>plain text</code></pre>';
      CODE_BLOCK_PATTERN.lastIndex = 0; // Reset for global pattern
      const match = CODE_BLOCK_PATTERN.exec(html);

      expect(match).not.toBeNull();
      expect(match![1]).toBeUndefined();
      expect(match![2]).toBe('plain text');
    });

    it('should match multiple code blocks', () => {
      const { CODE_BLOCK_PATTERN } = require('../markdown');
      const html = `
        <pre><code class="language-javascript">const x = 1;</code></pre>
        <p>Some text</p>
        <pre><code class="language-python">print("hello")</code></pre>
      `;
      CODE_BLOCK_PATTERN.lastIndex = 0; // Reset for global pattern
      const matches = [...html.matchAll(CODE_BLOCK_PATTERN)];

      expect(matches.length).toBe(2);
      expect(matches[0]![1]).toBe('javascript');
      expect(matches[1]![1]).toBe('python');
    });
  });
});
