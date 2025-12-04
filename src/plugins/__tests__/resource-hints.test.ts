/**
 * Tests for resource hints plugin
 */

import {
  generateResourceHints,
  generateResourceHintsHtml,
  injectResourceHints,
  extractStylesheets,
  extractFonts,
  extractHeroImage,
  extractExternalOrigins,
  generateHintTag,
  ResourceHint,
} from '../resource-hints';

describe('Resource Hints Plugin', () => {
  describe('generateHintTag', () => {
    it('should generate preload link for stylesheet', () => {
      const hint: ResourceHint = {
        href: '/css/main.css',
        rel: 'preload',
        as: 'style',
      };

      const tag = generateHintTag(hint);

      expect(tag).toContain('rel="preload"');
      expect(tag).toContain('href="/css/main.css"');
      expect(tag).toContain('as="style"');
    });

    it('should generate preconnect link', () => {
      const hint: ResourceHint = {
        href: 'https://fonts.googleapis.com',
        rel: 'preconnect',
        crossorigin: '',
      };

      const tag = generateHintTag(hint);

      expect(tag).toContain('rel="preconnect"');
      expect(tag).toContain('crossorigin');
    });

    it('should generate prefetch link', () => {
      const hint: ResourceHint = {
        href: '/next-page.html',
        rel: 'prefetch',
      };

      const tag = generateHintTag(hint);

      expect(tag).toContain('rel="prefetch"');
      expect(tag).toContain('href="/next-page.html"');
    });

    it('should include type attribute for fonts', () => {
      const hint: ResourceHint = {
        href: '/fonts/inter.woff2',
        rel: 'preload',
        as: 'font',
        type: 'font/woff2',
        crossorigin: 'anonymous',
      };

      const tag = generateHintTag(hint);

      expect(tag).toContain('type="font/woff2"');
      expect(tag).toContain('crossorigin="anonymous"');
    });
  });

  describe('extractStylesheets', () => {
    it('should extract stylesheet links', () => {
      const html = `
        <link rel="stylesheet" href="/css/main.css">
        <link href="/css/theme.css" rel="stylesheet">
      `;

      const stylesheets = extractStylesheets(html);

      expect(stylesheets).toContain('/css/main.css');
      expect(stylesheets).toContain('/css/theme.css');
    });

    it('should handle HTML with no stylesheets', () => {
      const html = '<html><body>No styles</body></html>';

      const stylesheets = extractStylesheets(html);

      expect(stylesheets).toHaveLength(0);
    });

    it('should deduplicate stylesheets', () => {
      const html = `
        <link rel="stylesheet" href="/css/main.css">
        <link rel="stylesheet" href="/css/main.css">
      `;

      const stylesheets = extractStylesheets(html);

      expect(stylesheets).toHaveLength(1);
    });
  });

  describe('extractFonts', () => {
    it('should extract font URLs from CSS', () => {
      const html = `
        <style>
          @font-face {
            font-family: 'Inter';
            src: url('/fonts/inter.woff2') format('woff2');
          }
        </style>
      `;

      const fonts = extractFonts(html);

      expect(fonts).toContain('/fonts/inter.woff2');
    });

    it('should handle multiple font formats', () => {
      const html = `
        <style>
          @font-face {
            src: url('font.woff2'),
                 url('font.woff'),
                 url('font.ttf');
          }
        </style>
      `;

      const fonts = extractFonts(html);

      expect(fonts.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('extractHeroImage', () => {
    it('should extract hero image from eager loading', () => {
      const html = '<img src="/images/hero.jpg" loading="eager">';

      const heroImage = extractHeroImage(html);

      expect(heroImage).toBe('/images/hero.jpg');
    });

    it('should extract hero image from hero class', () => {
      const html = '<img class="hero-image" src="/images/banner.jpg">';

      const heroImage = extractHeroImage(html);

      expect(heroImage).toBe('/images/banner.jpg');
    });

    it('should return undefined when no hero image found', () => {
      const html = '<img src="/images/thumbnail.jpg" loading="lazy">';

      const heroImage = extractHeroImage(html);

      expect(heroImage).toBeUndefined();
    });
  });

  describe('extractExternalOrigins', () => {
    it('should extract external origins from URLs', () => {
      const html = `
        <script src="https://cdn.example.com/lib.js"></script>
        <link href="https://fonts.googleapis.com/css">
      `;

      const origins = extractExternalOrigins(html);

      expect(origins).toContain('https://cdn.example.com');
      expect(origins).toContain('https://fonts.googleapis.com');
    });

    it('should handle relative URLs gracefully', () => {
      const html = '<script src="/js/app.js"></script>';

      const origins = extractExternalOrigins(html);

      expect(origins).toHaveLength(0);
    });
  });

  describe('generateResourceHints', () => {
    it('should return empty array when not enabled', () => {
      const html = '<link rel="stylesheet" href="/css/main.css">';

      const hints = generateResourceHints(html, { enabled: false });

      expect(hints).toHaveLength(0);
    });

    it('should generate hints when enabled', () => {
      const html = '<link rel="stylesheet" href="/css/main.css">';

      const hints = generateResourceHints(html, {
        enabled: true,
        preloadStyles: true,
      });

      expect(hints.length).toBeGreaterThan(0);
    });

    it('should include custom preloads', () => {
      const hints = generateResourceHints('<html></html>', {
        enabled: true,
        customPreloads: [
          { href: '/custom.css', rel: 'preload', as: 'style' },
        ],
      });

      expect(hints.some((h) => h.href === '/custom.css')).toBe(true);
    });

    it('should include preconnect origins', () => {
      const hints = generateResourceHints('<html></html>', {
        enabled: true,
        preconnectOrigins: ['https://api.example.com'],
      });

      expect(hints.some((h) => h.rel === 'preconnect')).toBe(true);
    });
  });

  describe('generateResourceHintsHtml', () => {
    it('should return empty string when not enabled', () => {
      const html = '<link rel="stylesheet" href="/css/main.css">';

      const hintsHtml = generateResourceHintsHtml(html, { enabled: false });

      expect(hintsHtml).toBe('');
    });

    it('should generate HTML block with hints', () => {
      const html = '<link rel="stylesheet" href="/css/main.css">';

      const hintsHtml = generateResourceHintsHtml(html, {
        enabled: true,
        preloadStyles: true,
      });

      expect(hintsHtml).toContain('<!-- Resource Hints -->');
      expect(hintsHtml).toContain('<link');
    });
  });

  describe('injectResourceHints', () => {
    it('should return original HTML when not enabled', () => {
      const html = '<html><head></head><body></body></html>';

      const result = injectResourceHints(html, { enabled: false });

      expect(result).toBe(html);
    });

    it('should inject hints after head tag', () => {
      const html = `
        <html>
          <head>
            <title>Test</title>
          </head>
          <body></body>
        </html>
      `;

      const result = injectResourceHints(html, {
        enabled: true,
        preconnectOrigins: ['https://fonts.googleapis.com'],
      });

      expect(result).toContain('<!-- Resource Hints -->');
      expect(result.indexOf('Resource Hints')).toBeGreaterThan(result.indexOf('<head>'));
    });

    it('should handle HTML without head tag', () => {
      const html = '<body>No head</body>';

      const result = injectResourceHints(html, {
        enabled: true,
        preconnectOrigins: ['https://example.com'],
      });

      expect(result).toContain('<!-- Resource Hints -->');
    });
  });
});
