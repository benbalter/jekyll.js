import chalk from 'chalk';
import { resolve, join, isAbsolute } from 'path';
import { loadConfig, validateConfig, printValidation } from '../../config';
import { Site, Builder } from '../../core';
import { logger } from '../../utils/logger';
import { FileWatcher } from '../../utils/watcher';

interface BuildOptions {
  source: string;
  destination: string;
  config: string;
  drafts?: boolean;
  future?: boolean;
  watch?: boolean;
  verbose?: boolean;
  incremental?: boolean;
  debug?: boolean;
  profile?: boolean;
}

/**
 * Build command handler
 * Generates the static site from source to destination
 */
export async function buildCommand(options: BuildOptions): Promise<void> {
  // Configure logger - debug mode enables verbose
  const isDebug = options.debug || false;
  const isVerbose = options.verbose || isDebug;
  logger.setVerbose(isVerbose);

  // Set DEBUG env var if debug mode is enabled
  if (isDebug) {
    process.env.DEBUG = '1';
  }

  try {
    // Resolve source directory from CLI option (defaults to '.')
    const sourcePath = resolve(options.source);

    // Resolve config path relative to source directory if it's a relative path
    const configPath = isAbsolute(options.config)
      ? options.config
      : resolve(sourcePath, options.config);

    if (isDebug) {
      logger.section('Debug Mode');
      console.log(chalk.cyan('  🔧 Debug mode enabled'));
      console.log(chalk.gray('  Node version:'), process.version);
      console.log(chalk.gray('  Platform:'), process.platform);
      console.log(chalk.gray('  Working directory:'), process.cwd());
    }

    logger.debug('Loading configuration', { path: configPath });
    const config = loadConfig(configPath, isVerbose);

    // Validate configuration
    const validation = validateConfig(config);
    printValidation(validation, isVerbose);

    if (!validation.valid) {
      throw new Error('Configuration validation failed. Please fix the errors above.');
    }

    // Override config with CLI options
    // Destination path: CLI option takes precedence, then config, then default based on source
    const destPath =
      options.destination !== undefined
        ? resolve(options.destination)
        : config.destination
          ? resolve(config.destination)
          : join(sourcePath, '_site');

    // Apply CLI flags to config
    if (options.drafts) {
      config.show_drafts = true;
    }
    if (options.future) {
      config.future = true;
    }
    if (options.watch) {
      config.watch = true;
    }
    if (options.incremental) {
      config.incremental = true;
    }

    if (isVerbose) {
      logger.section('Configuration');
      console.log('  Source:', sourcePath);
      console.log('  Destination:', destPath);
      console.log('  Config file:', configPath);
      if (config.show_drafts) console.log('  Drafts:', 'enabled');
      if (config.future) console.log('  Future:', 'enabled');
      if (config.watch) console.log('  Watch:', 'enabled');
      if (config.incremental) console.log('  Incremental:', 'enabled');
      if (isDebug) console.log('  Debug:', 'enabled');
      if (options.profile) console.log('  Profile:', 'enabled');
    }

    // Update config with final paths
    config.source = sourcePath;
    config.destination = destPath;

    // Create site and builder
    const site = new Site(sourcePath, config);
    const builder = new Builder(site, {
      showDrafts: options.drafts,
      showFuture: options.future,
      clean: true,
      verbose: isVerbose,
      incremental: options.incremental,
      timing: options.profile || isDebug,
    });

    // Build the site
    const startTime = Date.now();
    const timings = await builder.build();
    const buildTime = ((Date.now() - startTime) / 1000).toFixed(3);

    logger.success('Site built successfully!');
    console.log('  Output:', destPath);
    console.log(`  Done in ${buildTime} seconds.`);

    // Show timing profile if enabled
    if ((options.profile || isDebug) && timings) {
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

    if (config.watch) {
      // Start file watcher for automatic rebuilds
      const watcher = new FileWatcher({
        source: sourcePath,
        destination: destPath,
        builder,
        verbose: isVerbose,
      });

      watcher.start();

      // Promise to keep process running until shutdown
      let resolveShutdown: (() => void) | undefined;

      const shutdown = async () => {
        console.log(chalk.yellow('\n\nShutting down...'));
        await watcher.stop();
        process.off('SIGINT', shutdown);
        process.off('SIGTERM', shutdown);
        if (resolveShutdown) {
          resolveShutdown();
        }
      };

      await new Promise<void>((resolve) => {
        resolveShutdown = resolve;
        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);
      });
    }
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)));
    process.exit(1);
  }
}
