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
  normalizePathSeparators,
  shouldExcludePath,
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

  describe('normalizePathSeparators', () => {
    it('should convert backslashes to forward slashes', () => {
      expect(normalizePathSeparators('path\\to\\file')).toBe('path/to/file');
      expect(normalizePathSeparators('a\\b\\c\\d')).toBe('a/b/c/d');
    });

    it('should preserve forward slashes', () => {
      expect(normalizePathSeparators('path/to/file')).toBe('path/to/file');
      expect(normalizePathSeparators('/absolute/path')).toBe('/absolute/path');
    });

    it('should handle mixed separators', () => {
      expect(normalizePathSeparators('path\\to/mixed\\file')).toBe('path/to/mixed/file');
    });

    it('should handle empty strings', () => {
      expect(normalizePathSeparators('')).toBe('');
    });

    it('should handle paths with no separators', () => {
      expect(normalizePathSeparators('filename.txt')).toBe('filename.txt');
    });

    it('should handle consecutive backslashes', () => {
      expect(normalizePathSeparators('path\\\\double')).toBe('path//double');
    });
  });

  describe('shouldExcludePath', () => {
    describe('hidden files (dot prefix)', () => {
      it('should exclude files starting with dot by default', () => {
        expect(shouldExcludePath('.github', [], [])).toBe(true);
        expect(shouldExcludePath('.gitignore', [], [])).toBe(true);
        expect(shouldExcludePath('.hidden/file.md', [], [])).toBe(true);
      });

      it('should allow explicitly included dot files', () => {
        expect(shouldExcludePath('.github', [], ['.github'])).toBe(false);
        expect(shouldExcludePath('.github/workflows', [], ['.github'])).toBe(false);
        expect(shouldExcludePath('.gitignore', [], ['.gitignore'])).toBe(false);
      });

      it('should handle include patterns with leading slash', () => {
        expect(shouldExcludePath('.github', [], ['/.github'])).toBe(false);
        expect(shouldExcludePath('.github/file.md', [], ['/.github'])).toBe(false);
      });
    });

    describe('hash prefix files', () => {
      it('should exclude files starting with hash by default', () => {
        expect(shouldExcludePath('#temp', [], [])).toBe(true);
        expect(shouldExcludePath('#backup.txt', [], [])).toBe(true);
      });

      it('should allow explicitly included hash files', () => {
        expect(shouldExcludePath('#special', [], ['#special'])).toBe(false);
      });
    });

    describe('tilde prefix files', () => {
      it('should exclude files starting with tilde by default', () => {
        expect(shouldExcludePath('~backup', [], [])).toBe(true);
        expect(shouldExcludePath('~temp.txt', [], [])).toBe(true);
      });

      it('should allow explicitly included tilde files', () => {
        expect(shouldExcludePath('~important', [], ['~important'])).toBe(false);
      });
    });

    describe('exclude patterns', () => {
      it('should exclude exact matches', () => {
        expect(shouldExcludePath('docs', ['docs'], [])).toBe(true);
        expect(shouldExcludePath('vendor', ['vendor'], [])).toBe(true);
      });

      it('should exclude directories and their contents', () => {
        expect(shouldExcludePath('docs/readme.md', ['docs'], [])).toBe(true);
        expect(shouldExcludePath('vendor/bundle/gem.rb', ['vendor'], [])).toBe(true);
      });

      it('should handle exclude patterns with leading slash', () => {
        expect(shouldExcludePath('docs', ['/docs'], [])).toBe(true);
        expect(shouldExcludePath('docs/file.md', ['/docs'], [])).toBe(true);
      });

      it('should not exclude partial matches', () => {
        expect(shouldExcludePath('documentation', ['docs'], [])).toBe(false);
        expect(shouldExcludePath('vendor-scripts', ['vendor'], [])).toBe(false);
      });
    });

    describe('cross-platform paths', () => {
      it('should handle Windows-style paths', () => {
        expect(shouldExcludePath('docs\\file.md', ['docs'], [])).toBe(true);
        expect(shouldExcludePath('.github\\workflows', [], ['.github'])).toBe(false);
      });

      it('should handle mixed path separators', () => {
        expect(shouldExcludePath('docs/sub\\file.md', ['docs'], [])).toBe(true);
      });
    });

    describe('non-excluded paths', () => {
      it('should not exclude regular files', () => {
        expect(shouldExcludePath('index.html', [], [])).toBe(false);
        expect(shouldExcludePath('posts/2024/hello.md', [], [])).toBe(false);
        expect(shouldExcludePath('assets/css/style.css', [], [])).toBe(false);
      });

      it('should not exclude files not matching any pattern', () => {
        expect(shouldExcludePath('src/main.ts', ['docs', 'vendor'], [])).toBe(false);
        expect(shouldExcludePath('README.md', ['node_modules'], [])).toBe(false);
      });
    });
  });
});
