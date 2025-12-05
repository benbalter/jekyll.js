import { DevServer } from '../DevServer';
import { Site, Builder } from '../../core';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { existsSync } from 'fs';
import http from 'http';

describe('DevServer', () => {
  let tempDir: string;
  let sourceDir: string;
  let destDir: string;
  let site: Site;
  let builder: Builder;
  let server: DevServer;

  beforeEach(async () => {
    // Create temporary directories
    tempDir = join(tmpdir(), `jekyll-test-${Date.now()}`);
    sourceDir = join(tempDir, 'source');
    destDir = join(tempDir, '_site');

    await mkdir(sourceDir, { recursive: true });
    await mkdir(destDir, { recursive: true });

    // Create a simple site structure
    await writeFile(join(sourceDir, '_config.yml'), 'title: Test Site\n');
    await writeFile(join(destDir, 'index.html'), '<html><body><h1>Test</h1></body></html>');

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

  describe('constructor', () => {
    it('should create a DevServer instance', () => {
      server = new DevServer({
        port: 4000,
        host: 'localhost',
        destination: destDir,
        source: sourceDir,
        livereload: false,
        site,
        builder,
      });

      expect(server).toBeInstanceOf(DevServer);
    });
  });

  describe('start and stop', () => {
    it('should start and stop the server', async () => {
      server = new DevServer({
        port: 4100, // Use a different port for tests
        host: 'localhost',
        destination: destDir,
        source: sourceDir,
        livereload: false,
        site,
        builder,
      });

      // Start the server
      await server.start();

      // Server should be running now
      // We can't directly test HTTP, but we can verify it started without error

      // Stop the server
      await server.stop();
    }, 10000);

    it('should start server with live reload enabled', async () => {
      server = new DevServer({
        port: 4101,
        host: 'localhost',
        destination: destDir,
        source: sourceDir,
        livereload: true,
        site,
        builder,
      });

      await server.start();
      await server.stop();
    }, 10000);
  });

  describe('static file serving', () => {
    it('should be able to start on specified port and host', async () => {
      server = new DevServer({
        port: 4102,
        host: '127.0.0.1',
        destination: destDir,
        source: sourceDir,
        livereload: false,
        site,
        builder,
      });

      await expect(server.start()).resolves.not.toThrow();
      await server.stop();
    }, 10000);

    it('should handle requests and return 404 for missing files without hanging', async () => {
      server = new DevServer({
        port: 4103,
        host: 'localhost',
        destination: destDir,
        source: sourceDir,
        livereload: false,
        site,
        builder,
      });

      await server.start();

      // Make a request to a non-existent file
      const response = await new Promise<{ statusCode: number }>((resolve, reject) => {
        const req = http.get('http://localhost:4103/nonexistent.html', (res) => {
          let body = '';
          res.on('data', (chunk) => (body += chunk));
          res.on('end', () => resolve({ statusCode: res.statusCode || 0 }));
        });
        req.on('error', reject);
        req.setTimeout(5000, () => {
          req.destroy();
          reject(new Error('Request timeout - server may be hanging'));
        });
      });

      expect(response.statusCode).toBe(404);
      await server.stop();
    }, 10000);

    it('should serve existing files correctly', async () => {
      server = new DevServer({
        port: 4104,
        host: 'localhost',
        destination: destDir,
        source: sourceDir,
        livereload: false,
        site,
        builder,
      });

      await server.start();

      // Make a request to existing file
      const response = await new Promise<{ statusCode: number; body: string }>(
        (resolve, reject) => {
          const req = http.get('http://localhost:4104/index.html', (res) => {
            let body = '';
            res.on('data', (chunk) => (body += chunk));
            res.on('end', () => resolve({ statusCode: res.statusCode || 0, body }));
          });
          req.on('error', reject);
          req.setTimeout(5000, () => {
            req.destroy();
            reject(new Error('Request timeout - server may be hanging'));
          });
        }
      );

      expect(response.statusCode).toBe(200);
      expect(response.body).toContain('Test');
      await server.stop();
    }, 10000);
  });
});
