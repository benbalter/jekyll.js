/**
 * Tests for ThemeManager
 */

import { ThemeManager } from '../ThemeManager';
import { JekyllConfig } from '../../config';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('ThemeManager', () => {
  const testDir = join(tmpdir(), 'jekyll-theme-test');
  const themeDir = join(testDir, 'test-theme');
  const nodeModulesDir = join(testDir, 'node_modules');
  const npmThemeDir = join(nodeModulesDir, 'jekyll-theme-test');

  beforeEach(() => {
    // Create test directories
    mkdirSync(testDir, { recursive: true });
    mkdirSync(join(testDir, '_layouts'), { recursive: true });
    mkdirSync(join(testDir, '_includes'), { recursive: true });

    // Create a local theme directory
    mkdirSync(join(themeDir, '_layouts'), { recursive: true });
    mkdirSync(join(themeDir, '_includes'), { recursive: true });
    mkdirSync(join(themeDir, '_sass'), { recursive: true });
    mkdirSync(join(themeDir, 'assets'), { recursive: true });

    // Create a theme in node_modules
    mkdirSync(join(npmThemeDir, '_layouts'), { recursive: true });
    mkdirSync(join(npmThemeDir, '_includes'), { recursive: true });

    // Create test files
    writeFileSync(join(testDir, '_layouts', 'default.html'), '<html>Site Layout</html>');
    writeFileSync(join(testDir, '_includes', 'header.html'), '<header>Site Header</header>');

    writeFileSync(join(themeDir, '_layouts', 'default.html'), '<html>Theme Layout</html>');
    writeFileSync(join(themeDir, '_layouts', 'post.html'), '<html>Theme Post</html>');
    writeFileSync(join(themeDir, '_includes', 'header.html'), '<header>Theme Header</header>');
    writeFileSync(join(themeDir, '_includes', 'footer.html'), '<footer>Theme Footer</footer>');

    writeFileSync(join(npmThemeDir, '_layouts', 'page.html'), '<html>NPM Theme Page</html>');
    writeFileSync(join(npmThemeDir, '_includes', 'nav.html'), '<nav>NPM Theme Nav</nav>');
  });

  afterEach(() => {
    // Clean up - remove test directory if it's in the OS temp directory
    const osTmpDir = tmpdir();
    if (testDir.startsWith(osTmpDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('constructor', () => {
    it('should create a ThemeManager without theme', () => {
      const config: JekyllConfig = {};
      const manager = new ThemeManager(testDir, config);

      expect(manager.hasTheme()).toBe(false);
      expect(manager.getTheme()).toBeNull();
    });

    it('should load theme from local directory', () => {
      const config: JekyllConfig = {
        theme: 'test-theme',
      };
      const manager = new ThemeManager(testDir, config);

      expect(manager.hasTheme()).toBe(true);
      expect(manager.getTheme()).not.toBeNull();
      expect(manager.getTheme()?.name).toBe('test-theme');
    });

    it('should load theme from node_modules', () => {
      const config: JekyllConfig = {
        theme: 'jekyll-theme-test',
      };
      const manager = new ThemeManager(testDir, config);

      expect(manager.hasTheme()).toBe(true);
      expect(manager.getTheme()).not.toBeNull();
      expect(manager.getTheme()?.name).toBe('jekyll-theme-test');
    });

    it('should handle non-existent theme gracefully', () => {
      const config: JekyllConfig = {
        theme: 'non-existent-theme',
      };
      const manager = new ThemeManager(testDir, config);

      expect(manager.hasTheme()).toBe(false);
      expect(manager.getTheme()).toBeNull();
    });
  });

  describe('resolveLayout', () => {
    it('should resolve layout from site directory', () => {
      const config: JekyllConfig = {
        theme: 'test-theme',
      };
      const manager = new ThemeManager(testDir, config);

      const layoutPath = manager.resolveLayout('default');
      expect(layoutPath).toContain('_layouts/default.html');
      expect(layoutPath).toContain(testDir);
    });

    it('should resolve layout from theme when not in site', () => {
      const config: JekyllConfig = {
        theme: 'test-theme',
      };
      const manager = new ThemeManager(testDir, config);

      const layoutPath = manager.resolveLayout('post');
      expect(layoutPath).toContain('_layouts/post.html');
      expect(layoutPath).toContain('test-theme');
    });

    it('should return null for non-existent layout', () => {
      const config: JekyllConfig = {
        theme: 'test-theme',
      };
      const manager = new ThemeManager(testDir, config);

      const layoutPath = manager.resolveLayout('nonexistent');
      expect(layoutPath).toBeNull();
    });

    it('should prioritize site layout over theme layout', () => {
      const config: JekyllConfig = {
        theme: 'test-theme',
      };
      const manager = new ThemeManager(testDir, config);

      const layoutPath = manager.resolveLayout('default');
      expect(layoutPath).toContain(testDir);
      expect(layoutPath).not.toContain('test-theme');
    });
  });

  describe('resolveInclude', () => {
    it('should resolve include from site directory', () => {
      const config: JekyllConfig = {
        theme: 'test-theme',
      };
      const manager = new ThemeManager(testDir, config);

      const includePath = manager.resolveInclude('header.html');
      expect(includePath).toContain('_includes/header.html');
      expect(includePath).toContain(testDir);
    });

    it('should resolve include from theme when not in site', () => {
      const config: JekyllConfig = {
        theme: 'test-theme',
      };
      const manager = new ThemeManager(testDir, config);

      const includePath = manager.resolveInclude('footer.html');
      expect(includePath).toContain('_includes/footer.html');
      expect(includePath).toContain('test-theme');
    });

    it('should return null for non-existent include', () => {
      const config: JekyllConfig = {
        theme: 'test-theme',
      };
      const manager = new ThemeManager(testDir, config);

      const includePath = manager.resolveInclude('nonexistent.html');
      expect(includePath).toBeNull();
    });

    it('should prioritize site include over theme include', () => {
      const config: JekyllConfig = {
        theme: 'test-theme',
      };
      const manager = new ThemeManager(testDir, config);

      const includePath = manager.resolveInclude('header.html');
      expect(includePath).toContain(testDir);
      expect(includePath).not.toContain('test-theme');
    });
  });

  describe('getLayoutDirectories', () => {
    it('should return site layout directory without theme', () => {
      const config: JekyllConfig = {};
      const manager = new ThemeManager(testDir, config);

      const dirs = manager.getLayoutDirectories();
      expect(dirs).toHaveLength(1);
      expect(dirs[0]).toContain('_layouts');
      expect(dirs[0]).toContain(testDir);
    });

    it('should return both site and theme layout directories', () => {
      const config: JekyllConfig = {
        theme: 'test-theme',
      };
      const manager = new ThemeManager(testDir, config);

      const dirs = manager.getLayoutDirectories();
      expect(dirs).toHaveLength(2);
      expect(dirs[0]).toContain(testDir);
      expect(dirs[1]).toContain('test-theme');
    });
  });

  describe('getIncludeDirectories', () => {
    it('should return site include directory without theme', () => {
      const config: JekyllConfig = {};
      const manager = new ThemeManager(testDir, config);

      const dirs = manager.getIncludeDirectories();
      expect(dirs).toHaveLength(1);
      expect(dirs[0]).toContain('_includes');
      expect(dirs[0]).toContain(testDir);
    });

    it('should return both site and theme include directories', () => {
      const config: JekyllConfig = {
        theme: 'test-theme',
      };
      const manager = new ThemeManager(testDir, config);

      const dirs = manager.getIncludeDirectories();
      expect(dirs).toHaveLength(2);
      expect(dirs[0]).toContain(testDir);
      expect(dirs[1]).toContain('test-theme');
    });
  });

  describe('getThemeAssetsDirectory', () => {
    it('should return null without theme', () => {
      const config: JekyllConfig = {};
      const manager = new ThemeManager(testDir, config);

      expect(manager.getThemeAssetsDirectory()).toBeNull();
    });

    it('should return theme assets directory with theme', () => {
      const config: JekyllConfig = {
        theme: 'test-theme',
      };
      const manager = new ThemeManager(testDir, config);

      const assetsDir = manager.getThemeAssetsDirectory();
      expect(assetsDir).not.toBeNull();
      expect(assetsDir).toContain('test-theme');
      expect(assetsDir).toContain('assets');
    });
  });

  describe('getThemeSassDirectory', () => {
    it('should return null without theme', () => {
      const config: JekyllConfig = {};
      const manager = new ThemeManager(testDir, config);

      expect(manager.getThemeSassDirectory()).toBeNull();
    });

    it('should return theme sass directory with theme', () => {
      const config: JekyllConfig = {
        theme: 'test-theme',
      };
      const manager = new ThemeManager(testDir, config);

      const sassDir = manager.getThemeSassDirectory();
      expect(sassDir).not.toBeNull();
      expect(sassDir).toContain('test-theme');
      expect(sassDir).toContain('_sass');
    });
  });

  describe('getThemeDataDirectory', () => {
    it('should return null without theme', () => {
      const config: JekyllConfig = {};
      const manager = new ThemeManager(testDir, config);

      expect(manager.getThemeDataDirectory()).toBeNull();
    });

    it('should return null when theme has no _data directory', () => {
      const config: JekyllConfig = {
        theme: 'test-theme',
      };
      const manager = new ThemeManager(testDir, config);

      // Theme doesn't have _data directory by default in test setup
      expect(manager.getThemeDataDirectory()).toBeNull();
    });

    it('should return theme data directory with theme that has _data', () => {
      // Create _data directory in theme
      mkdirSync(join(themeDir, '_data'), { recursive: true });
      writeFileSync(
        join(themeDir, '_data', 'navigation.yml'),
        'items:\n  - title: Home\n    url: /'
      );

      const config: JekyllConfig = {
        theme: 'test-theme',
      };
      const manager = new ThemeManager(testDir, config);

      const dataDir = manager.getThemeDataDirectory();
      expect(dataDir).not.toBeNull();
      expect(dataDir).toContain('test-theme');
      expect(dataDir).toContain('_data');
    });
  });

  describe('getThemeMetadata', () => {
    it('should return null without theme', () => {
      const config: JekyllConfig = {};
      const manager = new ThemeManager(testDir, config);

      expect(manager.getThemeMetadata()).toBeNull();
    });

    it('should return null when theme has no package.json', () => {
      const config: JekyllConfig = {
        theme: 'test-theme',
      };
      const manager = new ThemeManager(testDir, config);

      // Theme doesn't have package.json by default in test setup
      expect(manager.getThemeMetadata()).toBeNull();
    });

    it('should return theme metadata from package.json', () => {
      // Create package.json in theme
      const packageJson = {
        name: 'jekyll-theme-test-theme',
        version: '1.2.3',
        description: 'A test Jekyll theme',
        author: 'Test Author',
        license: 'MIT',
        homepage: 'https://example.com',
        keywords: ['jekyll', 'theme'],
      };
      writeFileSync(join(themeDir, 'package.json'), JSON.stringify(packageJson, null, 2));

      const config: JekyllConfig = {
        theme: 'test-theme',
      };
      const manager = new ThemeManager(testDir, config);

      const metadata = manager.getThemeMetadata();
      expect(metadata).not.toBeNull();
      expect(metadata?.name).toBe('jekyll-theme-test-theme');
      expect(metadata?.version).toBe('1.2.3');
      expect(metadata?.description).toBe('A test Jekyll theme');
      expect(metadata?.author).toBe('Test Author');
      expect(metadata?.license).toBe('MIT');
      expect(metadata?.homepage).toBe('https://example.com');
      expect(metadata?.keywords).toEqual(['jekyll', 'theme']);
    });
  });

  describe('getThemeDefaults', () => {
    it('should return null without theme', () => {
      const config: JekyllConfig = {};
      const manager = new ThemeManager(testDir, config);

      expect(manager.getThemeDefaults()).toBeNull();
    });

    it('should return null when theme has no _config.yml', () => {
      const config: JekyllConfig = {
        theme: 'test-theme',
      };
      const manager = new ThemeManager(testDir, config);

      // Theme doesn't have _config.yml by default in test setup
      expect(manager.getThemeDefaults()).toBeNull();
    });

    it('should return theme defaults from _config.yml', () => {
      // Create _config.yml in theme
      const themeConfig = `
title: Theme Default Title
description: Theme default description
author:
  name: Theme Author
  email: author@example.com
defaults:
  - scope:
      path: ""
    values:
      layout: default
`;
      writeFileSync(join(themeDir, '_config.yml'), themeConfig);

      const config: JekyllConfig = {
        theme: 'test-theme',
      };
      const manager = new ThemeManager(testDir, config);

      const defaults = manager.getThemeDefaults();
      expect(defaults).not.toBeNull();
      expect(defaults?.title).toBe('Theme Default Title');
      expect(defaults?.description).toBe('Theme default description');
      expect(defaults?.author).toEqual({ name: 'Theme Author', email: 'author@example.com' });
      expect(defaults?.defaults).toHaveLength(1);
    });
  });

  describe('getDataDirectories', () => {
    it('should return only site data directory without theme', () => {
      mkdirSync(join(testDir, '_data'), { recursive: true });

      const config: JekyllConfig = {};
      const manager = new ThemeManager(testDir, config);

      const dirs = manager.getDataDirectories();
      expect(dirs).toHaveLength(1);
      expect(dirs[0]).toContain(testDir);
      expect(dirs[0]).toContain('_data');
    });

    it('should return both site and theme data directories', () => {
      // Create _data directories
      mkdirSync(join(testDir, '_data'), { recursive: true });
      mkdirSync(join(themeDir, '_data'), { recursive: true });

      const config: JekyllConfig = {
        theme: 'test-theme',
      };
      const manager = new ThemeManager(testDir, config);

      const dirs = manager.getDataDirectories();
      expect(dirs).toHaveLength(2);
      expect(dirs[0]).toContain(testDir);
      expect(dirs[1]).toContain('test-theme');
    });
  });

  describe('getThemeStaticFiles', () => {
    it('should return empty array without theme', () => {
      const config: JekyllConfig = {};
      const manager = new ThemeManager(testDir, config);

      const files = manager.getThemeStaticFiles(testDir);
      expect(files).toEqual([]);
    });

    it('should return theme asset files', () => {
      // Create some asset files in theme
      mkdirSync(join(themeDir, 'assets', 'css'), { recursive: true });
      mkdirSync(join(themeDir, 'assets', 'js'), { recursive: true });
      writeFileSync(join(themeDir, 'assets', 'css', 'style.css'), 'body { color: black; }');
      writeFileSync(join(themeDir, 'assets', 'js', 'main.js'), 'console.log("theme");');

      const config: JekyllConfig = {
        theme: 'test-theme',
      };
      const manager = new ThemeManager(testDir, config);

      const files = manager.getThemeStaticFiles(testDir);
      expect(files.length).toBe(2);

      const relativePaths = files.map((f) => f.relativePath.replace(/\\/g, '/'));
      expect(relativePaths).toContain('assets/css/style.css');
      expect(relativePaths).toContain('assets/js/main.js');
    });

    it('should not include files overridden by site', () => {
      // Create asset files in both theme and site
      mkdirSync(join(themeDir, 'assets', 'css'), { recursive: true });
      mkdirSync(join(testDir, 'assets', 'css'), { recursive: true });

      writeFileSync(join(themeDir, 'assets', 'css', 'style.css'), 'body { color: black; }');
      writeFileSync(join(themeDir, 'assets', 'css', 'theme.css'), '.theme { display: block; }');
      writeFileSync(join(testDir, 'assets', 'css', 'style.css'), 'body { color: red; }'); // Override

      const config: JekyllConfig = {
        theme: 'test-theme',
      };
      const manager = new ThemeManager(testDir, config);

      const files = manager.getThemeStaticFiles(testDir);
      expect(files.length).toBe(1);

      const relativePaths = files.map((f) => f.relativePath.replace(/\\/g, '/'));
      expect(relativePaths).toContain('assets/css/theme.css');
      expect(relativePaths).not.toContain('assets/css/style.css');
    });
  });

  describe('resolveDataFile', () => {
    it('should resolve data file from site directory', () => {
      // Create data file in site
      mkdirSync(join(testDir, '_data'), { recursive: true });
      writeFileSync(join(testDir, '_data', 'navigation.yml'), 'items: []');

      const config: JekyllConfig = {
        theme: 'test-theme',
      };
      const manager = new ThemeManager(testDir, config);

      const dataPath = manager.resolveDataFile('navigation.yml');
      expect(dataPath).not.toBeNull();
      expect(dataPath).toContain(testDir);
    });

    it('should resolve data file from theme when not in site', () => {
      // Create data file only in theme
      mkdirSync(join(themeDir, '_data'), { recursive: true });
      writeFileSync(join(themeDir, '_data', 'authors.yml'), 'authors: []');

      const config: JekyllConfig = {
        theme: 'test-theme',
      };
      const manager = new ThemeManager(testDir, config);

      const dataPath = manager.resolveDataFile('authors.yml');
      expect(dataPath).not.toBeNull();
      expect(dataPath).toContain('test-theme');
    });

    it('should return null for non-existent data file', () => {
      const config: JekyllConfig = {
        theme: 'test-theme',
      };
      const manager = new ThemeManager(testDir, config);

      const dataPath = manager.resolveDataFile('nonexistent.yml');
      expect(dataPath).toBeNull();
    });

    it('should prioritize site data over theme data', () => {
      // Create data files in both
      mkdirSync(join(testDir, '_data'), { recursive: true });
      mkdirSync(join(themeDir, '_data'), { recursive: true });
      writeFileSync(join(testDir, '_data', 'settings.yml'), 'site: true');
      writeFileSync(join(themeDir, '_data', 'settings.yml'), 'theme: true');

      const config: JekyllConfig = {
        theme: 'test-theme',
      };
      const manager = new ThemeManager(testDir, config);

      const dataPath = manager.resolveDataFile('settings.yml');
      expect(dataPath).not.toBeNull();
      expect(dataPath).toContain(testDir);
      expect(dataPath).not.toContain('test-theme');
    });
  });

  describe('Security - Path Traversal Prevention', () => {
    describe('resolveLayout', () => {
      it('should reject layout names with path traversal', () => {
        const config: JekyllConfig = {};
        const manager = new ThemeManager(testDir, config);

        expect(manager.resolveLayout('../../../etc/passwd')).toBeNull();
        expect(manager.resolveLayout('..\\..\\..\\etc\\passwd')).toBeNull();
        expect(manager.resolveLayout('/etc/passwd')).toBeNull();
      });

      it('should reject layout names with embedded traversal', () => {
        const config: JekyllConfig = {};
        const manager = new ThemeManager(testDir, config);

        expect(manager.resolveLayout('subdir/../../../etc/passwd')).toBeNull();
        expect(manager.resolveLayout('valid/../../../etc/passwd')).toBeNull();
      });
    });

    describe('resolveInclude', () => {
      it('should reject include paths with path traversal', () => {
        const config: JekyllConfig = {};
        const manager = new ThemeManager(testDir, config);

        expect(manager.resolveInclude('../../../etc/passwd')).toBeNull();
        expect(manager.resolveInclude('..\\..\\..\\etc\\passwd')).toBeNull();
        expect(manager.resolveInclude('/etc/passwd')).toBeNull();
      });

      it('should reject include paths with embedded traversal', () => {
        const config: JekyllConfig = {};
        const manager = new ThemeManager(testDir, config);

        expect(manager.resolveInclude('subdir/../../../etc/passwd')).toBeNull();
        expect(manager.resolveInclude('valid/../../../etc/passwd')).toBeNull();
      });
    });

    describe('resolveDataFile', () => {
      it('should reject data paths with path traversal', () => {
        const config: JekyllConfig = {};
        const manager = new ThemeManager(testDir, config);

        expect(manager.resolveDataFile('../../../etc/passwd')).toBeNull();
        expect(manager.resolveDataFile('..\\..\\..\\etc\\passwd')).toBeNull();
        expect(manager.resolveDataFile('/etc/passwd')).toBeNull();
      });

      it('should reject data paths with embedded traversal', () => {
        const config: JekyllConfig = {};
        const manager = new ThemeManager(testDir, config);

        expect(manager.resolveDataFile('subdir/../../../etc/passwd')).toBeNull();
        expect(manager.resolveDataFile('valid/../../../etc/passwd')).toBeNull();
      });
    });

    describe('theme name validation', () => {
      it('should reject theme names with path traversal', () => {
        const config: JekyllConfig = {
          theme: '../../../etc/passwd',
        };
        const manager = new ThemeManager(testDir, config);

        expect(manager.hasTheme()).toBe(false);
        expect(manager.getTheme()).toBeNull();
      });

      it('should reject theme names with backslash traversal', () => {
        const config: JekyllConfig = {
          theme: '..\\..\\..\\etc\\passwd',
        };
        const manager = new ThemeManager(testDir, config);

        expect(manager.hasTheme()).toBe(false);
        expect(manager.getTheme()).toBeNull();
      });

      it('should reject absolute paths as theme names', () => {
        const config: JekyllConfig = {
          theme: '/etc/passwd',
        };
        const manager = new ThemeManager(testDir, config);

        expect(manager.hasTheme()).toBe(false);
        expect(manager.getTheme()).toBeNull();
      });

      it('should reject Windows absolute paths as theme names', () => {
        const config: JekyllConfig = {
          theme: 'C:\\Windows\\System32',
        };
        const manager = new ThemeManager(testDir, config);

        expect(manager.hasTheme()).toBe(false);
        expect(manager.getTheme()).toBeNull();
      });

      it('should allow valid scoped npm package names', () => {
        // This won't find a theme because the package doesn't exist,
        // but it should not be blocked by security validation
        const config: JekyllConfig = {
          theme: '@myorg/my-theme',
        };
        const manager = new ThemeManager(testDir, config);

        // Theme won't be found (package doesn't exist), but security should not be the reason
        // The hasTheme() returns false because theme doesn't exist, not because of security
        expect(manager.hasTheme()).toBe(false);
      });

      it('should reject malicious scoped package names', () => {
        const config: JekyllConfig = {
          theme: '@../malicious/theme',
        };
        const manager = new ThemeManager(testDir, config);

        expect(manager.hasTheme()).toBe(false);
        expect(manager.getTheme()).toBeNull();
      });
    });
  });
});
