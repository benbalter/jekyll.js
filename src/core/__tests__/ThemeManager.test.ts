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
});
