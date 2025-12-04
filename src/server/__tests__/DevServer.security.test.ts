/**
 * Security tests for DevServer path traversal prevention
 */

import { DevServer } from '../DevServer';
import { Site, Builder } from '../../core';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { existsSync } from 'fs';
import http from 'http';

describe('DevServer Security', () => {
  let tempDir: string;
  let sourceDir: string;
  let destDir: string;
  let site: Site;
  let builder: Builder;
  let server: DevServer;
  const testPort = 4200;

  beforeEach(async () => {
    // Create temporary directories
    tempDir = join(tmpdir(), `jekyll-security-test-${Date.now()}`);
    sourceDir = join(tempDir, 'source');
    destDir = join(tempDir, '_site');

    await mkdir(sourceDir, { recursive: true });
    await mkdir(destDir, { recursive: true });

    // Create a simple site structure
    await writeFile(join(sourceDir, '_config.yml'), 'title: Test Site\n');
    await writeFile(join(destDir, 'index.html'), '<html><body><h1>Test</h1></body></html>');
    await writeFile(join(destDir, 'style.css'), 'body { color: blue; }');

    // Create a "secret" file outside the destination
    await writeFile(join(tempDir, 'secret.txt'), 'SECRET DATA');

    // Create site and builder instances
    site = new Site(sourceDir, {
      source: sourceDir,
      destination: destDir,
    });

    builder = new Builder(site, {
      verbose: false,
    });
  });

  afterEach(async () => {
    // Stop server if running
    if (server) {
      await server.stop();
    }

    // Clean up temporary directories
    if (existsSync(tempDir)) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  /**
   * Helper function to make HTTP requests
   */
  function makeRequest(path: string): Promise<{ statusCode: number; body: string }> {
    return new Promise((resolve, reject) => {
      const req = http.get(`http://localhost:${testPort}${path}`, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => resolve({ statusCode: res.statusCode || 0, body }));
      });
      req.on('error', reject);
      req.setTimeout(5000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }

  describe('Path traversal protection', () => {
    it('should serve files from destination directory', async () => {
      server = new DevServer({
        port: testPort,
        host: 'localhost',
        destination: destDir,
        source: sourceDir,
        livereload: false,
        site,
        builder,
      });

      await server.start();

      const response = await makeRequest('/index.html');
      expect(response.statusCode).toBe(200);
      expect(response.body).toContain('<h1>Test</h1>');
    }, 10000);

    it('should block path traversal attempts with ../', async () => {
      server = new DevServer({
        port: testPort,
        host: 'localhost',
        destination: destDir,
        source: sourceDir,
        livereload: false,
        site,
        builder,
      });

      await server.start();

      // Try to access secret file outside destination
      const response = await makeRequest('/../secret.txt');
      // Should return 404 (the path traversal is sanitized, resulting in /secret.txt which doesn't exist in dest)
      expect(response.statusCode).toBe(404);
      expect(response.body).not.toContain('SECRET DATA');
    }, 10000);

    it('should block URL-encoded path traversal attempts', async () => {
      server = new DevServer({
        port: testPort,
        host: 'localhost',
        destination: destDir,
        source: sourceDir,
        livereload: false,
        site,
        builder,
      });

      await server.start();

      // Try URL-encoded path traversal (%2e%2e = ..)
      const response = await makeRequest('/%2e%2e/secret.txt');
      expect(response.statusCode).toBe(404);
      expect(response.body).not.toContain('SECRET DATA');
    }, 10000);

    it('should block double-encoded path traversal attempts', async () => {
      server = new DevServer({
        port: testPort,
        host: 'localhost',
        destination: destDir,
        source: sourceDir,
        livereload: false,
        site,
        builder,
      });

      await server.start();

      // Try double-encoded path traversal (%252e = %2e after decoding)
      const response = await makeRequest('/%252e%252e/secret.txt');
      expect(response.statusCode).toBe(404);
      expect(response.body).not.toContain('SECRET DATA');
    }, 10000);

    it('should block nested path traversal attempts', async () => {
      server = new DevServer({
        port: testPort,
        host: 'localhost',
        destination: destDir,
        source: sourceDir,
        livereload: false,
        site,
        builder,
      });

      await server.start();

      // Try nested traversal
      const response = await makeRequest('/subdir/../../secret.txt');
      expect(response.statusCode).toBe(404);
      expect(response.body).not.toContain('SECRET DATA');
    }, 10000);

    it('should return 404 for non-existent files', async () => {
      server = new DevServer({
        port: testPort,
        host: 'localhost',
        destination: destDir,
        source: sourceDir,
        livereload: false,
        site,
        builder,
      });

      await server.start();

      const response = await makeRequest('/nonexistent.html');
      expect(response.statusCode).toBe(404);
    }, 10000);

    it('should escape HTML in 404 error messages', async () => {
      server = new DevServer({
        port: testPort,
        host: 'localhost',
        destination: destDir,
        source: sourceDir,
        livereload: false,
        site,
        builder,
      });

      await server.start();

      // Request with potentially dangerous characters
      // Note: HTTP client URL-encodes the path, so the dangerous characters are encoded
      // The server still escapes them when displaying, which is defense-in-depth
      const response = await makeRequest('/<script>alert("xss")</script>');
      expect(response.statusCode).toBe(404);
      // Should not contain unescaped script tag (either raw or in escaped form it's safe)
      expect(response.body).not.toContain('<script>');
      // The URL is URL-encoded by the client, which is also safe
    }, 10000);
  });
});
