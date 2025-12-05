import { watch, FSWatcher } from 'chokidar';
import { relative } from 'path';
import chalk from 'chalk';
import { Builder } from '../core';
import { Hooks } from '../plugins/hooks';

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

  /**
   * Use polling instead of native file system events.
   * More resource-efficient and avoids EMFILE errors on systems with strict file descriptor limits.
   * Defaults to true to prevent "too many open files" errors.
   */
  usePolling?: boolean;

  /**
   * Polling interval in milliseconds (only used when usePolling is true)
   * Defaults to 100ms
   */
  pollInterval?: number;
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
    // Default to polling to avoid EMFILE "too many open files" errors
    // on systems with strict file descriptor limits (especially macOS)
    const usePolling = this.options.usePolling !== false;
    const pollInterval = this.options.pollInterval ?? 100;

    this.watcher = watch(this.options.source, {
      ignored: [this.options.destination, '**/node_modules/**', '**/.git/**', '**/.DS_Store'],
      persistent: true,
      ignoreInitial: true,
      usePolling,
      interval: pollInterval,
    });

    this.watcher
      .on('add', (path) => this.handleFileChange('added', path))
      .on('change', (path) => this.handleFileChange('changed', path))
      .on('unlink', (path) => this.handleFileChange('deleted', path))
      .on('error', (error: unknown) => {
        if (error instanceof Error) {
          this.handleWatchError(error);
        } else {
          console.error(chalk.red('[Watcher Error]'), String(error));
        }
      });

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
      // Trigger site:after_reset hook before rebuild (for watch/serve mode rebuilds)
      await Hooks.trigger('site', 'after_reset', {
        site: this.options.builder.getSite(),
        renderer: this.options.builder.getRenderer(),
      });

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

  /**
   * Handle watcher errors gracefully
   * Prevents the process from crashing when file system errors occur
   */
  private handleWatchError(error: Error): void {
    // Check if it's an EMFILE error (too many open files)
    const isEmfileError = 'code' in error && (error as NodeJS.ErrnoException).code === 'EMFILE';

    if (isEmfileError) {
      console.error(
        chalk.red('[Watcher Error]'),
        'Too many open files. The file watcher may not detect all changes.'
      );
      console.error(
        chalk.yellow('Tip:'),
        'Try increasing the file descriptor limit with `ulimit -n 4096` or reduce the number of watched files.'
      );
    } else {
      console.error(chalk.red('[Watcher Error]'), error.message);
    }

    if (this.options.verbose && error.stack) {
      console.error(error.stack);
    }
  }
}
