/**
 * Tests for parallel file system utilities
 */

import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import {
  walkDirectoryAsync,
  readFilesParallel,
  statFilesParallel,
  parallelMap,
} from '../parallel-fs';
import { Document } from '../../core/Document';

describe('Parallel File System Utilities', () => {
  const testDir = join(__dirname, '../../../../tmp/test-parallel-fs');

  beforeEach(() => {
    // Clean up and create fresh test directory
    if (rmSync) {
      rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    if (rmSync) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('walkDirectoryAsync', () => {
    it('should walk a directory and return all files', async () => {
      // Create test structure
      writeFileSync(join(testDir, 'file1.txt'), 'content1');
      writeFileSync(join(testDir, 'file2.txt'), 'content2');
      mkdirSync(join(testDir, 'subdir'));
      writeFileSync(join(testDir, 'subdir', 'file3.txt'), 'content3');

      const files = await walkDirectoryAsync(testDir);

      expect(files.length).toBe(3);
      expect(files).toContain(join(testDir, 'file1.txt'));
      expect(files).toContain(join(testDir, 'file2.txt'));
      expect(files).toContain(join(testDir, 'subdir', 'file3.txt'));
    });

    it('should return empty array for non-existent directory', async () => {
      const files = await walkDirectoryAsync(join(testDir, 'non-existent'));

      expect(files).toEqual([]);
    });

    it('should respect shouldExclude option', async () => {
      writeFileSync(join(testDir, 'file1.txt'), 'content1');
      writeFileSync(join(testDir, 'file2.txt'), 'content2');
      mkdirSync(join(testDir, 'excluded'));
      writeFileSync(join(testDir, 'excluded', 'file3.txt'), 'content3');

      const files = await walkDirectoryAsync(testDir, {
        shouldExclude: (path) => path.includes('excluded'),
      });

      expect(files.length).toBe(2);
      expect(files).toContain(join(testDir, 'file1.txt'));
      expect(files).toContain(join(testDir, 'file2.txt'));
    });

    it('should handle shallow mode for underscore directories', async () => {
      writeFileSync(join(testDir, 'file1.txt'), 'content1');
      mkdirSync(join(testDir, 'subdir'));
      mkdirSync(join(testDir, 'subdir', '_special'));
      writeFileSync(join(testDir, 'subdir', '_special', 'file2.txt'), 'content2');

      const files = await walkDirectoryAsync(testDir, {
        shallow: true,
        rootDir: testDir,
      });

      expect(files.length).toBe(1);
      expect(files).toContain(join(testDir, 'file1.txt'));
    });
  });

  describe('readFilesParallel', () => {
    it('should read multiple files in parallel', async () => {
      const file1 = join(testDir, 'file1.txt');
      const file2 = join(testDir, 'file2.txt');
      const file3 = join(testDir, 'file3.txt');

      writeFileSync(file1, 'content1');
      writeFileSync(file2, 'content2');
      writeFileSync(file3, 'content3');

      const results = await readFilesParallel([file1, file2, file3]);

      expect(results.size).toBe(3);
      expect(results.get(file1)).toBe('content1');
      expect(results.get(file2)).toBe('content2');
      expect(results.get(file3)).toBe('content3');
    });

    it('should skip files that cannot be read', async () => {
      const file1 = join(testDir, 'file1.txt');
      const file2 = join(testDir, 'non-existent.txt');

      writeFileSync(file1, 'content1');

      const results = await readFilesParallel([file1, file2]);

      expect(results.size).toBe(1);
      expect(results.get(file1)).toBe('content1');
      expect(results.has(file2)).toBe(false);
    });

    it('should respect concurrency limit', async () => {
      // Create many files
      const files: string[] = [];
      for (let i = 0; i < 20; i++) {
        const file = join(testDir, `file${i}.txt`);
        writeFileSync(file, `content${i}`);
        files.push(file);
      }

      // Read with low concurrency
      const results = await readFilesParallel(files, 'utf-8', 5);

      expect(results.size).toBe(20);
      for (let i = 0; i < 20; i++) {
        expect(results.get(files[i]!)).toBe(`content${i}`);
      }
    });
  });

  describe('statFilesParallel', () => {
    it('should stat multiple files in parallel', async () => {
      const file1 = join(testDir, 'file1.txt');
      const file2 = join(testDir, 'file2.txt');

      writeFileSync(file1, 'short');
      writeFileSync(file2, 'longer content here');

      const results = await statFilesParallel([file1, file2]);

      expect(results.size).toBe(2);
      expect(results.get(file1)?.size).toBe(5); // 'short' = 5 bytes
      expect(results.get(file2)?.size).toBe(19); // 'longer content here' = 19 bytes
      // Check that mtime is a valid date by checking it can be converted to a number
      expect(typeof results.get(file1)?.mtime?.getTime()).toBe('number');
      expect(typeof results.get(file2)?.mtime?.getTime()).toBe('number');
    });

    it('should skip files that cannot be stat', async () => {
      const file1 = join(testDir, 'file1.txt');
      const file2 = join(testDir, 'non-existent.txt');

      writeFileSync(file1, 'content');

      const results = await statFilesParallel([file1, file2]);

      expect(results.size).toBe(1);
      expect(results.has(file1)).toBe(true);
      expect(results.has(file2)).toBe(false);
    });
  });

  describe('parallelMap', () => {
    it('should process items in parallel', async () => {
      const items = [1, 2, 3, 4, 5];
      const processor = async (n: number) => n * 2;

      const results = await parallelMap(items, processor);

      // Results should be in input order
      expect(results).toEqual([2, 4, 6, 8, 10]);
    });

    it('should respect concurrency limit', async () => {
      const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      let maxConcurrent = 0;
      let currentConcurrent = 0;

      const processor = async (n: number) => {
        currentConcurrent++;
        maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
        await new Promise((resolve) => setTimeout(resolve, 10));
        currentConcurrent--;
        return n * 2;
      };

      await parallelMap(items, processor, 3);

      // The concurrency limit should be respected
      expect(maxConcurrent).toBeLessThanOrEqual(3);
    });

    it('should handle empty array', async () => {
      const results = await parallelMap([], async (n: number) => n * 2);

      expect(results).toEqual([]);
    });
  });

  describe('batchProcess', () => {
    it('should process items in batches', async () => {
      const items = Array.from({ length: 100 }, (_, i) => i);
      const processor = async (n: number) => n * 2;

      const { batchProcess } = await import('../parallel-fs');
      const results = await batchProcess(items, processor, { batchSize: 20 });

      expect(results.length).toBe(100);
      for (let i = 0; i < 100; i++) {
        expect(results[i]).toBe(i * 2);
      }
    });

    it('should report progress', async () => {
      const items = Array.from({ length: 50 }, (_, i) => i);
      const processor = async (n: number) => n * 2;
      const progressReports: { processed: number; total: number }[] = [];

      const { batchProcess } = await import('../parallel-fs');
      await batchProcess(items, processor, {
        batchSize: 10,
        onProgress: (processed, total) => {
          progressReports.push({ processed, total });
        },
      });

      // Should have 5 progress reports (50 items / 10 batch size)
      expect(progressReports.length).toBe(5);
      expect(progressReports[0]).toEqual({ processed: 10, total: 50 });
      expect(progressReports[4]).toEqual({ processed: 50, total: 50 });
    });

    it('should handle errors with onError callback', async () => {
      const items = [1, 2, 3, 4, 5];
      const processor = async (n: number) => {
        if (n === 3) throw new Error('Test error');
        return n * 2;
      };
      const errors: Error[] = [];

      const { batchProcess } = await import('../parallel-fs');
      const results = await batchProcess(items, processor, {
        batchSize: 5,
        onError: (error) => {
          errors.push(error);
          return true; // Continue processing
        },
      });

      expect(results.length).toBe(5);
      expect(results[0]).toBe(2);
      expect(results[1]).toBe(4);
      expect(results[2]).toBeNull(); // Failed item
      expect(results[3]).toBe(8);
      expect(results[4]).toBe(10);
      expect(errors.length).toBe(1);
      expect(errors[0]!.message).toBe('Test error');
    });

    it('should throw error when onError not provided', async () => {
      const items = [1, 2, 3];
      const processor = async (n: number) => {
        if (n === 2) throw new Error('Test error');
        return n * 2;
      };

      const { batchProcess } = await import('../parallel-fs');
      await expect(batchProcess(items, processor, { batchSize: 5 })).rejects.toThrow('Test error');
    });
  });

  describe('MemoryTracker', () => {
    it('should track memory samples', async () => {
      const { MemoryTracker } = await import('../parallel-fs');
      const tracker = new MemoryTracker();

      tracker.start();

      // Generate some memory allocations
      const arrays: number[][] = [];
      for (let i = 0; i < 10; i++) {
        arrays.push(new Array(10000).fill(i));
        tracker.sample();
      }

      const results = tracker.getResults();

      expect(results.startMemory).not.toBeNull();
      expect(results.endMemory).not.toBeNull();
      expect(results.samples.length).toBe(11); // 1 start + 10 samples
      expect(results.peakHeapUsed).toBeGreaterThan(0);
      expect(results.avgHeapUsed).toBeGreaterThan(0);
    });

    it('should handle reset', async () => {
      const { MemoryTracker } = await import('../parallel-fs');
      const tracker = new MemoryTracker();

      tracker.start();
      tracker.sample();
      tracker.reset();

      const results = tracker.getResults();

      expect(results.startMemory).toBeNull();
      expect(results.samples.length).toBe(0);
    });

    it('should throw error when sample() called before start()', async () => {
      const { MemoryTracker } = await import('../parallel-fs');
      const tracker = new MemoryTracker();

      expect(() => tracker.sample()).toThrow('MemoryTracker: sample() called before start()');
    });
  });

  describe('getMemoryStats and formatBytes', () => {
    it('should return memory statistics', async () => {
      const { getMemoryStats } = await import('../parallel-fs');
      const stats = getMemoryStats();

      expect(stats.heapUsed).toBeGreaterThan(0);
      expect(stats.heapTotal).toBeGreaterThan(0);
      expect(stats.rss).toBeGreaterThan(0);
      expect(typeof stats.external).toBe('number');
    });

    it('should format bytes correctly', async () => {
      const { formatBytes } = await import('../parallel-fs');

      expect(formatBytes(500)).toBe('500 B');
      expect(formatBytes(1024)).toBe('1.0 KB');
      expect(formatBytes(1536)).toBe('1.5 KB');
      expect(formatBytes(1024 * 1024)).toBe('1.0 MB');
      expect(formatBytes(1.5 * 1024 * 1024)).toBe('1.5 MB');
      expect(formatBytes(1024 * 1024 * 1024)).toBe('1.00 GB');
    });

    it('should format bytes correctly for edge cases', async () => {
      const { formatBytes } = await import('../parallel-fs');

      // Zero bytes
      expect(formatBytes(0)).toBe('0 B');

      // Negative values (e.g., from memory delta calculations)
      expect(formatBytes(-500)).toBe('-500 B');
      expect(formatBytes(-1024)).toBe('-1.0 KB');
      expect(formatBytes(-1.5 * 1024 * 1024)).toBe('-1.5 MB');
      expect(formatBytes(-1024 * 1024 * 1024)).toBe('-1.00 GB');
    });
  });
});

describe('Site parallel file reading performance', () => {
  const testDir = join(__dirname, '../../../../tmp/test-site-parallel-perf');

  beforeEach(() => {
    // Clean up and create fresh test directory
    if (rmSync) {
      rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    if (rmSync) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should read many files efficiently', async () => {
    // Create a site with many files
    const numFiles = 100;

    // Create pages
    for (let i = 0; i < numFiles; i++) {
      writeFileSync(
        join(testDir, `page${i}.md`),
        `---
title: Page ${i}
---
Content for page ${i}`
      );
    }

    // Import Site dynamically to avoid circular deps
    const { Site } = await import('../../core/Site');

    const site = new Site(testDir);

    const startTime = Date.now();
    await site.read();
    const endTime = Date.now();

    expect(site.pages.length).toBe(numFiles);

    // Verify all pages were read correctly
    for (let i = 0; i < numFiles; i++) {
      const page = site.pages.find((p: Document) => p.data.title === `Page ${i}`);
      expect(page).toBeDefined();
    }

    // Log timing for reference (not a hard assertion)
    console.log(`Read ${numFiles} files in ${endTime - startTime}ms`);
  });

  it('should read mixed content types efficiently', async () => {
    // Create posts
    const postsDir = join(testDir, '_posts');
    mkdirSync(postsDir);
    for (let i = 0; i < 50; i++) {
      writeFileSync(
        join(postsDir, `2024-01-${String(i + 1).padStart(2, '0')}-post${i}.md`),
        `---
title: Post ${i}
---
Post content ${i}`
      );
    }

    // Create pages
    for (let i = 0; i < 30; i++) {
      writeFileSync(
        join(testDir, `page${i}.md`),
        `---
title: Page ${i}
---
Page content ${i}`
      );
    }

    // Create static files
    for (let i = 0; i < 20; i++) {
      writeFileSync(join(testDir, `asset${i}.txt`), `Static content ${i}`);
    }

    // Import Site dynamically
    const { Site } = await import('../../core/Site');

    const site = new Site(testDir);

    const startTime = Date.now();
    await site.read();
    const endTime = Date.now();

    expect(site.posts.length).toBe(50);
    expect(site.pages.length).toBe(30);
    expect(site.static_files.length).toBe(20);

    console.log(
      `Read ${site.posts.length} posts, ${site.pages.length} pages, ${site.static_files.length} static files in ${endTime - startTime}ms`
    );
  });
});
