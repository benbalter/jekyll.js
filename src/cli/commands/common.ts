/**
 * Common CLI utilities shared between build and serve commands
 *
 * This module extracts common functionality to reduce code duplication.
 */

import chalk from 'chalk';
import { resolve, join, isAbsolute } from 'path';
import { loadConfig, validateConfig, printValidation, JekyllConfig } from '../../config';
import { Site, Builder, BuilderOptions } from '../../core';
import { logger } from '../../utils/logger';
import { BuildTimings } from '../../utils/timer';

/**
 * Common CLI options shared between commands
 */
export interface CommonCLIOptions {
  source: string;
  destination: string;
  config: string;
  drafts?: boolean;
  future?: boolean;
  verbose?: boolean;
  debug?: boolean;
}

/**
 * Result of CLI initialization
 */
export interface InitResult {
  /** Resolved source path */
  sourcePath: string;
  /** Resolved destination path */
  destPath: string;
  /** Resolved config file path */
  configPath: string;
  /** Loaded and validated configuration */
  config: JekyllConfig;
  /** Whether verbose mode is enabled */
  isVerbose: boolean;
  /** Whether debug mode is enabled */
  isDebug: boolean;
}

/**
 * Initialize CLI command with common setup
 * Sets up logging, loads/validates config, and resolves paths
 *
 * @param options - Common CLI options
 * @returns Initialized result with resolved paths and config
 * @throws Error if configuration validation fails
 */
export function initializeCLI(options: CommonCLIOptions): InitResult {
  // Configure logger - debug mode enables verbose
  const isDebug = options.debug || false;
  const isVerbose = options.verbose || isDebug;
  logger.setVerbose(isVerbose);

  // Set DEBUG env var if debug mode is enabled
  if (isDebug) {
    process.env.DEBUG = '1';
  }

  // Resolve source directory from CLI option (defaults to '.')
  const sourcePath = resolve(options.source);

  // Resolve config path relative to source directory if it's a relative path
  const configPath = isAbsolute(options.config)
    ? options.config
    : resolve(sourcePath, options.config);

  // Log debug information
  if (isDebug) {
    logger.section('Debug Mode');
    console.log(chalk.cyan('  🔧 Debug mode enabled'));
    console.log(chalk.gray('  Node version:'), process.version);
    console.log(chalk.gray('  Platform:'), process.platform);
    console.log(chalk.gray('  Working directory:'), process.cwd());
  }

  // Load configuration
  logger.debug('Loading configuration', { path: configPath });
  const config = loadConfig(configPath, isVerbose);

  // Validate configuration
  const validation = validateConfig(config);
  printValidation(validation, isVerbose);

  if (!validation.valid) {
    throw new Error('Configuration validation failed. Please fix the errors above.');
  }

  // Resolve destination path: CLI option takes precedence, then config, then default
  const destPath =
    options.destination !== undefined && options.destination !== ''
      ? resolve(options.destination)
      : config.destination
        ? resolve(config.destination)
        : join(sourcePath, '_site');

  // Apply CLI flags to config
  if (options.drafts !== undefined) {
    config.show_drafts = options.drafts;
  }
  if (options.future !== undefined) {
    config.future = options.future;
  }

  // Update config with final paths
  config.source = sourcePath;
  config.destination = destPath;

  return {
    sourcePath,
    destPath,
    configPath,
    config,
    isVerbose,
    isDebug,
  };
}

/**
 * Options for creating site and builder
 */
export interface CreateSiteAndBuilderOptions {
  sourcePath: string;
  config: JekyllConfig;
  drafts?: boolean;
  future?: boolean;
  incremental?: boolean;
  verbose?: boolean;
  timing?: boolean;
  showProgress?: boolean;
}

/**
 * Result of creating site and builder
 */
export interface SiteAndBuilder {
  site: Site;
  builder: Builder;
}

/**
 * Create a Site and Builder instance with common configuration
 *
 * @param options - Options for creating site and builder
 * @returns Site and Builder instances
 */
export function createSiteAndBuilder(options: CreateSiteAndBuilderOptions): SiteAndBuilder {
  const site = new Site(options.sourcePath, options.config);
  const builderOptions: BuilderOptions = {
    showDrafts: options.drafts,
    showFuture: options.future,
    clean: true,
    verbose: options.verbose,
    incremental: options.incremental,
    timing: options.timing,
    showProgress: options.showProgress,
  };
  const builder = new Builder(site, builderOptions);
  return { site, builder };
}

/**
 * Report build timing profile
 *
 * @param timings - Build timings to report
 */
export function reportBuildProfile(timings: BuildTimings): void {
  logger.section('Build Profile');
  const sortedOps = timings.getMostCostlyOperations();
  console.log(chalk.gray('  Operation timings (sorted by duration):'));
  for (const op of sortedOps) {
    const duration = (op.duration / 1000).toFixed(3);
    const details = op.details ? chalk.gray(` (${op.details})`) : '';
    console.log(`    ${chalk.cyan(op.name)}: ${duration}s${details}`);
  }
  console.log(chalk.gray(`\n  Total: ${(timings.totalDuration / 1000).toFixed(3)}s`));
}

/**
 * Log successful build result
 *
 * @param destPath - Destination path where the site was built
 * @param buildTimeSeconds - Build time in seconds
 */
export function logBuildSuccess(destPath: string, buildTimeSeconds: string): void {
  logger.success('Site built successfully!');
  console.log('  Output:', destPath);
  console.log(`  Done in ${buildTimeSeconds} seconds.`);
}
