/**
 * ThemeManager handles loading and resolving theme files
 *
 * Themes in Jekyll.js are npm packages that provide:
 * - Layouts (_layouts/)
 * - Includes (_includes/)
 * - Sass stylesheets (_sass/, assets/)
 * - Static assets (CSS, JavaScript, images)
 * - Configuration defaults
 *
 * Theme files can be overridden by site files.
 */

import { existsSync, statSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { JekyllConfig } from '../config';
import { logger } from '../utils/logger';

/**
 * Theme configuration interface
 */
export interface ThemeConfig {
  /** Theme name (npm package name or local path) */
  name: string;

  /** Resolved theme root directory */
  root: string;

  /** Theme layouts directory */
  layoutsDir: string;

  /** Theme includes directory */
  includesDir: string;

  /** Theme sass directory */
  sassDir: string;

  /** Theme assets directory */
  assetsDir: string;
}

/**
 * ThemeManager class handles theme loading and file resolution
 */
export class ThemeManager {
  private config: JekyllConfig;
  private sourceDir: string;
  private theme: ThemeConfig | null = null;

  /**
   * Create a new ThemeManager
   * @param sourceDir Site source directory
   * @param config Site configuration
   */
  constructor(sourceDir: string, config: JekyllConfig) {
    this.sourceDir = resolve(sourceDir);
    this.config = config;

    // Load theme if configured
    if (config.theme) {
      this.theme = this.loadTheme(config.theme);
    }
  }

  /**
   * Load theme from npm package or local directory
   * @param themeName Theme name (npm package or local path)
   * @returns Theme configuration
   */
  private loadTheme(themeName: string): ThemeConfig | null {
    logger.debug(`Loading theme: ${themeName}`);

    // Try to resolve theme from node_modules
    const themeRoot = this.resolveThemeRoot(themeName);

    if (!themeRoot) {
      logger.warn(`Theme '${themeName}' not found. Continuing without theme.`);
      return null;
    }

    logger.info(`Using theme: ${themeName} (${themeRoot})`);

    return {
      name: themeName,
      root: themeRoot,
      layoutsDir: join(themeRoot, '_layouts'),
      includesDir: join(themeRoot, '_includes'),
      sassDir: join(themeRoot, '_sass'),
      assetsDir: join(themeRoot, 'assets'),
    };
  }

  /**
   * Resolve theme root directory
   * @param themeName Theme name
   * @returns Theme root directory or null if not found
   */
  private resolveThemeRoot(themeName: string): string | null {
    // Try node_modules first
    const nodeModulesPath = this.findNodeModules(this.sourceDir);
    if (nodeModulesPath) {
      const themeInNodeModules = join(nodeModulesPath, themeName);
      if (existsSync(themeInNodeModules) && statSync(themeInNodeModules).isDirectory()) {
        return themeInNodeModules;
      }
    }

    // Try as relative path
    const relativePath = resolve(this.sourceDir, themeName);
    if (existsSync(relativePath) && statSync(relativePath).isDirectory()) {
      return relativePath;
    }

    // Try as absolute path
    if (existsSync(themeName) && statSync(themeName).isDirectory()) {
      return resolve(themeName);
    }

    return null;
  }

  /**
   * Find node_modules directory by walking up the directory tree
   * @param startDir Starting directory
   * @returns Path to node_modules or null if not found
   */
  private findNodeModules(startDir: string): string | null {
    let currentDir = startDir;

    // Walk up the directory tree
    while (currentDir !== dirname(currentDir)) {
      const nodeModulesPath = join(currentDir, 'node_modules');
      if (existsSync(nodeModulesPath) && statSync(nodeModulesPath).isDirectory()) {
        return nodeModulesPath;
      }
      currentDir = dirname(currentDir);
    }

    return null;
  }

  /**
   * Check if theme is configured
   * @returns Whether theme is configured
   */
  public hasTheme(): boolean {
    return this.theme !== null;
  }

  /**
   * Get theme configuration
   * @returns Theme configuration or null if no theme
   */
  public getTheme(): ThemeConfig | null {
    return this.theme;
  }

  /**
   * Resolve a layout file path
   * Site layouts take precedence over theme layouts
   * @param layoutName Layout name (without extension)
   * @returns Full path to layout file or null if not found
   */
  public resolveLayout(layoutName: string): string | null {
    // Check site layouts first
    const siteLayoutsDir = join(this.sourceDir, this.config.layouts_dir || '_layouts');
    const siteLayoutPath = this.findFileWithExtensions(siteLayoutsDir, layoutName);
    if (siteLayoutPath) {
      return siteLayoutPath;
    }

    // Check theme layouts
    if (this.theme) {
      const themeLayoutPath = this.findFileWithExtensions(this.theme.layoutsDir, layoutName);
      if (themeLayoutPath) {
        return themeLayoutPath;
      }
    }

    return null;
  }

  /**
   * Resolve an include file path
   * Site includes take precedence over theme includes
   * @param includePath Include path (relative to includes dir)
   * @returns Full path to include file or null if not found
   */
  public resolveInclude(includePath: string): string | null {
    // Check site includes first
    const siteIncludesDir = join(this.sourceDir, this.config.includes_dir || '_includes');
    const siteIncludePath = join(siteIncludesDir, includePath);
    if (existsSync(siteIncludePath) && statSync(siteIncludePath).isFile()) {
      return siteIncludePath;
    }

    // Check theme includes
    if (this.theme) {
      const themeIncludePath = join(this.theme.includesDir, includePath);
      if (existsSync(themeIncludePath) && statSync(themeIncludePath).isFile()) {
        return themeIncludePath;
      }
    }

    return null;
  }

  /**
   * Get all layout directories (site first, then theme)
   * @returns Array of layout directory paths
   */
  public getLayoutDirectories(): string[] {
    const dirs: string[] = [];

    // Add site layouts directory
    const siteLayoutsDir = join(this.sourceDir, this.config.layouts_dir || '_layouts');
    if (existsSync(siteLayoutsDir)) {
      dirs.push(siteLayoutsDir);
    }

    // Add theme layouts directory
    if (this.theme && existsSync(this.theme.layoutsDir)) {
      dirs.push(this.theme.layoutsDir);
    }

    return dirs;
  }

  /**
   * Get all include directories (site first, then theme)
   * @returns Array of include directory paths
   */
  public getIncludeDirectories(): string[] {
    const dirs: string[] = [];

    // Add site includes directory
    const siteIncludesDir = join(this.sourceDir, this.config.includes_dir || '_includes');
    if (existsSync(siteIncludesDir)) {
      dirs.push(siteIncludesDir);
    }

    // Add theme includes directory
    if (this.theme && existsSync(this.theme.includesDir)) {
      dirs.push(this.theme.includesDir);
    }

    return dirs;
  }

  /**
   * Get theme assets directory
   * @returns Theme assets directory or null if no theme
   */
  public getThemeAssetsDirectory(): string | null {
    if (this.theme && existsSync(this.theme.assetsDir)) {
      return this.theme.assetsDir;
    }
    return null;
  }

  /**
   * Get theme sass directory
   * @returns Theme sass directory or null if no theme
   */
  public getThemeSassDirectory(): string | null {
    if (this.theme && existsSync(this.theme.sassDir)) {
      return this.theme.sassDir;
    }
    return null;
  }

  /**
   * Find a file with common Jekyll extensions
   * @param dir Directory to search
   * @param basename File basename (without extension)
   * @returns Full path to file or null if not found
   */
  private findFileWithExtensions(dir: string, basename: string): string | null {
    if (!existsSync(dir)) {
      return null;
    }

    // Common Jekyll file extensions
    const extensions = ['', '.html', '.md', '.markdown'];

    for (const ext of extensions) {
      const filePath = join(dir, basename + ext);
      if (existsSync(filePath) && statSync(filePath).isFile()) {
        return filePath;
      }
    }

    return null;
  }
}
