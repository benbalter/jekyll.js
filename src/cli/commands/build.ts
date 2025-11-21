import chalk from 'chalk';
import { resolve, join, dirname } from 'path';
import { loadConfig, validateConfig, printValidation } from '../../config';
import { Site, Builder } from '../../core';
import { logger } from '../../utils/logger';

interface BuildOptions {
  source: string;
  destination: string;
  config: string;
  drafts?: boolean;
  future?: boolean;
  watch?: boolean;
  verbose?: boolean;
}

/**
 * Build command handler
 * Generates the static site from source to destination
 */
export async function buildCommand(options: BuildOptions): Promise<void> {
  // Configure logger
  logger.setVerbose(options.verbose || false);
  
  try {
    // Load configuration from file
    const configPath = resolve(options.config);
    
    logger.debug('Loading configuration', { path: configPath });
    const config = loadConfig(configPath, options.verbose);
    
    // Validate configuration
    const validation = validateConfig(config);
    printValidation(validation, options.verbose);
    
    if (!validation.valid) {
      throw new Error('Configuration validation failed. Please fix the errors above.');
    }
    
    // Override config with CLI options
    const destPath = options.destination 
      ? resolve(options.destination)
      : config.destination || join(config.source || '.', '_site');
    
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
    
    if (options.verbose) {
      logger.section('Configuration');
      console.log('  Source:', config.source);
      console.log('  Destination:', destPath);
      console.log('  Config file:', configPath);
      if (config.show_drafts) console.log('  Drafts:', 'enabled');
      if (config.future) console.log('  Future:', 'enabled');
      if (config.watch) console.log('  Watch:', 'enabled');
    }
    
    // Determine source directory
    const sourcePath = config.source 
      ? resolve(config.source)
      : dirname(resolve(configPath));
    
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
    
    logger.success('Site built successfully!');
    console.log('  Output:', destPath);
    
    if (config.watch) {
      console.log(chalk.yellow('\nWatching for changes...'));
      console.log(chalk.gray('Press Ctrl+C to stop'));
      // TODO: Implement file watching
      // Keep process alive for now
      await new Promise(() => {}); // eslint-disable-line @typescript-eslint/no-unused-vars
    }
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)));
    process.exit(1);
  }
}
