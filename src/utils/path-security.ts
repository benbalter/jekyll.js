/**
 * Path security utilities for preventing directory traversal attacks
 *
 * These utilities ensure that user-provided paths cannot escape their intended
 * boundaries, preventing access to files outside the site source/destination.
 */

import { resolve, relative, normalize, join } from 'path';

/**
 * Error thrown when a path traversal attempt is detected
 */
export class PathTraversalError extends Error {
  constructor(
    message: string,
    public readonly attemptedPath: string,
    public readonly basePath: string
  ) {
    super(message);
    this.name = 'PathTraversalError';
  }
}

/**
 * Check if a resolved path is safely within a base directory
 *
 * @param basePath - The base directory that the path must be within
 * @param targetPath - The path to check (can be relative or absolute)
 * @returns true if the path is safely within the base directory
 *
 * @example
 * // Safe paths
 * isPathWithinBase('/site', '/site/pages/about.md') // true
 * isPathWithinBase('/site', 'pages/about.md') // true
 *
 * // Unsafe paths (directory traversal attempts)
 * isPathWithinBase('/site', '/site/../etc/passwd') // false
 * isPathWithinBase('/site', '../../../etc/passwd') // false
 */
export function isPathWithinBase(basePath: string, targetPath: string): boolean {
  // Resolve both paths to absolute, normalized forms
  const resolvedBase = resolve(basePath);
  // When targetPath is absolute, resolve ignores basePath and returns targetPath normalized
  // When targetPath is relative, resolve combines them
  const resolvedTarget = resolve(basePath, targetPath);

  // Get the relative path from base to target
  const relativePath = relative(resolvedBase, resolvedTarget);

  // If the relative path starts with '..', the target is outside the base
  // An empty relative path means the paths are equal (which is safe)
  if (relativePath.startsWith('..') || relativePath.startsWith('/')) {
    return false;
  }

  // On Windows, check for drive letter or UNC path root changes
  if (process.platform === 'win32') {
    // Handle both drive letters (C:) and UNC paths (\\server\share)
    const baseRoot = getWindowsRoot(resolvedBase);
    const targetRoot = getWindowsRoot(resolvedTarget);
    if (baseRoot !== targetRoot) {
      return false;
    }
  }

  return true;
}

/**
 * Get the root of a Windows path (drive letter or UNC server/share)
 * @param p - Path to get root from
 * @returns The root portion of the path
 */
function getWindowsRoot(p: string): string {
  // UNC path: \\server\share\...
  if (p.startsWith('\\\\')) {
    const parts = p.split('\\');
    // Return \\server\share
    return parts.slice(0, 4).join('\\').toLowerCase();
  }
  // Drive letter: C:\...
  if (/^[a-zA-Z]:/.test(p)) {
    return p.substring(0, 2).toLowerCase();
  }
  return '';
}

/**
 * Validate and resolve a path, throwing an error if it escapes the base directory
 *
 * @param basePath - The base directory that the path must be within
 * @param targetPath - The path to validate and resolve
 * @param pathDescription - Human-readable description for error messages (e.g., "include file", "output path")
 * @returns The resolved absolute path
 * @throws PathTraversalError if the path escapes the base directory
 *
 * @example
 * // Safe usage
 * const safePath = validateAndResolvePath('/site', 'pages/about.md', 'page');
 * // Returns: '/site/pages/about.md'
 *
 * // Unsafe usage - throws PathTraversalError
 * validateAndResolvePath('/site', '../etc/passwd', 'include file');
 * // Throws: PathTraversalError: Path traversal detected in include file: ...
 */
export function validateAndResolvePath(
  basePath: string,
  targetPath: string,
  pathDescription: string = 'path'
): string {
  const resolvedBase = resolve(basePath);
  const resolvedTarget = resolve(basePath, targetPath);

  if (!isPathWithinBase(resolvedBase, resolvedTarget)) {
    throw new PathTraversalError(
      `Path traversal detected in ${pathDescription}: '${targetPath}' resolves outside the allowed directory '${resolvedBase}'`,
      targetPath,
      resolvedBase
    );
  }

  return resolvedTarget;
}

/**
 * Sanitize a URL path for use in file system operations
 *
 * This function removes potentially dangerous path components and normalizes
 * the path to prevent directory traversal via URL manipulation.
 *
 * @param urlPath - The URL path to sanitize
 * @returns A sanitized path safe for file system operations
 *
 * @example
 * sanitizeUrlPath('/page/about') // 'page/about'
 * sanitizeUrlPath('/../../../etc/passwd') // 'etc/passwd'
 * sanitizeUrlPath('/page/../../../etc/passwd') // 'etc/passwd'
 * sanitizeUrlPath('/page/%2e%2e/secret') // 'page/secret'
 */
export function sanitizeUrlPath(urlPath: string): string {
  // Decode URL encoding to catch encoded traversal attempts
  let decoded: string;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    // If decoding fails, use the original (may contain invalid sequences)
    decoded = urlPath;
  }

  // Remove query string and hash
  let sanitized = decoded.split('?')[0] || '';
  sanitized = sanitized.split('#')[0] || '';

  // Normalize the path to resolve . and .. sequences
  sanitized = normalize(sanitized);

  // Remove leading slashes and backslashes
  sanitized = sanitized.replace(/^[/\\]+/, '');

  // Remove any remaining .. components that normalize didn't catch
  // (this handles edge cases on different platforms)
  const parts = sanitized.split(/[/\\]/);
  const safeParts: string[] = [];

  for (const part of parts) {
    if (part === '..' || part === '.') {
      // Skip parent and current directory references
      continue;
    }
    if (part) {
      safeParts.push(part);
    }
  }

  return safeParts.join('/');
}

/**
 * Resolve a URL path to a file path within a base directory safely
 *
 * Combines URL sanitization with path validation to provide a complete
 * defense against directory traversal via URL manipulation.
 *
 * @param basePath - The base directory (e.g., site destination)
 * @param urlPath - The URL path from an HTTP request
 * @returns The resolved file path guaranteed to be within basePath
 * @throws PathTraversalError if the resulting path would escape basePath
 *
 * @example
 * resolveUrlToFilePath('/var/www', '/css/style.css')
 * // Returns: '/var/www/css/style.css'
 *
 * resolveUrlToFilePath('/var/www', '/../../../etc/passwd')
 * // Returns: '/var/www/etc/passwd' (traversal stripped, path kept within base)
 */
export function resolveUrlToFilePath(basePath: string, urlPath: string): string {
  const sanitized = sanitizeUrlPath(urlPath);
  const resolved = join(resolve(basePath), sanitized);

  // Double-check that the resolved path is within the base
  // This is defense-in-depth in case sanitization missed something
  if (!isPathWithinBase(basePath, resolved)) {
    throw new PathTraversalError(
      `URL path '${urlPath}' resolves outside the allowed directory`,
      urlPath,
      basePath
    );
  }

  return resolved;
}

/**
 * Validate a permalink or URL pattern for safety
 *
 * Permalinks from user content (front matter) could potentially contain
 * path traversal sequences. This validates that they're safe.
 *
 * @param permalink - The permalink pattern or URL
 * @returns true if the permalink is safe
 *
 * @example
 * isPermalinkSafe('/posts/my-post/') // true
 * isPermalinkSafe('/../../../etc/passwd') // false
 * isPermalinkSafe('/posts/../../secret') // false
 */
export function isPermalinkSafe(permalink: string): boolean {
  // Check for .. sequences before normalization
  // This catches traversal attempts even if they would be normalized away
  if (permalink.includes('..')) {
    return false;
  }

  // Also check the normalized form
  const normalized = normalize(permalink);
  if (normalized.includes('..')) {
    return false;
  }

  return true;
}

/**
 * Sanitize a permalink to ensure it's safe for use as an output path
 *
 * @param permalink - The permalink to sanitize
 * @returns A sanitized permalink with traversal attempts removed
 */
export function sanitizePermalink(permalink: string): string {
  // Normalize the path
  let sanitized = normalize(permalink);

  // Replace backslashes with forward slashes for consistency
  sanitized = sanitized.replace(/\\/g, '/');

  // Remove .. and . path components
  const parts = sanitized.split('/');
  const safeParts: string[] = [];

  for (const part of parts) {
    if (part === '..' || part === '.') {
      continue;
    }
    safeParts.push(part);
  }

  sanitized = safeParts.join('/');

  // Ensure it starts with /
  if (!sanitized.startsWith('/')) {
    sanitized = '/' + sanitized;
  }

  // Remove double slashes
  sanitized = sanitized.replace(/\/+/g, '/');

  return sanitized;
}

/**
 * Normalize path separators to forward slashes for consistent cross-platform comparison.
 * This is needed because Windows uses backslashes while Unix uses forward slashes.
 *
 * @param path - The path to normalize
 * @returns Path with forward slashes
 *
 * @example
 * normalizePathSeparators('path\\to\\file') // 'path/to/file'
 * normalizePathSeparators('path/to/file') // 'path/to/file'
 */
export function normalizePathSeparators(path: string): string {
  // Replace backslashes with forward slashes
  return path.replace(/\\/g, '/');
}

/**
 * Check if a path should be excluded based on Jekyll's default rules.
 * Jekyll excludes files/directories starting with '.', '#', or '~' by default
 * unless they are explicitly included.
 *
 * @param relativePath - The path relative to the site source
 * @param excludePatterns - Array of exclude patterns from config
 * @param includePatterns - Array of include patterns from config
 * @returns true if the path should be excluded
 *
 * @example
 * // Hidden files excluded by default
 * shouldExcludePath('.github/file.md', [], []) // true
 *
 * // Can be explicitly included
 * shouldExcludePath('.github/file.md', [], ['.github']) // false
 *
 * // Exclude patterns work
 * shouldExcludePath('docs/file.md', ['/docs'], []) // true
 */
export function shouldExcludePath(
  relativePath: string,
  excludePatterns: string[],
  includePatterns: string[]
): boolean {
  // Normalize path separators for cross-platform compatibility
  const normalizedPath = normalizePathSeparators(relativePath);

  // Get the first part of the path (filename or directory name)
  const parts = normalizedPath.split('/');
  const firstPart = parts[0] || '';

  // Check if path starts with a hidden file marker (dot, hash, or tilde)
  // These are excluded by default in Jekyll unless explicitly included
  const isHiddenByDefault =
    firstPart.startsWith('.') || firstPart.startsWith('#') || firstPart.startsWith('~');

  if (isHiddenByDefault) {
    // Check if explicitly included
    const isExplicitlyIncluded = includePatterns.some((pattern) => {
      const normalizedPattern = normalizePathSeparators(
        pattern.startsWith('/') ? pattern.slice(1) : pattern
      );
      return normalizedPath === normalizedPattern || normalizedPath.startsWith(normalizedPattern + '/');
    });

    if (!isExplicitlyIncluded) {
      return true; // Exclude hidden files by default
    }
  }

  // Check against exclude patterns
  for (const pattern of excludePatterns) {
    // Normalize pattern - remove leading slash if present
    // Jekyll (Ruby) treats patterns with and without leading slashes the same
    const normalizedPattern = normalizePathSeparators(
      pattern.startsWith('/') ? pattern.slice(1) : pattern
    );

    // Simple pattern matching - exact match or starts with
    if (normalizedPath === normalizedPattern || normalizedPath.startsWith(normalizedPattern + '/')) {
      return true;
    }
  }

  return false;
}
