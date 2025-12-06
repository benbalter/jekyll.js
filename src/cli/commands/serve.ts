import chalk from 'chalk';
import { DevServer } from '../../server';
import {
  CommonCLIOptions,
  initializeCLI,
  createSiteAndBuilder,
  reportBuildProfile,
} from './common';

interface ServeOptions extends CommonCLIOptions {
  port: string;
  host: string;
  livereload: boolean;
}

/**
 * Serve command handler
 * Builds the site and starts a development server
 */
export async function serveCommand(options: ServeOptions): Promise<void> {
  try {
    // Initialize CLI with common setup
    const { sourcePath, destPath, configPath, config, isVerbose, isDebug } = initializeCLI(options);

    // Parse port from CLI or use config
    const port = options.port ? parseInt(options.port, 10) : config.port || 4000;
    const host = options.host || config.host || 'localhost';

    // Apply serve-specific CLI flags to config
    config.livereload = options.livereload;

    if (isVerbose) {
      console.log(chalk.blue('\nFinal configuration:'));
      console.log('  Source:', sourcePath);
      console.log('  Destination:', destPath);
      console.log('  Config file:', configPath);
      console.log('  Server:', `http://${host}:${port}`);
      if (config.livereload) console.log('  LiveReload:', 'enabled');
      if (config.show_drafts) console.log('  Drafts:', 'enabled');
      if (config.future) console.log('  Future:', 'enabled');
      if (isDebug) console.log('  Debug:', 'enabled');
    }

    // Build the site first
    console.log(chalk.green('\nBuilding site...'));

    // Create site and builder
    const { site, builder } = createSiteAndBuilder({
      sourcePath,
      config,
      drafts: options.drafts,
      future: options.future,
      verbose: isVerbose,
      timing: isDebug,
    });

    // Build the site
    const startTime = Date.now();
    const timings = await builder.build();
    const buildTime = ((Date.now() - startTime) / 1000).toFixed(3);

    console.log(chalk.green('✓'), 'Site built successfully!');
    console.log('  Output:', destPath);
    console.log(`  Done in ${buildTime} seconds.`);

    // Show timing profile if debug mode is enabled
    if (isDebug && timings) {
      reportBuildProfile(timings);
    }

    // Start the development server
    console.log(chalk.green('\nStarting server...'));

    const server = new DevServer({
      port,
      host,
      destination: destPath,
      source: sourcePath,
      livereload: config.livereload,
      site,
      builder,
      verbose: isVerbose,
    });

    await server.start();

    // Handle graceful shutdown
    const shutdown = async () => {
      console.log(chalk.yellow('\n\nShutting down...'));
      await server.stop();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    if (error instanceof Error) {
      console.error(chalk.red('\nServer failed:'), error.message);
      if (options.verbose && error.stack) {
        console.error(error.stack);
      }
    }
    throw error;
  }
}
