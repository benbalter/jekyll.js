import { watch, FSWatcher } from 'chokidar';
import { relative } from 'path';
import chalk from 'chalk';
import { Builder } from '../core';

export interface WatcherOptions {
  /**
   * Source directory to watch
   */
  source: string;

  /**
   * Destination directory to exclude from watching
   */
  destination: string;

  /**
   * Builder instance to trigger rebuilds
   */
  builder: Builder;

  /**
   * Callback to invoke after successful rebuild
   */
  onRebuild?: () => void | Promise<void>;

  /**
   * Enable verbose output
   */
  verbose?: boolean;
}

/**
 * File watcher for automatic site rebuilds
 * Watches source files and triggers rebuilds when changes are detected
 */
export class FileWatcher {
  private watcher: FSWatcher | null = null;
  private isRebuilding = false;

  constructor(private options: WatcherOptions) {}

  /**
   * Start watching for file changes
   */
  start(): void {
    this.watcher = watch(this.options.source, {
      ignored: [
        this.options.destination,
        '**/node_modules/**',
        '**/.git/**',
        '**/.DS_Store',
      ],
      persistent: true,
      ignoreInitial: true,
    });

    this.watcher
      .on('add', (path) => this.handleFileChange('added', path))
      .on('change', (path) => this.handleFileChange('changed', path))
      .on('unlink', (path) => this.handleFileChange('deleted', path));

    console.log(chalk.yellow('\nWatching for changes...'));
    console.log(chalk.gray('Press Ctrl+C to stop'));
  }

  /**
   * Stop watching for file changes
   */
  async stop(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
  }

  /**
   * Handle file change events
   */
  private async handleFileChange(event: string, filepath: string): Promise<void> {
    if (this.isRebuilding) {
      return; // Skip if already rebuilding
    }

    const relativePath = relative(this.options.source, filepath);
    console.log(chalk.gray(`[${event}] ${relativePath}`));

    this.isRebuilding = true;

    try {
      // Rebuild the site
      console.log(chalk.yellow('Rebuilding...'));
      await this.options.builder.build();
      console.log(chalk.green('✓'), 'Site rebuilt');

      // Call the optional callback
      if (this.options.onRebuild) {
        await this.options.onRebuild();
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error(chalk.red('Build error:'), error.message);
        if (this.options.verbose && error.stack) {
          console.error(error.stack);
        }
      }
    } finally {
      this.isRebuilding = false;
    }
  }
}
