/**
 * Parallel file system utilities for improved performance on large sites
 * Uses async/await with fs/promises to enable concurrent file operations
 */

import { readdir, stat, readFile } from 'fs/promises';
import { join } from 'path';

/**
 * File info returned from walkDirectoryAsync
 */
export interface FileInfo {
  /** Full absolute path to the file */
  path: string;
  /** Whether this is a directory (for intermediate results) */
  isDirectory: boolean;
}

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
 * Default concurrency limit to avoid overwhelming the file system
 * Can be tuned based on system capabilities
 */
const DEFAULT_CONCURRENCY = 10;

/**
 * Process items in parallel with a concurrency limit
 * @param items Items to process
 * @param processor Async function to process each item
 * @param concurrency Maximum number of concurrent operations
 * @returns Array of results
 */
export async function parallelMap<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  concurrency: number = DEFAULT_CONCURRENCY
): Promise<R[]> {
  const results: R[] = [];
  const executing: Promise<void>[] = [];

  for (const item of items) {
    const promise = processor(item).then((result) => {
      results.push(result);
    });

    executing.push(promise);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
      // Remove completed promises
      const completed = executing.filter(
        (p) => (p as unknown as { _resolved?: boolean })._resolved
      );
      executing.splice(0, executing.length, ...executing.filter((p) => !completed.includes(p)));
    }
  }

  await Promise.all(executing);
  return results;
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
