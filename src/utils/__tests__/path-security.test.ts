/**
 * Tests for path security utilities
 */

import {
  isPathWithinBase,
  validateAndResolvePath,
  sanitizeUrlPath,
  resolveUrlToFilePath,
  isPermalinkSafe,
  sanitizePermalink,
  PathTraversalError,
} from '../path-security';
import { resolve, join } from 'path';

describe('path-security', () => {
  describe('isPathWithinBase', () => {
    const basePath = '/home/user/site';

    it('should return true for paths within the base directory', () => {
      expect(isPathWithinBase(basePath, '/home/user/site/pages/about.md')).toBe(true);
      expect(isPathWithinBase(basePath, '/home/user/site/index.html')).toBe(true);
      expect(isPathWithinBase(basePath, '/home/user/site')).toBe(true);
    });

    it('should return true for relative paths within the base', () => {
      expect(isPathWithinBase(basePath, 'pages/about.md')).toBe(true);
      expect(isPathWithinBase(basePath, 'index.html')).toBe(true);
      expect(isPathWithinBase(basePath, '')).toBe(true);
    });

    it('should return false for paths outside the base directory', () => {
      expect(isPathWithinBase(basePath, '/home/user/other')).toBe(false);
      expect(isPathWithinBase(basePath, '/etc/passwd')).toBe(false);
      expect(isPathWithinBase(basePath, '/home/user')).toBe(false);
    });

    it('should return false for directory traversal attempts', () => {
      expect(isPathWithinBase(basePath, '../other')).toBe(false);
      expect(isPathWithinBase(basePath, '../../etc/passwd')).toBe(false);
      expect(isPathWithinBase(basePath, 'pages/../../other')).toBe(false);
      expect(isPathWithinBase(basePath, '/home/user/site/../other')).toBe(false);
      expect(isPathWithinBase(basePath, '/home/user/site/pages/../../other')).toBe(false);
    });

    it('should handle normalized traversal attempts', () => {
      // Paths that look safe but resolve outside
      expect(isPathWithinBase(basePath, '/home/user/site/./../../other')).toBe(false);
      expect(isPathWithinBase(basePath, 'subdir/../../../etc/passwd')).toBe(false);
    });
  });

  describe('validateAndResolvePath', () => {
    const basePath = '/home/user/site';

    it('should return resolved path for safe paths', () => {
      const result = validateAndResolvePath(basePath, 'pages/about.md', 'page');
      expect(result).toBe(resolve(basePath, 'pages/about.md'));
    });

    it('should throw PathTraversalError for unsafe paths', () => {
      expect(() => validateAndResolvePath(basePath, '../etc/passwd', 'include file')).toThrow(
        PathTraversalError
      );
    });

    it('should include path description in error message', () => {
      try {
        validateAndResolvePath(basePath, '../etc/passwd', 'config file');
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(PathTraversalError);
        expect((error as PathTraversalError).message).toContain('config file');
      }
    });

    it('should include attempted path in error', () => {
      try {
        validateAndResolvePath(basePath, '../secret', 'file');
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(PathTraversalError);
        expect((error as PathTraversalError).attemptedPath).toBe('../secret');
      }
    });
  });

  describe('sanitizeUrlPath', () => {
    it('should remove leading slashes', () => {
      expect(sanitizeUrlPath('/page/about')).toBe('page/about');
      expect(sanitizeUrlPath('///page/about')).toBe('page/about');
    });

    it('should handle empty paths', () => {
      expect(sanitizeUrlPath('')).toBe('');
      expect(sanitizeUrlPath('/')).toBe('');
    });

    it('should remove directory traversal sequences', () => {
      expect(sanitizeUrlPath('/../../../etc/passwd')).toBe('etc/passwd');
      expect(sanitizeUrlPath('/page/../../../etc/passwd')).toBe('etc/passwd');
      expect(sanitizeUrlPath('page/../../other')).toBe('other');
    });

    it('should handle URL-encoded traversal attempts', () => {
      // After decoding %2e%2e = '..', normalize resolves page/.. to empty
      // The result is that traversal is stripped
      expect(sanitizeUrlPath('/page/%2e%2e/secret')).toBe('secret');
      expect(sanitizeUrlPath('/%2e%2e/%2e%2e/etc/passwd')).toBe('etc/passwd');
    });

    it('should remove query strings and hash fragments', () => {
      expect(sanitizeUrlPath('/page?query=value')).toBe('page');
      expect(sanitizeUrlPath('/page#anchor')).toBe('page');
      expect(sanitizeUrlPath('/page?query=value#anchor')).toBe('page');
    });

    it('should handle double-encoded paths', () => {
      // %252e = double-encoded '.' (decodes to %2e, then to '.')
      expect(sanitizeUrlPath('/%252e%252e/secret')).toBe('%2e%2e/secret');
    });

    it('should preserve valid path segments', () => {
      expect(sanitizeUrlPath('/assets/css/style.css')).toBe('assets/css/style.css');
      expect(sanitizeUrlPath('/blog/2024/01/post.html')).toBe('blog/2024/01/post.html');
    });
  });

  describe('resolveUrlToFilePath', () => {
    const basePath = '/var/www/site';

    it('should resolve safe URLs to file paths', () => {
      expect(resolveUrlToFilePath(basePath, '/css/style.css')).toBe(
        join(resolve(basePath), 'css/style.css')
      );
      expect(resolveUrlToFilePath(basePath, '/index.html')).toBe(
        join(resolve(basePath), 'index.html')
      );
    });

    it('should neutralize traversal attempts', () => {
      const result = resolveUrlToFilePath(basePath, '/../../../etc/passwd');
      expect(result).toBe(join(resolve(basePath), 'etc/passwd'));
    });

    it('should handle encoded traversal attempts', () => {
      const result = resolveUrlToFilePath(basePath, '/%2e%2e/%2e%2e/secret');
      expect(result).toBe(join(resolve(basePath), 'secret'));
    });
  });

  describe('isPermalinkSafe', () => {
    it('should return true for safe permalinks', () => {
      expect(isPermalinkSafe('/posts/my-post/')).toBe(true);
      expect(isPermalinkSafe('/2024/01/01/title.html')).toBe(true);
      expect(isPermalinkSafe('/about/')).toBe(true);
      expect(isPermalinkSafe('/')).toBe(true);
    });

    it('should return false for permalinks with traversal', () => {
      expect(isPermalinkSafe('/../../../etc/passwd')).toBe(false);
      expect(isPermalinkSafe('/posts/../../secret')).toBe(false);
      expect(isPermalinkSafe('/posts/../../../etc')).toBe(false);
    });
  });

  describe('sanitizePermalink', () => {
    it('should preserve safe permalinks', () => {
      expect(sanitizePermalink('/posts/my-post/')).toBe('/posts/my-post/');
      expect(sanitizePermalink('/about/')).toBe('/about/');
    });

    it('should remove traversal sequences', () => {
      expect(sanitizePermalink('/../../../etc/passwd')).toBe('/etc/passwd');
      expect(sanitizePermalink('/posts/../../secret')).toBe('/secret');
    });

    it('should ensure permalink starts with /', () => {
      expect(sanitizePermalink('posts/my-post')).toBe('/posts/my-post');
    });

    it('should remove double slashes', () => {
      expect(sanitizePermalink('//posts//my-post//')).toBe('/posts/my-post/');
    });

    it('should handle current directory references', () => {
      expect(sanitizePermalink('/./posts/./my-post/')).toBe('/posts/my-post/');
    });
  });

  describe('PathTraversalError', () => {
    it('should have correct properties', () => {
      const error = new PathTraversalError('Test message', '../secret', '/base');

      expect(error.name).toBe('PathTraversalError');
      expect(error.message).toBe('Test message');
      expect(error.attemptedPath).toBe('../secret');
      expect(error.basePath).toBe('/base');
    });

    it('should be instance of Error', () => {
      const error = new PathTraversalError('Test', '../a', '/b');
      expect(error).toBeInstanceOf(Error);
    });
  });
});
