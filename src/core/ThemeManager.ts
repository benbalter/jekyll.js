/**
 * ThemeManager handles loading and resolving theme files
 *
 * Themes in Jekyll.js are npm packages that provide:
 * - Layouts (_layouts/)
 * - Includes (_includes/)
 * - Sass stylesheets (_sass/, assets/)
 * - Static assets (CSS, JavaScript, images)
 * - Data files (_data/)
 * - Configuration defaults (_config.yml)
 * - Package metadata (package.json)
 *
 * Theme files can be overridden by site files.
 *
 * Similar to Jekyll.rb's gem-based theme system, themes are distributed
 * as npm packages and can be installed via `npm install`.
 */

import { existsSync, statSync, readFileSync, readdirSync } from 'fs';
import { join, resolve, dirname, basename } from 'path';
import yaml from 'js-yaml';
import { JekyllConfig } from '../config';
import { logger } from '../utils/logger';

/**
 * Theme metadata from package.json
 */
export interface ThemeMetadata {
  /** Theme package name */
  name: string;

  /** Theme version */
  version: string;

  /** Theme description */
  description?: string;

  /** Theme author */
  author?: string | { name: string; email?: string; url?: string };

  /** Theme license */
  license?: string;

  /** Theme homepage URL */
  homepage?: string;

  /** Theme repository */
  repository?: string | { type: string; url: string };

  /** Theme keywords */
  keywords?: string[];
}

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

  /** Theme data directory */
  dataDir: string;

  /** Theme metadata from package.json */
  metadata?: ThemeMetadata;

  /** Theme default configuration from _config.yml */
  defaults?: JekyllConfig;
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

    // Load theme metadata from package.json
    const metadata = this.loadThemeMetadata(themeRoot);

    // Load theme default configuration from _config.yml
    const defaults = this.loadThemeDefaults(themeRoot);

    return {
      name: themeName,
      root: themeRoot,
      layoutsDir: join(themeRoot, '_layouts'),
      includesDir: join(themeRoot, '_includes'),
      sassDir: join(themeRoot, '_sass'),
      assetsDir: join(themeRoot, 'assets'),
      dataDir: join(themeRoot, '_data'),
      metadata,
      defaults,
    };
  }

  /**
   * Load theme metadata from package.json
   * @param themeRoot Theme root directory
   * @returns Theme metadata or undefined if not found
   */
  private loadThemeMetadata(themeRoot: string): ThemeMetadata | undefined {
    const packageJsonPath = join(themeRoot, 'package.json');

    if (!existsSync(packageJsonPath)) {
      logger.debug(`No package.json found for theme at ${themeRoot}`);
      return undefined;
    }

    try {
      const content = readFileSync(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(content);

      return {
        name: packageJson.name || basename(themeRoot),
        version: packageJson.version || '0.0.0',
        description: packageJson.description,
        author: packageJson.author,
        license: packageJson.license,
        homepage: packageJson.homepage,
        repository: packageJson.repository,
        keywords: packageJson.keywords,
      };
    } catch (error) {
      logger.warn(`Failed to parse theme package.json at ${packageJsonPath}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return undefined;
    }
  }

  /**
   * Load theme default configuration from _config.yml
   * @param themeRoot Theme root directory
   * @returns Theme default configuration or undefined if not found
   */
  private loadThemeDefaults(themeRoot: string): JekyllConfig | undefined {
    const configPath = join(themeRoot, '_config.yml');

    if (!existsSync(configPath)) {
      logger.debug(`No _config.yml found for theme at ${themeRoot}`);
      return undefined;
    }

    try {
      const content = readFileSync(configPath, 'utf-8');
      const config = yaml.load(content) as JekyllConfig;

      if (!config || typeof config !== 'object') {
        return undefined;
      }

      logger.debug(`Loaded theme default configuration from ${configPath}`);
      return config;
    } catch (error) {
      logger.warn(`Failed to parse theme _config.yml at ${configPath}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return undefined;
    }
  }

  /**
   * Resolve theme root directory
   * @param themeName Theme name
   * @returns Theme root directory or null if not found
   */
  private resolveThemeRoot(themeName: string): string | null {
    // Try bundled themes first (e.g., minima)
    const bundledThemePath = this.getBundledThemePath(themeName);
    if (bundledThemePath) {
      return bundledThemePath;
    }

    // Try node_modules
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
   * Get path to a bundled theme if it exists
   * Bundled themes are included in the jekyll-ts package under themes/
   * @param themeName Theme name
   * @returns Path to bundled theme or null if not found
   */
  private getBundledThemePath(themeName: string): string | null {
    // List of bundled themes
    const bundledThemes = ['minima'];

    if (!bundledThemes.includes(themeName)) {
      return null;
    }

    // Get the path to the themes directory
    // The themes directory is at the same level as core/ in the package structure
    // In compiled code: dist/themes/ (relative to dist/core/ThemeManager.js)
    // In source/test: src/themes/ (relative to src/core/ThemeManager.ts)
    const possiblePaths = [
      // Standard path: themes/ is a sibling of core/
      join(__dirname, '..', 'themes', themeName),
      // Alternative path for different directory structures
      join(__dirname, '..', '..', 'themes', themeName),
    ];

    for (const themePath of possiblePaths) {
      // Verify it's a valid theme directory by checking for required directories
      if (existsSync(themePath) && statSync(themePath).isDirectory()) {
        // Check for essential theme marker files/directories
        const hasLayouts = existsSync(join(themePath, '_layouts'));
        const hasPackageJson = existsSync(join(themePath, 'package.json'));

        if (hasLayouts || hasPackageJson) {
          return themePath;
        }
      }
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
  private findFileWithExtensions(dir: string, fileBasename: string): string | null {
    if (!existsSync(dir)) {
      return null;
    }

    // Common Jekyll file extensions
    const extensions = ['', '.html', '.md', '.markdown'];

    for (const ext of extensions) {
      const filePath = join(dir, fileBasename + ext);
      if (existsSync(filePath) && statSync(filePath).isFile()) {
        return filePath;
      }
    }

    return null;
  }

  /**
   * Get theme data directory
   * @returns Theme data directory or null if no theme or directory doesn't exist
   */
  public getThemeDataDirectory(): string | null {
    if (this.theme && existsSync(this.theme.dataDir)) {
      return this.theme.dataDir;
    }
    return null;
  }

  /**
   * Get theme metadata from package.json
   * @returns Theme metadata or null if no theme
   */
  public getThemeMetadata(): ThemeMetadata | null {
    if (this.theme?.metadata) {
      return this.theme.metadata;
    }
    return null;
  }

  /**
   * Get theme default configuration from _config.yml
   * @returns Theme default configuration or null if no theme
   */
  public getThemeDefaults(): JekyllConfig | null {
    if (this.theme?.defaults) {
      return this.theme.defaults;
    }
    return null;
  }

  /**
   * Get all data directories (site first, then theme)
   * Used to merge theme data with site data
   * @returns Array of data directory paths
   */
  public getDataDirectories(): string[] {
    const dirs: string[] = [];

    // Add site data directory
    const siteDataDir = join(this.sourceDir, this.config.data_dir || '_data');
    if (existsSync(siteDataDir)) {
      dirs.push(siteDataDir);
    }

    // Add theme data directory
    if (this.theme && existsSync(this.theme.dataDir)) {
      dirs.push(this.theme.dataDir);
    }

    return dirs;
  }

  /**
   * Get list of theme static files to copy (assets not overridden by site)
   * @param siteSource Site source directory for checking overrides
   * @returns Array of theme static file info with source and relative paths
   */
  public getThemeStaticFiles(
    siteSource: string
  ): Array<{ sourcePath: string; relativePath: string }> {
    const staticFiles: Array<{ sourcePath: string; relativePath: string }> = [];

    if (!this.theme) {
      return staticFiles;
    }

    // Collect assets from theme's assets directory
    const themeAssetsDir = this.theme.assetsDir;
    if (existsSync(themeAssetsDir)) {
      // Pre-build set of site files for efficient lookup
      const siteFiles = this.collectSiteFiles(join(siteSource, 'assets'), 'assets');
      this.collectThemeStaticFiles(themeAssetsDir, 'assets', siteFiles, staticFiles);
    }

    return staticFiles;
  }

  /**
   * Normalize path separators to forward slashes for cross-platform consistency
   * @param path Path to normalize
   * @returns Path with forward slashes
   */
  private normalizePath(path: string): string {
    return path.replace(/\\/g, '/');
  }

  /**
   * Recursively collect site files into a Set for efficient lookup
   * @param dir Directory to scan
   * @param relativeBase Relative base path
   * @returns Set of relative file paths that exist in the site (normalized to forward slashes)
   */
  private collectSiteFiles(dir: string, relativeBase: string): Set<string> {
    const files = new Set<string>();

    if (!existsSync(dir)) {
      return files;
    }

    const entries = readdirSync(dir);

    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const relativePath = this.normalizePath(join(relativeBase, entry));

      const stats = statSync(fullPath);

      if (stats.isDirectory()) {
        // Recurse into subdirectory
        const subFiles = this.collectSiteFiles(fullPath, relativePath);
        for (const file of subFiles) {
          files.add(file);
        }
      } else if (stats.isFile()) {
        files.add(relativePath);
      }
    }

    return files;
  }

  /**
   * Recursively collect theme static files that are not overridden by site files
   * @param dir Directory to scan
   * @param relativeBase Relative base path
   * @param siteFiles Set of site files for efficient lookup (normalized to forward slashes)
   * @param files Accumulator array
   */
  private collectThemeStaticFiles(
    dir: string,
    relativeBase: string,
    siteFiles: Set<string>,
    files: Array<{ sourcePath: string; relativePath: string }>
  ): void {
    if (!existsSync(dir)) {
      return;
    }

    const entries = readdirSync(dir);

    for (const entry of entries) {
      const fullPath = join(dir, entry);
      // Normalize path for consistent cross-platform comparison
      const relativePath = this.normalizePath(join(relativeBase, entry));

      const stats = statSync(fullPath);

      if (stats.isDirectory()) {
        // Recurse into subdirectory
        this.collectThemeStaticFiles(fullPath, relativePath, siteFiles, files);
      } else if (stats.isFile()) {
        // Only add if not overridden by site file (efficient Set lookup with normalized paths)
        if (!siteFiles.has(relativePath)) {
          files.push({
            sourcePath: fullPath,
            relativePath: relativePath,
          });
        } else {
          logger.debug(`Theme file overridden by site: ${relativePath}`);
        }
      }
    }
  }

  /**
   * Resolve a data file path
   * Site data takes precedence over theme data
   * @param dataPath Data file path (relative to data dir)
   * @returns Full path to data file or null if not found
   */
  public resolveDataFile(dataPath: string): string | null {
    // Check site data first
    const siteDataDir = join(this.sourceDir, this.config.data_dir || '_data');
    const siteDataPath = join(siteDataDir, dataPath);
    if (existsSync(siteDataPath) && statSync(siteDataPath).isFile()) {
      return siteDataPath;
    }

    // Check theme data
    if (this.theme) {
      const themeDataPath = join(this.theme.dataDir, dataPath);
      if (existsSync(themeDataPath) && statSync(themeDataPath).isFile()) {
        return themeDataPath;
      }
    }

    return null;
  }
}
