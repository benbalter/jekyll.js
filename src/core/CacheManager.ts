import { existsSync, readFileSync, writeFileSync, mkdirSync, statSync, renameSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';

/**
 * Metadata for a cached file
 */
export interface FileCacheEntry {
  /** File path relative to source */
  path: string;
  /** Last modification time */
  mtime: number;
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
  /** Config file modification time (triggers full rebuild when changed) */
  configMtime: number;
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
  private sourceDir: string;
  private readonly version = '1.1.0';
  private configChanged: boolean = false;

  /**
   * Create a new CacheManager
   * @param cacheDir Directory to store cache metadata
   */
  constructor(cacheDir: string) {
    this.sourceDir = cacheDir;
    this.cacheFile = join(cacheDir, '.jekyll-cache', 'incremental.json');
    this.metadata = this.loadCache();
    this.checkConfigChange();
  }

  /**
   * Check if config file has changed and invalidate cache if so
   */
  private checkConfigChange(): void {
    const configPath = join(this.sourceDir, '_config.yml');
    if (existsSync(configPath)) {
      try {
        const stats = statSync(configPath);
        // Use epsilon comparison for mtime
        if (this.metadata.configMtime > 0 && Math.abs(stats.mtimeMs - this.metadata.configMtime) > 1) {
          // Config changed - clear cache and mark for full rebuild
          this.configChanged = true;
          this.metadata.files = {};
        }
        this.metadata.configMtime = stats.mtimeMs;
      } catch {
        // If we can't stat the config, just continue
      }
    }
  }

  /**
   * Check if a full rebuild is required due to config changes
   */
  requiresFullRebuild(): boolean {
    return this.configChanged;
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
    } catch {
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
      configMtime: 0,
      files: {},
    };
  }

  /**
   * Save cache to disk using atomic write (write to temp file, then rename)
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

      // Write to temp file first (atomic write)
      const tempFile = this.cacheFile + '.tmp';
      writeFileSync(tempFile, JSON.stringify(this.metadata, null, 2), 'utf-8');
      
      // Rename temp file to actual cache file (atomic operation)
      renameSync(tempFile, this.cacheFile);
    } catch (error) {
      // Clean up temp file if it exists
      try {
        const tempFile = this.cacheFile + '.tmp';
        if (existsSync(tempFile)) {
          unlinkSync(tempFile);
        }
      } catch {
        // Ignore cleanup errors
      }
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
      
      // Use epsilon comparison to avoid false positives due to timestamp precision
      if (Math.abs(stats.mtimeMs - cached.mtime) > 1) {
        return true;
      }

      return false;
    } catch {
      // If we can't stat the file, consider it changed
      return true;
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

      this.metadata.files[relativePath] = {
        path: relativePath,
        mtime: stats.mtimeMs,
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
   * Get all cached file paths
   */
  getCachedFiles(): string[] {
    return Object.keys(this.metadata.files);
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
