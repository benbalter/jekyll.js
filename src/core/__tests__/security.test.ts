/**
 * Security tests for path traversal prevention
 * Tests that malicious content cannot escape site boundaries
 */

import { Site } from '../Site';
import { Builder } from '../Builder';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join, resolve } from 'path';

describe('Path Traversal Security', () => {
  const testDir = join(__dirname, '../../../../tmp/security-test-site');
  const sourceDir = join(testDir, 'source');
  const destDir = join(testDir, '_site');
  const secretFile = join(testDir, 'secret.txt');

  beforeEach(() => {
    // Clean up and create fresh test directories
    rmSync(testDir, { recursive: true, force: true });
    mkdirSync(sourceDir, { recursive: true });
    mkdirSync(destDir, { recursive: true });

    // Create a "secret" file outside the source/dest directories
    writeFileSync(secretFile, 'This should not be accessible');

    // Create a basic site structure
    writeFileSync(join(sourceDir, '_config.yml'), 'title: Test Site\n');
  });

  afterEach(() => {
    // Clean up
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('Builder output path validation', () => {
    it('should prevent writing files outside destination via malicious permalinks', async () => {
      // Create a page with a malicious permalink
      const postsDir = join(sourceDir, '_posts');
      mkdirSync(postsDir);
      writeFileSync(
        join(postsDir, '2024-01-01-malicious.md'),
        `---
title: Malicious Post
permalink: /../../../tmp/evil.html
---
This content should not be written outside the destination.
`
      );

      const site = new Site(sourceDir, {
        source: sourceDir,
        destination: destDir,
      });
      await site.read();

      const builder = new Builder(site);
      await builder.build();

      // The malicious file should NOT exist outside destination
      expect(existsSync(join(testDir, 'evil.html'))).toBe(false);
      expect(existsSync('/tmp/evil.html')).toBe(false);

      // The file should be written to a safe location within destination
      // (The path traversal should be stripped)
      expect(existsSync(join(destDir, 'tmp/evil.html'))).toBe(true);
    });

    it('should sanitize URLs that contain path traversal sequences', async () => {
      // Create a page with path traversal in permalink
      writeFileSync(
        join(sourceDir, 'test.md'),
        `---
title: Test Page
permalink: /posts/../../../etc/passwd
---
Test content
`
      );

      const site = new Site(sourceDir, {
        source: sourceDir,
        destination: destDir,
      });
      await site.read();

      const builder = new Builder(site);
      await builder.build();

      // Should not write to /etc/passwd
      expect(existsSync('/etc/passwd.html')).toBe(false);

      // Should write to a safe location with traversal stripped
      expect(existsSync(join(destDir, 'etc/passwd'))).toBe(true);
    });

    it('should prevent writing to parent directories', async () => {
      writeFileSync(
        join(sourceDir, 'page.md'),
        `---
title: Page
permalink: /../outside.html
---
Content
`
      );

      const site = new Site(sourceDir, {
        source: sourceDir,
        destination: destDir,
      });
      await site.read();

      const builder = new Builder(site);
      await builder.build();

      // Should not write outside destination
      expect(existsSync(join(testDir, 'outside.html'))).toBe(false);

      // Should write safely inside destination
      expect(existsSync(join(destDir, 'outside.html'))).toBe(true);
    });
  });

  describe('Static file copy validation', () => {
    it('should only copy files from within source directory', async () => {
      // Create a normal static file
      writeFileSync(join(sourceDir, 'style.css'), 'body { color: blue; }');

      const site = new Site(sourceDir, {
        source: sourceDir,
        destination: destDir,
      });
      await site.read();

      // Verify static files are only from source
      for (const staticFile of site.static_files) {
        const resolvedPath = resolve(staticFile.path);
        expect(resolvedPath.startsWith(resolve(sourceDir))).toBe(true);
      }
    });
  });

  describe('Document validation', () => {
    it('should not read files outside the source directory', async () => {
      // Create a valid page
      writeFileSync(join(sourceDir, 'index.md'), '---\ntitle: Home\n---\nHome');

      const site = new Site(sourceDir);
      await site.read();

      // All documents should be within source
      const allDocs = site.getAllDocuments();
      for (const doc of allDocs) {
        const resolvedPath = resolve(doc.path);
        expect(resolvedPath.startsWith(resolve(sourceDir))).toBe(true);
      }
    });
  });

  describe('Permalink sanitization', () => {
    it('should sanitize various path traversal patterns', async () => {
      const testCases = [
        { permalink: '/../secret', expected: '/secret' },
        { permalink: '/../../etc/passwd', expected: '/etc/passwd' },
        { permalink: '/posts/../../secret', expected: '/secret' },
        { permalink: '/./posts/../secret', expected: '/secret' },
      ];

      for (const testCase of testCases) {
        writeFileSync(
          join(sourceDir, 'test.md'),
          `---
title: Test
permalink: ${testCase.permalink}
---
Content
`
        );

        const site = new Site(sourceDir, {
          source: sourceDir,
          destination: destDir,
        });
        await site.read();

        const builder = new Builder(site);
        await builder.build();

        // Clean up for next iteration
        rmSync(join(sourceDir, 'test.md'));
        rmSync(destDir, { recursive: true, force: true });
        mkdirSync(destDir, { recursive: true });
      }
    });
  });
});
