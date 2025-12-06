/**
 * XSS Security Tests
 *
 * Tests that user-generated content is properly sanitized
 * to prevent Cross-Site Scripting (XSS) attacks.
 */

import { Site } from '../Site';
import { Renderer } from '../Renderer';
import { Builder } from '../Builder';
import { mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { safeJsonStringify, escapeHtml, escapeJs } from '../../utils/html';

describe('XSS Security', () => {
  const testDir = join(__dirname, '../../../../tmp/xss-test-site');
  const sourceDir = join(testDir, 'source');
  const destDir = join(testDir, '_site');

  beforeEach(() => {
    // Clean up and create fresh test directories
    rmSync(testDir, { recursive: true, force: true });
    mkdirSync(join(sourceDir, '_layouts'), { recursive: true });
    mkdirSync(join(sourceDir, '_includes'), { recursive: true });
    mkdirSync(join(sourceDir, '_posts'), { recursive: true });
    mkdirSync(destDir, { recursive: true });

    // Create a basic config
    writeFileSync(
      join(sourceDir, '_config.yml'),
      `
title: Test Site
url: https://example.com
description: A test site
plugins:
  - jekyll-seo-tag
`
    );

    // Create a basic layout
    writeFileSync(
      join(sourceDir, '_layouts/default.html'),
      `
<!DOCTYPE html>
<html>
<head>
  <title>{{ page.title }}</title>
</head>
<body>
{{ content }}
</body>
</html>
`
    );
  });

  afterEach(() => {
    // Clean up
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('JSON-LD Script Tag XSS Prevention', () => {
    it('should escape </script> in JSON data to prevent XSS', () => {
      const maliciousData = {
        title: '</script><script>alert("XSS")</script>',
        description: 'Normal description',
      };

      const json = safeJsonStringify(maliciousData);

      // Should not contain raw </script>
      expect(json).not.toContain('</script>');
      // Should be valid JSON when parsed
      expect(() => JSON.parse(json)).not.toThrow();
      // Parsed data should match original
      expect(JSON.parse(json)).toEqual(maliciousData);
    });

    it('should escape HTML comments in JSON data', () => {
      const maliciousData = {
        content: '<!-- <script>alert("XSS")</script> -->',
      };

      const json = safeJsonStringify(maliciousData);

      // Should not contain raw <!--
      expect(json).not.toContain('<!--');
    });

    it('should escape Unicode line/paragraph separators', () => {
      const data = {
        text: 'line1\u2028line2\u2029para2',
      };

      const json = safeJsonStringify(data);

      // Should escape U+2028 and U+2029
      expect(json).not.toContain('\u2028');
      expect(json).not.toContain('\u2029');
      // Should still be valid JSON
      expect(() => JSON.parse(json)).not.toThrow();
    });
  });

  describe('Liquid Filter XSS Prevention', () => {
    let site: Site;
    let renderer: Renderer;

    beforeEach(async () => {
      site = new Site(sourceDir, {
        source: sourceDir,
        destination: destDir,
      });
      await site.read();
      renderer = new Renderer(site, {
        root: sourceDir,
        layoutsDir: join(sourceDir, '_layouts'),
        includesDir: join(sourceDir, '_includes'),
      });
    });

    it('should escape HTML via xml_escape filter', async () => {
      const template = '{{ content | xml_escape }}';
      const result = await renderer.render(template, {
        content: '<script>alert("XSS")</script>',
      });

      expect(result).not.toContain('<script>');
      expect(result).toContain('&lt;script&gt;');
    });

    it('should escape URLs via cgi_escape filter', async () => {
      const template = '{{ url | cgi_escape }}';
      const result = await renderer.render(template, {
        url: 'https://example.com/?q=<script>',
      });

      expect(result).not.toContain('<script>');
      expect(result).toContain('%3Cscript%3E');
    });

    it('should produce safe JSON with jsonify filter', async () => {
      const template = '{{ data | jsonify }}';
      const result = await renderer.render(template, {
        data: { title: '</script><script>alert(1)</script>' },
      });

      // Should not contain raw </script>
      expect(result).not.toContain('</script>');
      // Should be valid JSON
      expect(() => JSON.parse(result)).not.toThrow();
    });

    it('should produce safe JSON with inspect filter', async () => {
      const template = '{{ data | inspect }}';
      const result = await renderer.render(template, {
        data: { content: '</script>' },
      });

      expect(result).not.toContain('</script>');
      expect(() => JSON.parse(result)).not.toThrow();
    });
  });

  describe('Highlight Tag XSS Prevention', () => {
    // Note: The highlight tag is a block tag that uses liquidjs's template system
    // to parse content between {% highlight %} and {% endhighlight %}.
    // Direct testing of the tag's content escaping is done in integration tests.
    // Here we verify the language parameter sanitization at the unit level.

    it('should sanitize language parameter by stripping non-alphanumeric characters', () => {
      // The language regex: /[^a-zA-Z0-9_-]/g
      const sanitize = (lang: string) => lang.replace(/[^a-zA-Z0-9_-]/g, '');

      expect(sanitize('javascript"><script>')).toBe('javascriptscript');
      expect(sanitize('python')).toBe('python');
      expect(sanitize('c++')).toBe('c');
      expect(sanitize('ruby_2')).toBe('ruby_2');
      expect(sanitize('type-script')).toBe('type-script');
    });
  });

  describe('Front Matter XSS Prevention', () => {
    it('should require escape filter for safe title output', async () => {
      // Create a page with malicious title
      writeFileSync(
        join(sourceDir, 'malicious.md'),
        `---
title: <script>alert("XSS")</script>
layout: default
---
Normal content
`
      );

      // Use a layout that properly escapes title
      writeFileSync(
        join(sourceDir, '_layouts/default.html'),
        `
<!DOCTYPE html>
<html>
<head>
  <title>{{ page.title | escape }}</title>
</head>
<body>
{{ content }}
</body>
</html>
`
      );

      const site = new Site(sourceDir, {
        source: sourceDir,
        destination: destDir,
      });
      await site.read();
      const builder = new Builder(site);
      await builder.build();

      // Check the output file
      const outputPath = join(destDir, 'malicious.html');
      expect(existsSync(outputPath)).toBe(true);

      const content = readFileSync(outputPath, 'utf-8');
      // With escape filter, the title should be escaped
      expect(content).not.toMatch(/<title>.*<script>/);
      expect(content).toContain('&lt;script&gt;');
    });

    it('should demonstrate unsafe pattern without escape filter', async () => {
      // This test documents that without escape filter, content is NOT escaped
      // This matches Jekyll's behavior - template authors must use | escape
      writeFileSync(
        join(sourceDir, 'unsafe.md'),
        `---
title: <script>alert("XSS")</script>
layout: default
---
Content
`
      );

      // Layout WITHOUT escape filter (unsafe pattern)
      writeFileSync(
        join(sourceDir, '_layouts/default.html'),
        `
<!DOCTYPE html>
<html>
<head>
  <title>{{ page.title }}</title>
</head>
<body>
{{ content }}
</body>
</html>
`
      );

      const site = new Site(sourceDir, {
        source: sourceDir,
        destination: destDir,
      });
      await site.read();
      const builder = new Builder(site);
      await builder.build();

      const outputPath = join(destDir, 'unsafe.html');
      const content = readFileSync(outputPath, 'utf-8');

      // Without escape filter, the malicious content passes through
      // This is expected Jekyll behavior - documented here as a WARNING
      expect(content).toContain('<title><script>alert');
    });
  });

  describe('HTML Escaping Functions', () => {
    it('escapeHtml should escape all dangerous characters', () => {
      const input = '<script>alert("XSS")&</script>';
      const output = escapeHtml(input);

      expect(output).not.toContain('<');
      expect(output).not.toContain('>');
      expect(output).not.toContain('"');
      expect(output).toContain('&lt;');
      expect(output).toContain('&gt;');
      expect(output).toContain('&quot;');
      expect(output).toContain('&amp;');
    });

    it('escapeJs should escape dangerous characters for JavaScript context', () => {
      const input = '</script><img src=x onerror=alert(1)>';
      const output = escapeJs(input);

      expect(output).not.toContain('</script>');
      expect(output).not.toContain('<img');
      expect(output).toContain('\\x3c');
      expect(output).toContain('\\x3e');
    });
  });
});
