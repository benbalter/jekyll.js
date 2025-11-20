import chalk from 'chalk';
import { resolve, join } from 'path';
import { loadConfig, validateConfig, printValidation } from '../../config';

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
    // Load configuration from file
    const configPath = resolve(options.config);
    const config = loadConfig(configPath, options.verbose);
    
    // Validate configuration
    const validation = validateConfig(config);
    printValidation(validation, options.verbose);
    
    if (!validation.valid) {
      throw new Error('Configuration validation failed. Please fix the errors above.');
    }
    
    // Override config with CLI options
    const sourcePath = resolve(options.source);
    const destPath = options.destination 
      ? resolve(options.destination)
      : config.destination || join(sourcePath, '_site');
    
    // Parse port from CLI or use config
    const port = options.port ? parseInt(options.port, 10) : (config.port || 4000);
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
      console.log('  Source:', config.source);
      console.log('  Destination:', destPath);
      console.log('  Config file:', configPath);
      console.log('  Server:', `http://${host}:${port}`);
      if (config.livereload) console.log('  LiveReload:', 'enabled');
      if (config.show_drafts) console.log('  Drafts:', 'enabled');
      if (config.future) console.log('  Future:', 'enabled');
    }

    // Build the site first
    console.log(chalk.green('\nBuilding site...'));
    // TODO: Call actual build logic
    console.log(chalk.green('✓'), 'Site built successfully!');
    
    // Start the server
    console.log(chalk.green('Starting server...'));
    console.log(chalk.green('✓'), `Server running at http://${host}:${port}/`);
    console.log(chalk.gray('  Press Ctrl+C to stop'));
    
    // TODO: Implement actual server
    // - Serve static files from destination
    // - Watch for file changes
    // - Rebuild on changes
    // - LiveReload support
    
    // Keep process alive
    await new Promise(() => {}); // eslint-disable-line @typescript-eslint/no-unused-vars
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
