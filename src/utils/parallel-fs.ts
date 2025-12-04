/**
 * Parallel file system utilities for improved performance on large sites
 * Uses async/await with fs/promises to enable concurrent file operations
 */

import { readdir, stat, readFile } from 'fs/promises';
import { join } from 'path';

/**
 * Options for parallel directory walking
 */
export interface WalkOptions {
  /** Maximum concurrency for file operations (default: 10) */
  concurrency?: number;
  /** Filter function to exclude paths (return true to exclude) */
  shouldExclude?: (path: string) => boolean;
  /** For shallow walks, skip underscore directories except at root */
  shallow?: boolean;
  /** Root directory for shallow mode comparison */
  rootDir?: string;
}

/**
 * Memory usage statistics
 */
export interface MemoryStats {
  /** Heap used in bytes */
  heapUsed: number;
  /** Heap total in bytes */
  heapTotal: number;
  /** External memory in bytes */
  external: number;
  /** RSS (resident set size) in bytes */
  rss: number;
}

/**
 * Get current memory usage statistics
 * @returns Memory usage stats from V8/Node.js
 */
export function getMemoryStats(): MemoryStats {
  const memUsage = process.memoryUsage();
  return {
    heapUsed: memUsage.heapUsed,
    heapTotal: memUsage.heapTotal,
    external: memUsage.external,
    rss: memUsage.rss,
  };
}

/**
 * Format bytes to human-readable string
 * @param bytes Number of bytes
 * @returns Formatted string (e.g., "1.5 MB")
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Default concurrency limit to avoid overwhelming the file system
 * Can be tuned based on system capabilities
 */
const DEFAULT_CONCURRENCY = 10;

/**
 * Process items in parallel with a concurrency limit
 * @param items Items to process
 * @param processor Async function to process each item
 * @param concurrency Maximum number of concurrent operations
 * @returns Array of results in input order
 */
export async function parallelMap<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  concurrency: number = DEFAULT_CONCURRENCY
): Promise<R[]> {
  const results: (R | undefined)[] = new Array(items.length);
  const executing: Promise<void>[] = [];
  let index = 0;

  const enqueue = (i: number, item: T): Promise<void> => {
    const promise = processor(item).then((result) => {
      results[i] = result;
    });
    const wrapped = promise.finally(() => {
      executing.splice(executing.indexOf(wrapped), 1);
    });
    executing.push(wrapped);
    return wrapped;
  };

  for (const item of items) {
    if (executing.length >= concurrency) {
      await Promise.race(executing);
    }
    enqueue(index++, item);
  }

  await Promise.all(executing);
  return results as R[];
}

/**
 * Walk a directory recursively and return all file paths asynchronously
 * This enables parallel file discovery which is faster on large sites
 * @param dir Directory to walk
 * @param options Walk options
 * @returns Promise resolving to array of file paths
 */
export async function walkDirectoryAsync(
  dir: string,
  options: WalkOptions = {}
): Promise<string[]> {
  const { shouldExclude, shallow = false, rootDir } = options;

  const files: string[] = [];

  try {
    const entries = await readdir(dir);

    // Process entries in parallel batches
    const statPromises = entries.map(async (entry) => {
      const fullPath = join(dir, entry);

      // Check exclusion
      if (shouldExclude && shouldExclude(fullPath)) {
        return null;
      }

      try {
        const stats = await stat(fullPath);

        if (stats.isDirectory()) {
          // For shallow walks, skip underscore directories except at root
          if (shallow && entry.startsWith('_') && dir !== rootDir) {
            return null;
          }

          // Recursively walk subdirectory
          return walkDirectoryAsync(fullPath, options);
        } else if (stats.isFile()) {
          return fullPath;
        }
      } catch {
        // Skip files/directories that can't be stat'd
        return null;
      }

      return null;
    });

    const results = await Promise.all(statPromises);

    for (const result of results) {
      if (result === null) {
        continue;
      }
      if (Array.isArray(result)) {
        files.push(...result);
      } else {
        files.push(result);
      }
    }
  } catch {
    // Directory doesn't exist or can't be read
    return files;
  }

  return files;
}

/**
 * Read multiple files in parallel
 * @param paths Array of file paths to read
 * @param encoding File encoding (default: utf-8)
 * @param concurrency Maximum concurrent reads
 * @returns Map of path to file content
 */
export async function readFilesParallel(
  paths: string[],
  encoding: BufferEncoding = 'utf-8',
  concurrency: number = DEFAULT_CONCURRENCY
): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  const chunks: string[][] = [];

  // Split into chunks for controlled concurrency
  for (let i = 0; i < paths.length; i += concurrency) {
    chunks.push(paths.slice(i, i + concurrency));
  }

  for (const chunk of chunks) {
    const reads = await Promise.all(
      chunk.map(async (path) => {
        try {
          const content = await readFile(path, encoding);
          return { path, content };
        } catch {
          return { path, content: null };
        }
      })
    );

    for (const { path, content } of reads) {
      if (content !== null) {
        results.set(path, content);
      }
    }
  }

  return results;
}

/**
 * Get file stats for multiple files in parallel
 * @param paths Array of file paths
 * @param concurrency Maximum concurrent stat operations
 * @returns Map of path to stat result (mtime and size)
 */
export async function statFilesParallel(
  paths: string[],
  concurrency: number = DEFAULT_CONCURRENCY
): Promise<Map<string, { mtime: Date; size: number }>> {
  const results = new Map<string, { mtime: Date; size: number }>();
  const chunks: string[][] = [];

  // Split into chunks for controlled concurrency
  for (let i = 0; i < paths.length; i += concurrency) {
    chunks.push(paths.slice(i, i + concurrency));
  }

  for (const chunk of chunks) {
    const stats = await Promise.all(
      chunk.map(async (path) => {
        try {
          const s = await stat(path);
          return { path, mtime: s.mtime, size: s.size };
        } catch {
          return { path, mtime: null, size: null };
        }
      })
    );

    for (const { path, mtime, size } of stats) {
      if (mtime !== null && size !== null) {
        results.set(path, { mtime, size });
      }
    }
  }

  return results;
}

/**
 * Options for batched processing
 */
export interface BatchProcessorOptions<T> {
  /** Batch size for processing (default: 50) */
  batchSize?: number;
  /** Concurrency within each batch (default: 10) */
  concurrency?: number;
  /** Optional progress callback */
  onProgress?: (processed: number, total: number) => void;
  /** Optional error handler - return true to continue processing */
  onError?: (error: Error, item: T) => boolean;
}

/**
 * Process items in batches with memory-efficient chunking
 * Useful for large collections where processing all items at once would consume too much memory
 *
 * @param items Array of items to process
 * @param processor Async function to process each item
 * @param options Batch processing options
 * @returns Array of results (null for failed items if onError returns true)
 */
export async function batchProcess<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  options: BatchProcessorOptions<T> = {}
): Promise<(R | null)[]> {
  const { batchSize = 50, concurrency = DEFAULT_CONCURRENCY, onProgress, onError } = options;

  const results: (R | null)[] = new Array(items.length);
  let processedCount = 0;

  // Process in batches
  for (let batchStart = 0; batchStart < items.length; batchStart += batchSize) {
    const batchEnd = Math.min(batchStart + batchSize, items.length);
    const batch = items.slice(batchStart, batchEnd);

    // Process batch items with concurrency control
    const batchResults = await parallelMap(
      batch.map((item, localIndex) => ({ item, globalIndex: batchStart + localIndex })),
      async ({ item, globalIndex }) => {
        try {
          const result = await processor(item);
          return { globalIndex, result, error: null };
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          if (onError && onError(err, item)) {
            return { globalIndex, result: null, error: null };
          }
          return { globalIndex, result: null, error: err };
        }
      },
      concurrency
    );

    // Store results and handle any errors
    for (const { globalIndex, result, error } of batchResults) {
      if (error) {
        throw error;
      }
      results[globalIndex] = result;
    }

    processedCount += batch.length;

    // Report progress if callback provided
    if (onProgress) {
      onProgress(processedCount, items.length);
    }
  }

  return results;
}

/**
 * Track memory usage over time during a process
 */
export class MemoryTracker {
  private samples: MemoryStats[] = [];
  private startMemory: MemoryStats | null = null;

  /**
   * Start tracking memory usage
   */
  start(): void {
    this.samples = [];
    this.startMemory = getMemoryStats();
    this.samples.push(this.startMemory);
  }

  /**
   * Sample current memory usage
   */
  sample(): void {
    this.samples.push(getMemoryStats());
  }

  /**
   * Get memory tracking results
   */
  getResults(): {
    startMemory: MemoryStats | null;
    endMemory: MemoryStats | null;
    peakHeapUsed: number;
    avgHeapUsed: number;
    memoryDelta: number;
    samples: MemoryStats[];
  } {
    if (this.samples.length === 0) {
      return {
        startMemory: null,
        endMemory: null,
        peakHeapUsed: 0,
        avgHeapUsed: 0,
        memoryDelta: 0,
        samples: [],
      };
    }

    const startMemory = this.samples[0] ?? null;
    const endMemory = this.samples[this.samples.length - 1] ?? null;

    let peakHeapUsed = 0;
    let totalHeapUsed = 0;

    for (const sample of this.samples) {
      peakHeapUsed = Math.max(peakHeapUsed, sample.heapUsed);
      totalHeapUsed += sample.heapUsed;
    }

    const avgHeapUsed = this.samples.length > 0 ? totalHeapUsed / this.samples.length : 0;
    const memoryDelta = endMemory && startMemory ? endMemory.heapUsed - startMemory.heapUsed : 0;

    return {
      startMemory,
      endMemory,
      peakHeapUsed,
      avgHeapUsed,
      memoryDelta,
      samples: [...this.samples],
    };
  }

  /**
   * Reset the tracker
   */
  reset(): void {
    this.samples = [];
    this.startMemory = null;
  }
}
