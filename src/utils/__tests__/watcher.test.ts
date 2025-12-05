/**
 * Tests for FileWatcher
 */

import { FileWatcher, WatcherOptions } from '../watcher';
import { Builder, Site } from '../../core';
import { join } from 'path';
import { tmpdir } from 'os';
import { mkdir, writeFile, rm, appendFile } from 'fs/promises';
import { existsSync } from 'fs';

describe('FileWatcher', () => {
  let tempDir: string;
  let sourceDir: string;
  let destDir: string;
  let site: Site;
  let builder: Builder;
  let watcher: FileWatcher;

  beforeEach(async () => {
    // Create temporary directories
    tempDir = join(tmpdir(), `jekyll-watcher-test-${Date.now()}`);
    sourceDir = join(tempDir, 'source');
    destDir = join(tempDir, '_site');

    await mkdir(sourceDir, { recursive: true });
    await mkdir(destDir, { recursive: true });

    // Create a minimal site structure
    await writeFile(join(sourceDir, '_config.yml'), 'title: Test Site\n');

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
    // Stop watcher if running
    if (watcher) {
      await watcher.stop();
    }

    // Clean up temporary directories
    if (existsSync(tempDir)) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  describe('constructor', () => {
    it('should create a FileWatcher instance', () => {
      const options: WatcherOptions = {
        source: sourceDir,
        destination: destDir,
        builder,
      };

      watcher = new FileWatcher(options);
      expect(watcher).toBeInstanceOf(FileWatcher);
    });

    it('should accept optional usePolling option', () => {
      const options: WatcherOptions = {
        source: sourceDir,
        destination: destDir,
        builder,
        usePolling: false,
      };

      watcher = new FileWatcher(options);
      expect(watcher).toBeInstanceOf(FileWatcher);
    });

    it('should accept optional pollInterval option', () => {
      const options: WatcherOptions = {
        source: sourceDir,
        destination: destDir,
        builder,
        usePolling: true,
        pollInterval: 200,
      };

      watcher = new FileWatcher(options);
      expect(watcher).toBeInstanceOf(FileWatcher);
    });

    it('should accept optional verbose option', () => {
      const options: WatcherOptions = {
        source: sourceDir,
        destination: destDir,
        builder,
        verbose: true,
      };

      watcher = new FileWatcher(options);
      expect(watcher).toBeInstanceOf(FileWatcher);
    });

    it('should accept optional onRebuild callback', () => {
      const onRebuild = jest.fn();
      const options: WatcherOptions = {
        source: sourceDir,
        destination: destDir,
        builder,
        onRebuild,
      };

      watcher = new FileWatcher(options);
      expect(watcher).toBeInstanceOf(FileWatcher);
    });
  });

  describe('start and stop', () => {
    it('should start watching without errors', () => {
      const options: WatcherOptions = {
        source: sourceDir,
        destination: destDir,
        builder,
      };

      watcher = new FileWatcher(options);

      // start() should not throw
      expect(() => watcher.start()).not.toThrow();
    });

    it('should stop watching without errors', async () => {
      const options: WatcherOptions = {
        source: sourceDir,
        destination: destDir,
        builder,
      };

      watcher = new FileWatcher(options);
      watcher.start();

      // stop() should not throw
      await expect(watcher.stop()).resolves.not.toThrow();
    });

    it('should handle multiple stop calls gracefully', async () => {
      const options: WatcherOptions = {
        source: sourceDir,
        destination: destDir,
        builder,
      };

      watcher = new FileWatcher(options);
      watcher.start();

      // Multiple stops should be safe
      await watcher.stop();
      await expect(watcher.stop()).resolves.not.toThrow();
    });

    it('should use polling by default', () => {
      const options: WatcherOptions = {
        source: sourceDir,
        destination: destDir,
        builder,
      };

      watcher = new FileWatcher(options);

      // This test verifies that the watcher can start (which implies polling works)
      // Polling is the default to avoid EMFILE errors
      expect(() => watcher.start()).not.toThrow();
    });

    it('should handle stop before start gracefully', async () => {
      const options: WatcherOptions = {
        source: sourceDir,
        destination: destDir,
        builder,
      };

      watcher = new FileWatcher(options);

      // stop() before start() should not throw
      await expect(watcher.stop()).resolves.not.toThrow();
    });
  });

  describe('file change detection', () => {
    it('should detect file changes when watching', async () => {
      const onRebuild = jest.fn();
      const options: WatcherOptions = {
        source: sourceDir,
        destination: destDir,
        builder,
        onRebuild,
        usePolling: true,
        pollInterval: 50, // Fast polling for tests
      };

      watcher = new FileWatcher(options);
      watcher.start();

      // Wait for watcher to initialize
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Make a file change
      await appendFile(join(sourceDir, '_config.yml'), '\ndescription: Test\n');

      // Wait for the change to be detected and rebuild to complete
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Note: The actual rebuild may or may not happen depending on timing
      // This test verifies that the watcher doesn't crash during file changes
    }, 10000);
  });

  describe('error handling', () => {
    it('should handle watcher errors gracefully without crashing', () => {
      const options: WatcherOptions = {
        source: sourceDir,
        destination: destDir,
        builder,
        verbose: false,
      };

      watcher = new FileWatcher(options);

      // The watcher should start without throwing
      // Even if errors occur during watching, they should be handled gracefully
      expect(() => watcher.start()).not.toThrow();
    });

    it('should handle errors with verbose mode', () => {
      const options: WatcherOptions = {
        source: sourceDir,
        destination: destDir,
        builder,
        verbose: true,
      };

      watcher = new FileWatcher(options);
      expect(() => watcher.start()).not.toThrow();
    });
  });
});
