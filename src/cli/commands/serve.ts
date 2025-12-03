import chalk from 'chalk';
import { resolve, join } from 'path';
import { loadConfig, validateConfig, printValidation } from '../../config';
import { Site, Builder } from '../../core';
import { DevServer } from '../../server';

interface ServeOptions {
  source: string;
  destination: string;
  config: string;
  port: string;
  host: string;
  livereload: boolean;
  drafts?: boolean;
  future?: boolean;
  verbose?: boolean;
}

/**
 * Serve command handler
 * Builds the site and starts a development server
 */
export async function serveCommand(options: ServeOptions): Promise<void> {
  try {
    // Resolve source directory from CLI option (defaults to '.')
    const sourcePath = resolve(options.source);

    // Resolve config path relative to source directory if it's a relative path
    const configPath = options.config.startsWith('/')
      ? options.config
      : resolve(sourcePath, options.config);
    const config = loadConfig(configPath, options.verbose);

    // Validate configuration
    const validation = validateConfig(config);
    printValidation(validation, options.verbose);

    if (!validation.valid) {
      throw new Error('Configuration validation failed. Please fix the errors above.');
    }

    // Override config with CLI options
    // Destination path: CLI option takes precedence, then config, then default based on source
    const destPath =
      options.destination !== './_site'
        ? resolve(options.destination)
        : config.destination || join(sourcePath, '_site');

    // Parse port from CLI or use config
    const port = options.port ? parseInt(options.port, 10) : config.port || 4000;
    const host = options.host || config.host || 'localhost';

    // Apply CLI flags to config
    if (options.drafts) {
      config.show_drafts = true;
    }
    if (options.future) {
      config.future = true;
    }
    config.livereload = options.livereload;

    if (options.verbose) {
      console.log(chalk.blue('\nFinal configuration:'));
      console.log('  Source:', sourcePath);
      console.log('  Destination:', destPath);
      console.log('  Config file:', configPath);
      console.log('  Server:', `http://${host}:${port}`);
      if (config.livereload) console.log('  LiveReload:', 'enabled');
      if (config.show_drafts) console.log('  Drafts:', 'enabled');
      if (config.future) console.log('  Future:', 'enabled');
    }

    // Build the site first
    console.log(chalk.green('\nBuilding site...'));

    // Update config with final paths
    config.source = sourcePath;
    config.destination = destPath;

    // Create site and builder
    const site = new Site(sourcePath, config);
    const builder = new Builder(site, {
      showDrafts: options.drafts,
      showFuture: options.future,
      clean: true,
      verbose: options.verbose,
    });

    // Build the site
    await builder.build();

    console.log(chalk.green('✓'), 'Site built successfully!');
    console.log('  Output:', destPath);

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
      verbose: options.verbose,
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
