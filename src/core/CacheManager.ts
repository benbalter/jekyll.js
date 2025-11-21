import { existsSync, readFileSync, writeFileSync, mkdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { createHash } from 'crypto';

/**
 * Metadata for a cached file
 */
export interface FileCacheEntry {
  /** File path relative to source */
  path: string;
  /** Last modification time */
  mtime: number;
  /** Content hash (MD5) */
  hash: string;
  /** Dependencies (files that affect this file's output) */
  dependencies: string[];
}

/**
 * Build cache metadata
 */
export interface CacheMetadata {
  /** Cache format version */
  version: string;
  /** Last build timestamp */
  lastBuild: number;
  /** Cached files */
  files: Record<string, FileCacheEntry>;
}

/**
 * CacheManager handles build cache for incremental builds
 * Tracks file modifications and dependencies to determine what needs rebuilding
 */
export class CacheManager {
  private metadata: CacheMetadata;
  private cacheFile: string;
  private readonly version = '1.0.0';

  /**
   * Create a new CacheManager
   * @param cacheDir Directory to store cache metadata
   */
  constructor(cacheDir: string) {
    this.cacheFile = join(cacheDir, '.jekyll-cache', 'incremental.json');
    this.metadata = this.loadCache();
  }

  /**
   * Load cache from disk
   */
  private loadCache(): CacheMetadata {
    if (!existsSync(this.cacheFile)) {
      return this.createEmptyCache();
    }

    try {
      const content = readFileSync(this.cacheFile, 'utf-8');
      const cache = JSON.parse(content) as CacheMetadata;

      // Validate version
      if (cache.version !== this.version) {
        return this.createEmptyCache();
      }

      return cache;
    } catch (error) {
      // If cache is corrupted, start fresh
      return this.createEmptyCache();
    }
  }

  /**
   * Create empty cache metadata
   */
  private createEmptyCache(): CacheMetadata {
    return {
      version: this.version,
      lastBuild: 0,
      files: {},
    };
  }

  /**
   * Save cache to disk
   */
  save(): void {
    try {
      // Ensure cache directory exists
      const cacheDir = dirname(this.cacheFile);
      if (!existsSync(cacheDir)) {
        mkdirSync(cacheDir, { recursive: true });
      }

      // Update last build time
      this.metadata.lastBuild = Date.now();

      // Write cache file
      writeFileSync(this.cacheFile, JSON.stringify(this.metadata, null, 2), 'utf-8');
    } catch (error) {
      // Don't fail the build if cache can't be saved
      console.warn('Warning: Failed to save build cache:', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Check if a file has changed since last build
   * @param filePath Absolute path to file
   * @param relativePath Path relative to source
   * @returns true if file has changed or is new
   */
  hasChanged(filePath: string, relativePath: string): boolean {
    const cached = this.metadata.files[relativePath];
    
    // If not in cache, it's new
    if (!cached) {
      return true;
    }

    // Check if file still exists
    if (!existsSync(filePath)) {
      return true;
    }

    try {
      const stats = statSync(filePath);
      
      // Check modification time first (fast check)
      if (stats.mtimeMs !== cached.mtime) {
        return true;
      }

      // If mtime matches, assume content hasn't changed
      // (calculating hash is expensive and mtime should be sufficient)
      return false;
    } catch (error) {
      // If we can't stat the file, consider it changed
      return true;
    }
  }

  /**
   * Calculate hash of file content
   * @param filePath Absolute path to file
   * @returns MD5 hash of content
   */
  private calculateHash(filePath: string): string {
    try {
      const content = readFileSync(filePath, 'utf-8');
      return createHash('md5').update(content).digest('hex');
    } catch (error) {
      return '';
    }
  }

  /**
   * Update cache entry for a file
   * @param filePath Absolute path to file
   * @param relativePath Path relative to source
   * @param dependencies List of dependency paths (relative to source)
   */
  updateFile(filePath: string, relativePath: string, dependencies: string[] = []): void {
    try {
      const stats = statSync(filePath);
      const hash = this.calculateHash(filePath);

      this.metadata.files[relativePath] = {
        path: relativePath,
        mtime: stats.mtimeMs,
        hash,
        dependencies,
      };
    } catch (error) {
      // Don't fail if we can't update cache for a file
      console.warn(`Warning: Failed to update cache for ${relativePath}:`, error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Remove a file from cache
   * @param relativePath Path relative to source
   */
  removeFile(relativePath: string): void {
    delete this.metadata.files[relativePath];
  }

  /**
   * Check if any dependencies of a file have changed
   * @param relativePath Path relative to source
   * @param sourcePath Absolute path to source directory
   * @returns true if any dependency has changed
   */
  hasDependencyChanges(relativePath: string, sourcePath: string): boolean {
    const cached = this.metadata.files[relativePath];
    
    if (!cached) {
      return false; // File not in cache, no dependencies to check
    }

    // Check each dependency
    for (const depPath of cached.dependencies) {
      const depAbsPath = join(sourcePath, depPath);
      
      if (this.hasChanged(depAbsPath, depPath)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Clear all cache data
   */
  clear(): void {
    this.metadata = this.createEmptyCache();
  }

  /**
   * Get cache statistics
   */
  getStats(): { fileCount: number; lastBuild: Date | null } {
    return {
      fileCount: Object.keys(this.metadata.files).length,
      lastBuild: this.metadata.lastBuild > 0 ? new Date(this.metadata.lastBuild) : null,
    };
  }
}
