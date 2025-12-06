/**
 * Tests for common CLI utilities
 */

import { join, resolve } from 'path';
import { mkdirSync, rmSync } from 'fs';
import { initializeCLI, createSiteAndBuilder, CommonCLIOptions } from '../common';

// Test fixtures directory
const TEST_FIXTURES_DIR = join(__dirname, '../../../../test-fixtures');
const TEMP_DIR = join(__dirname, '../../../../tmp/test-common-cli');

describe('Common CLI Utilities', () => {
  beforeAll(() => {
    // Create temp directory if it doesn't exist
    mkdirSync(TEMP_DIR, { recursive: true });
  });

  afterAll(() => {
    // Clean up temp directory
    rmSync(TEMP_DIR, { recursive: true, force: true });
  });

  describe('initializeCLI', () => {
    it('should initialize CLI with default options', () => {
      const options: CommonCLIOptions = {
        source: TEST_FIXTURES_DIR,
        destination: '',
        config: '_config.yml',
      };

      const result = initializeCLI(options);

      expect(result.sourcePath).toBe(TEST_FIXTURES_DIR);
      expect(result.destPath).toBe(join(TEST_FIXTURES_DIR, '_site'));
      expect(result.configPath).toBe(join(TEST_FIXTURES_DIR, '_config.yml'));
      expect(result.config).toBeDefined();
      expect(result.isVerbose).toBe(false);
      expect(result.isDebug).toBe(false);
    });

    it('should enable verbose mode when verbose is true', () => {
      const options: CommonCLIOptions = {
        source: TEST_FIXTURES_DIR,
        destination: '',
        config: '_config.yml',
        verbose: true,
      };

      const result = initializeCLI(options);

      expect(result.isVerbose).toBe(true);
      expect(result.isDebug).toBe(false);
    });

    it('should enable both verbose and debug when debug is true', () => {
      const options: CommonCLIOptions = {
        source: TEST_FIXTURES_DIR,
        destination: '',
        config: '_config.yml',
        debug: true,
      };

      const result = initializeCLI(options);

      expect(result.isVerbose).toBe(true);
      expect(result.isDebug).toBe(true);
    });

    it('should use custom destination when provided', () => {
      const customDest = join(TEMP_DIR, 'custom-dest');
      const options: CommonCLIOptions = {
        source: TEST_FIXTURES_DIR,
        destination: customDest,
        config: '_config.yml',
      };

      const result = initializeCLI(options);

      expect(result.destPath).toBe(resolve(customDest));
    });

    it('should apply drafts and future options to config', () => {
      const options: CommonCLIOptions = {
        source: TEST_FIXTURES_DIR,
        destination: '',
        config: '_config.yml',
        drafts: true,
        future: true,
      };

      const result = initializeCLI(options);

      expect(result.config.show_drafts).toBe(true);
      expect(result.config.future).toBe(true);
    });

    it('should handle absolute config path', () => {
      const absoluteConfigPath = join(TEST_FIXTURES_DIR, '_config.yml');
      const options: CommonCLIOptions = {
        source: TEST_FIXTURES_DIR,
        destination: '',
        config: absoluteConfigPath,
      };

      const result = initializeCLI(options);

      expect(result.configPath).toBe(absoluteConfigPath);
    });
  });

  describe('createSiteAndBuilder', () => {
    it('should create site and builder instances', () => {
      // First initialize to get config
      const initOptions: CommonCLIOptions = {
        source: TEST_FIXTURES_DIR,
        destination: '',
        config: '_config.yml',
      };
      const { sourcePath, config } = initializeCLI(initOptions);

      const { site, builder } = createSiteAndBuilder({
        sourcePath,
        config,
      });

      expect(site).toBeDefined();
      expect(builder).toBeDefined();
    });

    it('should pass drafts and future options to builder', () => {
      const initOptions: CommonCLIOptions = {
        source: TEST_FIXTURES_DIR,
        destination: '',
        config: '_config.yml',
        drafts: true,
        future: true,
      };
      const { sourcePath, config, isVerbose } = initializeCLI(initOptions);

      const { site, builder } = createSiteAndBuilder({
        sourcePath,
        config,
        drafts: true,
        future: true,
        verbose: isVerbose,
      });

      expect(site).toBeDefined();
      expect(builder).toBeDefined();
    });

    it('should enable timing when specified', () => {
      const initOptions: CommonCLIOptions = {
        source: TEST_FIXTURES_DIR,
        destination: '',
        config: '_config.yml',
      };
      const { sourcePath, config } = initializeCLI(initOptions);

      const { builder } = createSiteAndBuilder({
        sourcePath,
        config,
        timing: true,
      });

      expect(builder).toBeDefined();
    });
  });
});
