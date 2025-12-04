/**
 * Utility functions for Jekyll.js
 * This module contains helper functions and utilities
 */

export { logger } from './logger';
export {
  JekyllError,
  ConfigError,
  FrontMatterError,
  TemplateError,
  MarkdownError,
  BuildError,
  FileSystemError,
  wrapError,
  parseErrorLocation,
} from './errors';
export { FileWatcher, type WatcherOptions } from './watcher';
export { escapeHtml, escapeJs } from './html';
export { PerformanceTimer, type TimedOperation, type BuildTimings } from './timer';
export {
  walkDirectoryAsync,
  readFilesParallel,
  statFilesParallel,
  parallelMap,
  batchProcess,
  getMemoryStats,
  formatBytes,
  MemoryTracker,
  type WalkOptions,
  type MemoryStats,
  type BatchProcessorOptions,
} from './parallel-fs';
export {
  ProgressIndicator,
  Spinner,
  createProgressIndicator,
  createSpinner,
  type ProgressOptions,
} from './progress';
export {
  isPathWithinBase,
  validateAndResolvePath,
  sanitizeUrlPath,
  resolveUrlToFilePath,
  isPermalinkSafe,
  sanitizePermalink,
  PathTraversalError,
} from './path-security';
