import { validateCommand } from '../validate';
import { existsSync, rmSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

describe('validateCommand', () => {
  const testSiteDir = join(__dirname, '../../../../tmp/test-validate-site');

  beforeEach(() => {
    // Clean up test directories
    if (existsSync(testSiteDir)) {
      rmSync(testSiteDir, { recursive: true, force: true });
    }

    // Create test directory
    mkdirSync(testSiteDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directories
    if (existsSync(testSiteDir)) {
      rmSync(testSiteDir, { recursive: true, force: true });
    }
  });

  describe('valid configuration', () => {
    it('should validate a valid config successfully', async () => {
      // Create a valid config file
      writeFileSync(
        join(testSiteDir, '_config.yml'),
        'title: Test Site\nurl: https://example.com\n'
      );

      // Should not throw
      await validateCommand({
        source: testSiteDir,
        config: '_config.yml',
      });
    });

    it('should validate config with collections', async () => {
      writeFileSync(
        join(testSiteDir, '_config.yml'),
        `title: Test Site
collections:
  recipes:
    output: true
  authors:
    output: false
`
      );

      await validateCommand({
        source: testSiteDir,
        config: '_config.yml',
      });
    });

    it('should validate config with plugins', async () => {
      writeFileSync(
        join(testSiteDir, '_config.yml'),
        `title: Test Site
plugins:
  - jekyll-seo-tag
  - jekyll-sitemap
  - jekyll-feed
`
      );

      await validateCommand({
        source: testSiteDir,
        config: '_config.yml',
      });
    });

    it('should validate config with front matter defaults', async () => {
      writeFileSync(
        join(testSiteDir, '_config.yml'),
        `title: Test Site
defaults:
  - scope:
      path: ""
      type: "posts"
    values:
      layout: "post"
`
      );

      await validateCommand({
        source: testSiteDir,
        config: '_config.yml',
      });
    });
  });

  describe('configuration with warnings', () => {
    it('should pass validation but show warnings for unsupported features', async () => {
      writeFileSync(
        join(testSiteDir, '_config.yml'),
        `title: Test Site
markdown: redcarpet
lsi: true
`
      );

      // Should not throw (warnings don't cause failure)
      await validateCommand({
        source: testSiteDir,
        config: '_config.yml',
      });
    });

    it('should fail with --strict when there are warnings', async () => {
      writeFileSync(
        join(testSiteDir, '_config.yml'),
        `title: Test Site
markdown: redcarpet
`
      );

      // Mock process.exit to prevent test from exiting
      const mockExit = jest
        .spyOn(process, 'exit')
        .mockImplementation((code?: string | number | null | undefined): never => {
          throw new Error(`process.exit(${code})`);
        });

      try {
        await validateCommand({
          source: testSiteDir,
          config: '_config.yml',
          strict: true,
        });
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect((error as Error).message).toBe('process.exit(1)');
      }

      mockExit.mockRestore();
    });
  });

  describe('invalid configuration', () => {
    it('should fail validation for invalid port', async () => {
      writeFileSync(
        join(testSiteDir, '_config.yml'),
        `title: Test Site
port: 99999
`
      );

      const mockExit = jest
        .spyOn(process, 'exit')
        .mockImplementation((code?: string | number | null | undefined): never => {
          throw new Error(`process.exit(${code})`);
        });

      try {
        await validateCommand({
          source: testSiteDir,
          config: '_config.yml',
        });
        expect(true).toBe(false);
      } catch (error) {
        expect((error as Error).message).toBe('process.exit(1)');
      }

      mockExit.mockRestore();
    });

    it('should fail validation for invalid liquid error_mode', async () => {
      writeFileSync(
        join(testSiteDir, '_config.yml'),
        `title: Test Site
liquid:
  error_mode: invalid
`
      );

      const mockExit = jest
        .spyOn(process, 'exit')
        .mockImplementation((code?: string | number | null | undefined): never => {
          throw new Error(`process.exit(${code})`);
        });

      try {
        await validateCommand({
          source: testSiteDir,
          config: '_config.yml',
        });
        expect(true).toBe(false);
      } catch (error) {
        expect((error as Error).message).toBe('process.exit(1)');
      }

      mockExit.mockRestore();
    });

    it('should fail validation for invalid encoding', async () => {
      writeFileSync(
        join(testSiteDir, '_config.yml'),
        `title: Test Site
encoding: invalid-encoding
`
      );

      const mockExit = jest
        .spyOn(process, 'exit')
        .mockImplementation((code?: string | number | null | undefined): never => {
          throw new Error(`process.exit(${code})`);
        });

      try {
        await validateCommand({
          source: testSiteDir,
          config: '_config.yml',
        });
        expect(true).toBe(false);
      } catch (error) {
        expect((error as Error).message).toBe('process.exit(1)');
      }

      mockExit.mockRestore();
    });
  });

  describe('missing configuration file', () => {
    it('should fail when config file does not exist', async () => {
      const mockExit = jest
        .spyOn(process, 'exit')
        .mockImplementation((code?: string | number | null | undefined): never => {
          throw new Error(`process.exit(${code})`);
        });

      try {
        await validateCommand({
          source: testSiteDir,
          config: '_config.yml',
        });
        expect(true).toBe(false);
      } catch (error) {
        expect((error as Error).message).toBe('process.exit(1)');
      }

      mockExit.mockRestore();
    });
  });

  describe('verbose mode', () => {
    it('should show detailed output in verbose mode', async () => {
      writeFileSync(
        join(testSiteDir, '_config.yml'),
        `title: Test Site
url: https://example.com
plugins:
  - jekyll-seo-tag
collections:
  recipes:
    output: true
defaults:
  - scope:
      path: ""
    values:
      layout: default
`
      );

      const consoleSpy = jest.spyOn(console, 'log');

      await validateCommand({
        source: testSiteDir,
        config: '_config.yml',
        verbose: true,
      });

      // Check that summary section was printed
      const summaryCalls = consoleSpy.mock.calls.filter(
        (call) =>
          typeof call[0] === 'string' &&
          (call[0].includes('Configuration Summary') ||
            call[0].includes('Site settings') ||
            call[0].includes('title:'))
      );
      expect(summaryCalls.length).toBeGreaterThan(0);

      consoleSpy.mockRestore();
    });
  });

  describe('custom config path', () => {
    it('should validate custom config file', async () => {
      // Create config in a custom location
      mkdirSync(join(testSiteDir, 'config'), { recursive: true });
      writeFileSync(join(testSiteDir, 'config', 'custom.yml'), 'title: Custom Config Site\n');

      await validateCommand({
        source: testSiteDir,
        config: 'config/custom.yml',
      });
    });

    it('should validate absolute config path', async () => {
      const absoluteConfigPath = join(testSiteDir, 'absolute-config.yml');
      writeFileSync(absoluteConfigPath, 'title: Absolute Path Site\n');

      await validateCommand({
        source: testSiteDir,
        config: absoluteConfigPath,
      });
    });
  });
});
