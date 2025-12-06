import chalk from 'chalk';
import { logger } from '../../utils/logger';
import { FileWatcher } from '../../utils/watcher';
import {
  CommonCLIOptions,
  initializeCLI,
  createSiteAndBuilder,
  reportBuildProfile,
  logBuildSuccess,
} from './common';

interface BuildOptions extends CommonCLIOptions {
  watch?: boolean;
  incremental?: boolean;
  profile?: boolean;
}

/**
 * Build command handler
 * Generates the static site from source to destination
 */
export async function buildCommand(options: BuildOptions): Promise<void> {
  try {
    // Initialize CLI with common setup
    const { sourcePath, destPath, configPath, config, isVerbose, isDebug } = initializeCLI(options);

    // Apply build-specific CLI flags to config
    if (options.watch !== undefined) {
      config.watch = options.watch;
    }
    if (options.incremental !== undefined) {
      config.incremental = options.incremental;
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

    // Create site and builder (site is unused in build command but returned for consistency)
    const { builder } = createSiteAndBuilder({
      sourcePath,
      config,
      drafts: options.drafts,
      future: options.future,
      incremental: options.incremental,
      verbose: isVerbose,
      timing: options.profile || isDebug,
    });

    // Build the site
    const startTime = Date.now();
    const timings = await builder.build();
    const buildTime = ((Date.now() - startTime) / 1000).toFixed(3);

    logBuildSuccess(destPath, buildTime);

    // Show timing profile if enabled
    if ((options.profile || isDebug) && timings) {
      reportBuildProfile(timings);
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
