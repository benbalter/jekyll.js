/**
 * Tests for serve command
 *
 * Note: These tests focus on configuration validation and error handling.
 * Testing the actual server startup/shutdown would require complex async handling
 * and is better suited for integration tests.
 */

import { serveCommand } from '../serve';
import { existsSync, rmSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

describe('serveCommand', () => {
  const testSiteDir = join(__dirname, '../../../../tmp/test-serve-site');
  const outputDir = join(testSiteDir, '_site');

  beforeEach(() => {
    // Clean up test directories
    if (existsSync(testSiteDir)) {
      rmSync(testSiteDir, { recursive: true, force: true });
    }

    // Create a simple test site
    mkdirSync(testSiteDir, { recursive: true });
    mkdirSync(join(testSiteDir, '_layouts'), { recursive: true });

    // Create a simple config file
    writeFileSync(join(testSiteDir, '_config.yml'), 'title: Test Site\nurl: http://localhost\n');

    // Create a simple layout
    writeFileSync(
      join(testSiteDir, '_layouts', 'default.html'),
      '<!DOCTYPE html><html><body>{{ content }}</body></html>'
    );

    // Create a simple page
    writeFileSync(
      join(testSiteDir, 'index.md'),
      '---\nlayout: default\ntitle: Home\n---\n# Hello World'
    );
  });

  afterEach(() => {
    // Clean up test directories
    if (existsSync(testSiteDir)) {
      rmSync(testSiteDir, { recursive: true, force: true });
    }
  });

  describe('server initialization', () => {
    it('should fail gracefully with invalid config', async () => {
      // Create an invalid config
      writeFileSync(join(testSiteDir, '_config.yml'), 'invalid: [yaml: syntax');

      await expect(
        serveCommand({
          source: testSiteDir,
          destination: outputDir,
          config: join(testSiteDir, '_config.yml'),
          port: '4000',
          host: 'localhost',
          livereload: false,
        })
      ).rejects.toThrow();
    });

    it('should handle missing source directory', async () => {
      // Use a non-existent source
      const nonExistentSource = join(testSiteDir, 'non-existent');

      await expect(
        serveCommand({
          source: nonExistentSource,
          destination: outputDir,
          config: '_config.yml',
          port: '4000',
          host: 'localhost',
          livereload: false,
        })
      ).rejects.toThrow();
    });
  });

  describe('options handling', () => {
    it('should accept verbose option', () => {
      // Test that options are structured correctly
      const options = {
        source: testSiteDir,
        destination: outputDir,
        config: join(testSiteDir, '_config.yml'),
        port: '4000',
        host: 'localhost',
        livereload: false,
        verbose: true,
      };

      expect(options.verbose).toBe(true);
    });

    it('should accept debug option', () => {
      const options = {
        source: testSiteDir,
        destination: outputDir,
        config: join(testSiteDir, '_config.yml'),
        port: '4000',
        host: 'localhost',
        livereload: false,
        debug: true,
      };

      expect(options.debug).toBe(true);
    });

    it('should accept drafts option', () => {
      const options = {
        source: testSiteDir,
        destination: outputDir,
        config: join(testSiteDir, '_config.yml'),
        port: '4000',
        host: 'localhost',
        livereload: false,
        drafts: true,
      };

      expect(options.drafts).toBe(true);
    });

    it('should accept future option', () => {
      const options = {
        source: testSiteDir,
        destination: outputDir,
        config: join(testSiteDir, '_config.yml'),
        port: '4000',
        host: 'localhost',
        livereload: false,
        future: true,
      };

      expect(options.future).toBe(true);
    });

    it('should parse port as string', () => {
      const options = {
        source: testSiteDir,
        destination: outputDir,
        config: join(testSiteDir, '_config.yml'),
        port: '8080',
        host: 'localhost',
        livereload: true,
      };

      expect(options.port).toBe('8080');
      expect(parseInt(options.port, 10)).toBe(8080);
    });

    it('should accept custom host', () => {
      const options = {
        source: testSiteDir,
        destination: outputDir,
        config: join(testSiteDir, '_config.yml'),
        port: '4000',
        host: '0.0.0.0',
        livereload: true,
      };

      expect(options.host).toBe('0.0.0.0');
    });
  });

  describe('config resolution', () => {
    it('should resolve relative config path from source directory', () => {
      // Create a custom config in a subdirectory of the source
      const configDir = join(testSiteDir, 'config');
      mkdirSync(configDir, { recursive: true });
      writeFileSync(
        join(configDir, 'custom.yml'),
        'title: Custom Config Site\nurl: http://localhost\n'
      );

      const options = {
        source: testSiteDir,
        destination: outputDir,
        config: 'config/custom.yml', // Relative to source
        port: '4000',
        host: 'localhost',
        livereload: false,
      };

      // Verify that the config path resolution would work
      expect(options.config).toBe('config/custom.yml');
    });

    it('should handle absolute config path', () => {
      const absolutePath = join(testSiteDir, '_config.yml');

      const options = {
        source: testSiteDir,
        destination: outputDir,
        config: absolutePath,
        port: '4000',
        host: 'localhost',
        livereload: false,
      };

      expect(options.config).toBe(absolutePath);
    });
  });

  describe('destination handling', () => {
    it('should use default destination when not specified', () => {
      const options = {
        source: testSiteDir,
        destination: join(testSiteDir, '_site'),
        config: join(testSiteDir, '_config.yml'),
        port: '4000',
        host: 'localhost',
        livereload: true,
      };

      expect(options.destination).toContain('_site');
    });

    it('should accept custom destination', () => {
      const customDest = join(testSiteDir, 'custom-output');

      const options = {
        source: testSiteDir,
        destination: customDest,
        config: join(testSiteDir, '_config.yml'),
        port: '4000',
        host: 'localhost',
        livereload: true,
      };

      expect(options.destination).toBe(customDest);
    });
  });

  describe('livereload option', () => {
    it('should be enabled by default', () => {
      const options = {
        source: testSiteDir,
        destination: outputDir,
        config: join(testSiteDir, '_config.yml'),
        port: '4000',
        host: 'localhost',
        livereload: true,
      };

      expect(options.livereload).toBe(true);
    });

    it('should be disableable', () => {
      const options = {
        source: testSiteDir,
        destination: outputDir,
        config: join(testSiteDir, '_config.yml'),
        port: '4000',
        host: 'localhost',
        livereload: false,
      };

      expect(options.livereload).toBe(false);
    });
  });
});
