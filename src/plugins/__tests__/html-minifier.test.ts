/**
 * Tests for HTML minification plugin
 */

import { minifyHtml, minifyHtmlBatch, getMinificationStats } from '../html-minifier';

describe('HTML Minifier Plugin', () => {
  describe('minifyHtml', () => {
    const sampleHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Page</title>
          <!-- This is a comment -->
        </head>
        <body>
          <h1>Hello World</h1>
          <p>This is a paragraph with some text.</p>
        </body>
      </html>
    `;

    it('should return original HTML when not enabled', async () => {
      const result = await minifyHtml(sampleHtml, { enabled: false });

      expect(result.html).toBe(sampleHtml);
      expect(result.reduction).toBe(0);
    });

    it('should minify HTML when enabled', async () => {
      const result = await minifyHtml(sampleHtml, { enabled: true });

      expect(result.html).not.toBe(sampleHtml);
      expect(result.minifiedSize).toBeLessThan(result.originalSize);
      expect(result.reduction).toBeGreaterThan(0);
    });

    it('should remove comments when enabled', async () => {
      const result = await minifyHtml(sampleHtml, {
        enabled: true,
        removeComments: true,
      });

      expect(result.html).not.toContain('This is a comment');
    });

    it('should collapse whitespace when enabled', async () => {
      const result = await minifyHtml(sampleHtml, {
        enabled: true,
        collapseWhitespace: true,
      });

      // Should not have excessive whitespace
      expect(result.html).not.toMatch(/\s{2,}/);
    });

    it('should collapse boolean attributes', async () => {
      const htmlWithBoolAttr = '<input type="checkbox" disabled="disabled" />';
      const result = await minifyHtml(htmlWithBoolAttr, {
        enabled: true,
        collapseBooleanAttributes: true,
      });

      expect(result.html).toContain('disabled');
      expect(result.html).not.toContain('disabled="disabled"');
    });

    it('should minify inline CSS when enabled', async () => {
      const htmlWithCss = '<style>.test { color: red; margin: 0px; }</style>';
      const result = await minifyHtml(htmlWithCss, {
        enabled: true,
        minifyCSS: true,
      });

      expect(result.html.length).toBeLessThanOrEqual(htmlWithCss.length);
    });

    it('should preserve content structure', async () => {
      const result = await minifyHtml(sampleHtml, { enabled: true });

      expect(result.html).toContain('<title>Test Page</title>');
      expect(result.html).toContain('<h1>Hello World</h1>');
    });

    it('should handle empty HTML gracefully', async () => {
      const result = await minifyHtml('', { enabled: true });

      expect(result.html).toBe('');
      expect(result.originalSize).toBe(0);
      expect(result.minifiedSize).toBe(0);
    });

    it('should preserve pre elements', async () => {
      const htmlWithPre = '<pre>  Preformatted  text  </pre>';
      const result = await minifyHtml(htmlWithPre, {
        enabled: true,
        collapseWhitespace: true,
      });

      // Pre content should be preserved
      expect(result.html).toContain('Preformatted  text');
    });
  });

  describe('minifyHtmlBatch', () => {
    it('should minify multiple HTML files', async () => {
      const htmlFiles = [
        '<html><body>File 1</body></html>',
        '<html><body>File 2</body></html>',
        '<html><body>File 3</body></html>',
      ];

      const results = await minifyHtmlBatch(htmlFiles, { enabled: true });

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result.html).toBeDefined();
      });
    });
  });

  describe('getMinificationStats', () => {
    it('should calculate total stats from results', async () => {
      const results = [
        { html: '', originalSize: 1000, minifiedSize: 800, reduction: 20 },
        { html: '', originalSize: 2000, minifiedSize: 1500, reduction: 25 },
        { html: '', originalSize: 500, minifiedSize: 400, reduction: 20 },
      ];

      const stats = getMinificationStats(results);

      expect(stats.totalOriginalSize).toBe(3500);
      expect(stats.totalMinifiedSize).toBe(2700);
      expect(stats.fileCount).toBe(3);
      expect(stats.totalReduction).toBeCloseTo(22.86, 1);
    });

    it('should handle empty results array', () => {
      const stats = getMinificationStats([]);

      expect(stats.totalOriginalSize).toBe(0);
      expect(stats.totalMinifiedSize).toBe(0);
      expect(stats.fileCount).toBe(0);
      expect(stats.totalReduction).toBe(0);
    });
  });
});
