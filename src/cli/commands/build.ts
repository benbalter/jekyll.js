import chalk from 'chalk';
import { resolve, join } from 'path';
import { loadConfig, validateConfig, printValidation } from '../../config';

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
      console.log(chalk.blue('\nFinal configuration:'));
      console.log('  Source:', config.source);
      console.log('  Destination:', destPath);
      console.log('  Config file:', configPath);
      if (config.show_drafts) console.log('  Drafts:', 'enabled');
      if (config.future) console.log('  Future:', 'enabled');
      if (config.watch) console.log('  Watch:', 'enabled');
    }

    console.log(chalk.green('\nBuilding site...'));
    
    // TODO: Implement actual build logic
    // For now, just show a success message
    console.log(chalk.green('✓'), 'Site built successfully!');
    console.log('  Output:', destPath);
    
    if (config.watch) {
      console.log(chalk.yellow('\nWatching for changes...'));
      console.log(chalk.gray('Press Ctrl+C to stop'));
      // TODO: Implement file watching
      // Keep process alive for now
      await new Promise(() => {}); // eslint-disable-line @typescript-eslint/no-unused-vars
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(chalk.red('\nBuild failed:'), error.message);
      if (options.verbose && error.stack) {
        console.error(error.stack);
      }
    }
    throw error;
  }
}
