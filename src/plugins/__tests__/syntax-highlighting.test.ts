/**
 * Tests for modern syntax highlighting with Shiki
 */

// Mock shiki to avoid ESM module issues in Jest
jest.mock('shiki', () => ({
  createHighlighter: jest.fn().mockResolvedValue({
    codeToHtml: jest.fn((code: string, _options: any) => {
      // Simple HTML escaping for the mock
      const escaped = code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
      return `<pre class="shiki"><code>${escaped}</code></pre>`;
    }),
    getLoadedLanguages: jest.fn(() => ['javascript', 'typescript']),
  }),
}));

import {
  highlightCode,
  isLanguageSupported,
  getAvailableThemes,
  getCommonLanguages,
  initHighlighter,
  disposeHighlighter,
} from '../syntax-highlighting';

describe('Syntax Highlighting', () => {
  afterAll(() => {
    disposeHighlighter();
  });

  describe('highlightCode', () => {
    it('should highlight JavaScript code', async () => {
      const code = 'const x = 1;';
      const html = await highlightCode(code, 'javascript');

      expect(html).toContain('shiki');
      expect(html).toContain('const');
    });

    it('should highlight TypeScript code', async () => {
      const code = 'const x: number = 1;';
      const html = await highlightCode(code, 'typescript');

      expect(html).toContain('shiki');
      expect(html).toContain('number');
    });

    it('should handle unsupported languages gracefully', async () => {
      const code = 'some code';
      const html = await highlightCode(code, 'unsupported-lang');

      expect(html).toContain('<pre');
      expect(html).toContain('some code');
    });

    it('should escape HTML in code', async () => {
      const code = '<script>alert("xss")</script>';
      const html = await highlightCode(code, 'unsupported-lang');

      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });

    it('should work with different themes', async () => {
      const code = 'const x = 1;';
      const html = await highlightCode(code, 'javascript', {
        theme: 'github-dark',
      });

      expect(html).toContain('shiki');
    });
  });

  describe('initHighlighter', () => {
    it('should initialize highlighter with default options', async () => {
      const highlighter = await initHighlighter();
      expect(highlighter).toBeDefined();
    });

    it('should initialize with custom theme', async () => {
      const highlighter = await initHighlighter({
        theme: 'github-dark',
      });
      expect(highlighter).toBeDefined();
    });
  });

  describe('isLanguageSupported', () => {
    it('should return false for unknown languages', async () => {
      await initHighlighter();
      const supported = await isLanguageSupported('definitely-not-a-language');
      expect(supported).toBe(false);
    });
  });

  describe('getAvailableThemes', () => {
    it('should return a list of theme names', () => {
      const themes = getAvailableThemes();
      expect(themes).toBeInstanceOf(Array);
      expect(themes.length).toBeGreaterThan(0);
      expect(themes).toContain('github-light');
      expect(themes).toContain('github-dark');
    });
  });

  describe('getCommonLanguages', () => {
    it('should return a list of common languages', () => {
      const languages = getCommonLanguages();
      expect(languages).toBeInstanceOf(Array);
      expect(languages.length).toBeGreaterThan(0);
      expect(languages).toContain('javascript');
      expect(languages).toContain('typescript');
      expect(languages).toContain('python');
    });
  });
});
