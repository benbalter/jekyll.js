import { CacheManager } from '../CacheManager';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';

describe('CacheManager', () => {
  const testDir = join(__dirname, '../../../../tmp/test-cache-manager');
  const testFile = join(testDir, 'test.md');

  beforeEach(() => {
    // Clean up and create fresh test directory
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch (error) {
      // Directory may not exist, which is fine
    }
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch (error) {
      // Directory may not exist, which is fine
    }
  });

  describe('constructor', () => {
    it('should create a cache manager instance', () => {
      const cache = new CacheManager(testDir);
      expect(cache).toBeDefined();
    });

    it('should initialize empty cache if no cache file exists', () => {
      const cache = new CacheManager(testDir);
      const stats = cache.getStats();
      expect(stats.fileCount).toBe(0);
      expect(stats.lastBuild).toBeNull();
    });
  });

  describe('hasChanged', () => {
    it('should return true for new files', () => {
      const cache = new CacheManager(testDir);
      writeFileSync(testFile, 'test content', 'utf-8');
      
      expect(cache.hasChanged(testFile, 'test.md')).toBe(true);
    });

    it('should return false for unchanged files', () => {
      const cache = new CacheManager(testDir);
      writeFileSync(testFile, 'test content', 'utf-8');
      
      // Add file to cache
      cache.updateFile(testFile, 'test.md');
      
      // Check if changed (should be false)
      expect(cache.hasChanged(testFile, 'test.md')).toBe(false);
    });

    it('should return true for modified files', (done) => {
      const cache = new CacheManager(testDir);
      writeFileSync(testFile, 'initial content', 'utf-8');
      
      // Add file to cache
      cache.updateFile(testFile, 'test.md');
      
      // Modify file (wait a bit to ensure mtime changes)
      setTimeout(() => {
        writeFileSync(testFile, 'modified content', 'utf-8');
        expect(cache.hasChanged(testFile, 'test.md')).toBe(true);
        done();
      }, 100);
    });
  });

  describe('updateFile', () => {
    it('should add file to cache', () => {
      const cache = new CacheManager(testDir);
      writeFileSync(testFile, 'test content', 'utf-8');
      
      cache.updateFile(testFile, 'test.md');
      
      const stats = cache.getStats();
      expect(stats.fileCount).toBe(1);
    });

    it('should track dependencies', () => {
      const cache = new CacheManager(testDir);
      writeFileSync(testFile, 'test content', 'utf-8');
      
      cache.updateFile(testFile, 'test.md', ['_layouts/default.html']);
      
      expect(cache.hasChanged(testFile, 'test.md')).toBe(false);
    });
  });

  describe('save and load', () => {
    it('should persist cache to disk', () => {
      const cache1 = new CacheManager(testDir);
      writeFileSync(testFile, 'test content', 'utf-8');
      
      cache1.updateFile(testFile, 'test.md');
      cache1.save();
      
      // Create new cache manager and verify it loads the saved cache
      const cache2 = new CacheManager(testDir);
      const stats = cache2.getStats();
      expect(stats.fileCount).toBe(1);
      expect(cache2.hasChanged(testFile, 'test.md')).toBe(false);
    });

    it('should update last build time on save', () => {
      const cache = new CacheManager(testDir);
      const statsBefore = cache.getStats();
      expect(statsBefore.lastBuild).toBeNull();
      
      cache.save();
      
      const statsAfter = cache.getStats();
      expect(statsAfter.lastBuild).not.toBeNull();
    });
  });

  describe('removeFile', () => {
    it('should remove file from cache', () => {
      const cache = new CacheManager(testDir);
      writeFileSync(testFile, 'test content', 'utf-8');
      
      cache.updateFile(testFile, 'test.md');
      expect(cache.getStats().fileCount).toBe(1);
      
      cache.removeFile('test.md');
      expect(cache.getStats().fileCount).toBe(0);
    });
  });

  describe('clear', () => {
    it('should clear all cache data', () => {
      const cache = new CacheManager(testDir);
      writeFileSync(testFile, 'test content', 'utf-8');
      
      cache.updateFile(testFile, 'test.md');
      expect(cache.getStats().fileCount).toBe(1);
      
      cache.clear();
      expect(cache.getStats().fileCount).toBe(0);
    });
  });

  describe('hasDependencyChanges', () => {
    it('should return false when no dependencies', () => {
      const cache = new CacheManager(testDir);
      writeFileSync(testFile, 'test content', 'utf-8');
      
      cache.updateFile(testFile, 'test.md');
      
      expect(cache.hasDependencyChanges('test.md', testDir)).toBe(false);
    });

    it('should detect changed dependencies', (done) => {
      const cache = new CacheManager(testDir);
      const layoutFile = join(testDir, 'layout.html');
      
      writeFileSync(testFile, 'test content', 'utf-8');
      writeFileSync(layoutFile, 'layout content', 'utf-8');
      
      // Add both files to cache
      cache.updateFile(layoutFile, 'layout.html');
      cache.updateFile(testFile, 'test.md', ['layout.html']);
      
      // Modify the layout file
      setTimeout(() => {
        writeFileSync(layoutFile, 'modified layout', 'utf-8');
        expect(cache.hasDependencyChanges('test.md', testDir)).toBe(true);
        done();
      }, 100);
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      const cache = new CacheManager(testDir);
      writeFileSync(testFile, 'test content', 'utf-8');
      
      const statsEmpty = cache.getStats();
      expect(statsEmpty.fileCount).toBe(0);
      expect(statsEmpty.lastBuild).toBeNull();
      
      cache.updateFile(testFile, 'test.md');
      cache.save();
      
      const statsWithFile = cache.getStats();
      expect(statsWithFile.fileCount).toBe(1);
      expect(statsWithFile.lastBuild).not.toBeNull();
    });
  });
});
