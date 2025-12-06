/**
 * Tests for smart quotes functionality in markdown processing
 *
 * These tests verify that the smartypants library is correctly integrated
 * to convert ASCII punctuation to typographic Unicode characters.
 */

import { smartypantsu } from 'smartypants';

// Unicode constants for typographic characters
const LEFT_DOUBLE_QUOTE = '\u201C'; // "
const RIGHT_DOUBLE_QUOTE = '\u201D'; // "
const RIGHT_SINGLE_QUOTE = '\u2019'; // ' (also used for apostrophe)
const EM_DASH = '\u2014'; // —
const ELLIPSIS = '\u2026'; // …

describe('Smart quotes functionality', () => {
  describe('smartypants library behavior', () => {
    it('should convert straight double quotes to curly quotes', () => {
      const input = 'He said "Hello world"';
      const result = smartypantsu(input);
      expect(result).toContain(LEFT_DOUBLE_QUOTE);
      expect(result).toContain(RIGHT_DOUBLE_QUOTE);
      expect(result).not.toContain('"');
    });

    it('should convert straight single quotes to curly quotes', () => {
      const input = "It's a nice day";
      const result = smartypantsu(input);
      // Should contain right single quotation mark (U+2019)
      expect(result).toContain(RIGHT_SINGLE_QUOTE);
      expect(result).not.toContain("'");
    });

    it('should convert double dashes to em-dash (smartypants default)', () => {
      // Note: smartypants converts -- to em-dash by default, not en-dash
      const input = 'pages 10--20';
      const result = smartypantsu(input);
      expect(result).toContain(EM_DASH);
      expect(result).not.toContain('--');
    });

    it('should convert triple dashes to em-dash', () => {
      const input = 'Wait---I forgot something';
      const result = smartypantsu(input);
      expect(result).toContain(EM_DASH);
      expect(result).not.toContain('---');
    });

    it('should convert three dots to ellipsis', () => {
      const input = 'And then...';
      const result = smartypantsu(input);
      expect(result).toContain(ELLIPSIS);
      expect(result).not.toContain('...');
    });

    it('should handle multiple conversions in same text', () => {
      const input = '"Hello," she said. "How are you?"';
      const result = smartypantsu(input);
      // Should have curly quotes
      expect(result).toContain(LEFT_DOUBLE_QUOTE);
      expect(result).toContain(RIGHT_DOUBLE_QUOTE);
    });
  });

  describe('HTML-aware smart quote processing', () => {
    // Helper function that simulates applySmartQuotes behavior
    function simulateApplySmartQuotes(html: string): string {
      const result: string[] = [];
      let i = 0;
      let textStart = 0;

      while (i < html.length) {
        if (html[i] === '<') {
          const tagMatch = html
            .slice(i)
            .match(/^<(code|pre|script|style|textarea|kbd|samp|var)(\s|>)/i);

          if (tagMatch) {
            if (i > textStart) {
              result.push(smartypantsu(html.slice(textStart, i)));
            }

            const tagName = (tagMatch[1] ?? '').toLowerCase();
            const closingTagRegex = new RegExp(`</${tagName}>`, 'i');
            const closingMatch = html.slice(i).match(closingTagRegex);

            if (closingMatch && closingMatch.index !== undefined) {
              const blockEnd = i + closingMatch.index + closingMatch[0].length;
              result.push(html.slice(i, blockEnd));
              i = blockEnd;
              textStart = i;
            } else {
              result.push(html.slice(i));
              return result.join('');
            }
          } else {
            if (i > textStart) {
              result.push(smartypantsu(html.slice(textStart, i)));
            }

            const tagEnd = html.indexOf('>', i);
            if (tagEnd === -1) {
              result.push(html.slice(i));
              return result.join('');
            }

            result.push(html.slice(i, tagEnd + 1));
            i = tagEnd + 1;
            textStart = i;
          }
        } else {
          i++;
        }
      }

      if (textStart < html.length) {
        result.push(smartypantsu(html.slice(textStart)));
      }

      return result.join('');
    }

    it('should apply smart quotes to regular paragraph text', () => {
      const html = '<p>He said "Hello world"</p>';
      const result = simulateApplySmartQuotes(html);
      expect(result).toContain(LEFT_DOUBLE_QUOTE);
      expect(result).toContain(RIGHT_DOUBLE_QUOTE);
      expect(result).toContain('<p>');
      expect(result).toContain('</p>');
    });

    it('should NOT apply smart quotes inside code tags', () => {
      const html = '<p>Use <code>"double quotes"</code> in code</p>';
      const result = simulateApplySmartQuotes(html);
      // Code content should remain unchanged
      expect(result).toContain('<code>"double quotes"</code>');
      // But surrounding text should be converted
      expect(result).not.toMatch(/<p>.*".*<code>/);
    });

    it('should NOT apply smart quotes inside pre tags', () => {
      const html = '<pre>const x = "hello";</pre>';
      const result = simulateApplySmartQuotes(html);
      // Pre content should remain unchanged
      expect(result).toBe('<pre>const x = "hello";</pre>');
    });

    it('should NOT apply smart quotes inside script tags', () => {
      const html = '<script>var x = "test";</script>';
      const result = simulateApplySmartQuotes(html);
      expect(result).toBe('<script>var x = "test";</script>');
    });

    it('should NOT apply smart quotes inside style tags', () => {
      const html = '<style>content: "quote";</style>';
      const result = simulateApplySmartQuotes(html);
      expect(result).toBe('<style>content: "quote";</style>');
    });

    it('should NOT apply smart quotes inside kbd tags', () => {
      const html = '<p>Press <kbd>"Enter"</kbd> to continue</p>';
      const result = simulateApplySmartQuotes(html);
      expect(result).toContain('<kbd>"Enter"</kbd>');
    });

    it('should handle mixed content with code blocks', () => {
      const html = '<p>"Hello" said the <code>"function"</code> to the "user"</p>';
      const result = simulateApplySmartQuotes(html);
      // Code should be unchanged
      expect(result).toContain('<code>"function"</code>');
      // Text before and after should have curly quotes
      expect(result).toMatch(/[\u201C\u201D]/);
    });

    it('should preserve HTML attributes unchanged', () => {
      const html = '<a href="https://example.com">Click "here"</a>';
      const result = simulateApplySmartQuotes(html);
      // Attribute should be unchanged
      expect(result).toContain('href="https://example.com"');
      // Text content should have curly quotes (using Unicode)
      expect(result).toContain(`${LEFT_DOUBLE_QUOTE}here${RIGHT_DOUBLE_QUOTE}`);
    });

    it('should handle nested tags correctly', () => {
      const html = '<p><strong>"Bold quote"</strong></p>';
      const result = simulateApplySmartQuotes(html);
      // Should convert quotes in nested content
      expect(result).toContain(LEFT_DOUBLE_QUOTE);
      expect(result).toContain(RIGHT_DOUBLE_QUOTE);
    });

    it('should handle empty code blocks', () => {
      const html = '<code></code>';
      const result = simulateApplySmartQuotes(html);
      expect(result).toBe('<code></code>');
    });

    it('should handle multiple code blocks', () => {
      const html = '<p>"Start" <code>x = "a"</code> "middle" <code>y = "b"</code> "end"</p>';
      const result = simulateApplySmartQuotes(html);
      // Code blocks unchanged
      expect(result).toContain('<code>x = "a"</code>');
      expect(result).toContain('<code>y = "b"</code>');
      // Text converted
      expect(result).toMatch(/[\u201C\u201D]/);
    });
  });

  describe('Integration with processMarkdown', () => {
    // Import processMarkdown for integration tests
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { processMarkdown } = require('../markdown');

    it('should apply smart quotes when processing markdown by default', async () => {
      const markdown = 'He said "Hello world"';
      const html = await processMarkdown(markdown);
      expect(html).toContain(LEFT_DOUBLE_QUOTE); // left double quote
      expect(html).toContain(RIGHT_DOUBLE_QUOTE); // right double quote
    });

    it('should not apply smart quotes when disabled', async () => {
      const markdown = 'He said "Hello world"';
      const html = await processMarkdown(markdown, { smartQuotes: false });
      expect(html).toContain('"'); // straight quotes preserved
      expect(html).not.toContain(LEFT_DOUBLE_QUOTE);
      expect(html).not.toContain(RIGHT_DOUBLE_QUOTE);
    });

    it('should convert apostrophes in contractions', async () => {
      const markdown = "It's a beautiful day";
      const html = await processMarkdown(markdown);
      expect(html).toContain(RIGHT_SINGLE_QUOTE); // smart apostrophe
    });

    it('should convert ellipsis', async () => {
      const markdown = 'And then...';
      const html = await processMarkdown(markdown);
      expect(html).toContain(ELLIPSIS);
    });

    it('should preserve quotes inside inline code', async () => {
      const markdown = 'Use `"quotes"` in code';
      const html = await processMarkdown(markdown);
      // Code content should have straight quotes
      expect(html).toMatch(/<code[^>]*>"quotes"<\/code>/);
    });

    it('should preserve quotes inside fenced code blocks', async () => {
      const markdown = '```\nconst x = "hello";\n```';
      const html = await processMarkdown(markdown);
      // Code block content should have straight quotes
      expect(html).toContain('"hello"');
    });
  });
});
