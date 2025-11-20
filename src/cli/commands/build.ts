import chalk from 'chalk';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { load as loadYaml } from 'js-yaml';
import { Site, Builder, BuildOptions as CoreBuildOptions } from '../../core';

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
    const sourcePath = resolve(options.source);
    const destPath = resolve(options.destination);
    
    if (options.verbose) {
      console.log(chalk.blue('Configuration:'));
      console.log('  Source:', sourcePath);
      console.log('  Destination:', destPath);
      console.log('  Config:', options.config);
      if (options.drafts) console.log('  Drafts:', 'enabled');
      if (options.future) console.log('  Future:', 'enabled');
      if (options.watch) console.log('  Watch:', 'enabled');
    }

    // Load configuration
    const config = await loadConfig(resolve(options.config));
    
    // Override config with command-line options
    config.source = sourcePath;
    config.destination = destPath;

    console.log(chalk.green('Building site...'));
    
    // Create site and builder
    const site = new Site(sourcePath, config);
    const buildOptions: CoreBuildOptions = {
      drafts: options.drafts,
      future: options.future,
      verbose: options.verbose,
    };
    const builder = new Builder(site, buildOptions);

    // Build the site
    await builder.build();

    // Get and display statistics
    const stats = builder.getStats();
    
    console.log(chalk.green('✓'), 'Site built successfully!');
    console.log('  Output:', destPath);
    console.log('  Pages:', stats.pages);
    console.log('  Posts:', stats.posts);
    if (stats.collections > 0) {
      console.log('  Collection documents:', stats.collections);
    }
    
    if (options.watch) {
      console.log(chalk.yellow('\nWatching for changes...'));
      console.log(chalk.gray('Press Ctrl+C to stop'));
      // TODO: Implement file watching
      // Keep process alive for now
      await new Promise(() => {}); // eslint-disable-line @typescript-eslint/no-unused-vars
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(chalk.red('Build failed:'), error.message);
      if (options.verbose && error.stack) {
        console.error(error.stack);
      }
    }
    throw error;
  }
}

/**
 * Load configuration from _config.yml
 */
async function loadConfig(configPath: string): Promise<Record<string, any>> {
  if (!existsSync(configPath)) {
    // Return default config if no config file exists
    return {};
  }

  try {
    const configContent = await readFile(configPath, 'utf-8');
    const config = loadYaml(configContent) as Record<string, any>;
    return config || {};
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to parse config file: ${error.message}`);
    }
    throw error;
  }
}
