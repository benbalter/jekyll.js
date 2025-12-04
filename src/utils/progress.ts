/**
 * Progress indicator utility for displaying build progress
 * Provides visual feedback during long-running operations
 */

import chalk from 'chalk';

/**
 * Progress indicator options
 */
export interface ProgressOptions {
  /** Total number of items to process */
  total: number;
  /** Label for the progress indicator */
  label?: string;
  /** Whether to enable colors */
  colors?: boolean;
  /** Width of the progress bar (default: 30) */
  width?: number;
  /** Show spinner animation */
  showSpinner?: boolean;
}

/**
 * Progress indicator for tracking build progress
 * Shows a progress bar with percentage and item count
 */
export class ProgressIndicator {
  private current: number = 0;
  private total: number;
  private label: string;
  private colors: boolean;
  private width: number;
  private showSpinner: boolean;
  private startTime: number;
  private lastUpdateTime: number = 0;
  private spinnerFrame: number = 0;
  private spinnerFrames: string[] = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private isComplete: boolean = false;

  constructor(options: ProgressOptions) {
    this.total = options.total;
    this.label = options.label || 'Progress';
    this.colors = options.colors ?? true;
    this.width = options.width || 30;
    this.showSpinner = options.showSpinner ?? true;
    this.startTime = Date.now();
  }

  /**
   * Update the progress with current count
   * @param current Current item number
   * @param message Optional message to display
   */
  update(current: number, message?: string): void {
    this.current = current;
    const now = Date.now();

    // Throttle updates to avoid too much console output (update at most every 50ms)
    if (now - this.lastUpdateTime < 50 && current < this.total) {
      return;
    }
    this.lastUpdateTime = now;

    this.render(message);
  }

  /**
   * Increment progress by 1
   * @param message Optional message to display
   */
  tick(message?: string): void {
    this.update(this.current + 1, message);
  }

  /**
   * Mark progress as complete
   */
  complete(): void {
    this.isComplete = true;
    this.current = this.total;
    this.render();
    // Move to next line after completion
    if (process.stdout.isTTY) {
      console.log('');
    }
  }

  /**
   * Render the progress indicator
   */
  private render(message?: string): void {
    // Only use TTY features if stdout is a terminal
    if (!process.stdout.isTTY) {
      return;
    }

    const percentage = this.total > 0 ? Math.round((this.current / this.total) * 100) : 0;
    const filledWidth = Math.round((this.current / this.total) * this.width);
    const emptyWidth = this.width - filledWidth;

    // Build progress bar
    const filled = '█'.repeat(filledWidth);
    const empty = '░'.repeat(emptyWidth);

    // Get spinner
    const spinner = this.showSpinner && !this.isComplete ? this.getSpinner() : '';

    // Calculate elapsed time
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);

    // Format the progress line
    let line = '';

    if (this.colors) {
      const bar = chalk.cyan(filled) + chalk.gray(empty);
      const labelText = this.isComplete ? chalk.green('✓ ' + this.label) : spinner + this.label;
      const percentageText = chalk.yellow(`${percentage}%`);
      const countText = chalk.gray(`(${this.current}/${this.total})`);
      const timeText = chalk.gray(`${elapsed}s`);
      const messageText = message ? chalk.gray(` - ${message}`) : '';

      line = `${labelText} [${bar}] ${percentageText} ${countText} ${timeText}${messageText}`;
    } else {
      const bar = filled + empty;
      const labelText = this.isComplete ? '✓ ' + this.label : spinner + this.label;
      const messageText = message ? ` - ${message}` : '';

      line = `${labelText} [${bar}] ${percentage}% (${this.current}/${this.total}) ${elapsed}s${messageText}`;
    }

    // Clear line and write progress
    process.stdout.write('\r' + line + ' '.repeat(20) + '\r');
  }

  /**
   * Get current spinner frame
   */
  private getSpinner(): string {
    this.spinnerFrame = (this.spinnerFrame + 1) % this.spinnerFrames.length;
    return (this.spinnerFrames[this.spinnerFrame] || '⠋') + ' ';
  }
}

/**
 * Simple spinner for indeterminate progress
 */
export class Spinner {
  private frames: string[] = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private currentFrame: number = 0;
  private interval: ReturnType<typeof setInterval> | null = null;
  private message: string;
  private colors: boolean;
  private startTime: number = 0;

  constructor(message: string, colors: boolean = true) {
    this.message = message;
    this.colors = colors;
  }

  /**
   * Start the spinner
   */
  start(): void {
    if (!process.stdout.isTTY) {
      // Just log the message if not a TTY
      console.log(this.message + '...');
      return;
    }

    this.startTime = Date.now();
    this.interval = setInterval(() => {
      this.render();
    }, 80);
    this.render();
  }

  /**
   * Update the spinner message
   */
  setText(message: string): void {
    this.message = message;
    if (!this.interval && process.stdout.isTTY) {
      this.render();
    }
  }

  /**
   * Stop the spinner with success
   */
  succeed(message?: string): void {
    this.stop();
    const finalMessage = message || this.message;
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(2);

    if (this.colors) {
      console.log(chalk.green('✓') + ' ' + finalMessage + chalk.gray(` (${elapsed}s)`));
    } else {
      console.log('✓ ' + finalMessage + ` (${elapsed}s)`);
    }
  }

  /**
   * Stop the spinner with failure
   */
  fail(message?: string): void {
    this.stop();
    const finalMessage = message || this.message;

    if (this.colors) {
      console.log(chalk.red('✗') + ' ' + chalk.red(finalMessage));
    } else {
      console.log('✗ ' + finalMessage);
    }
  }

  /**
   * Stop the spinner
   */
  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    if (process.stdout.isTTY) {
      // Clear the line
      process.stdout.write('\r' + ' '.repeat(80) + '\r');
    }
  }

  /**
   * Render the spinner
   */
  private render(): void {
    if (!process.stdout.isTTY) return;

    const frame = this.frames[this.currentFrame] || '⠋';
    this.currentFrame = (this.currentFrame + 1) % this.frames.length;

    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);

    let line: string;
    if (this.colors) {
      line = chalk.cyan(frame) + ' ' + this.message + chalk.gray(` ${elapsed}s`);
    } else {
      line = frame + ' ' + this.message + ` ${elapsed}s`;
    }

    process.stdout.write('\r' + line + ' '.repeat(20) + '\r');
  }
}

/**
 * Create a progress indicator for build operations
 * @param total Total number of items
 * @param label Label for the progress
 * @returns ProgressIndicator instance
 */
export function createProgressIndicator(
  total: number,
  label: string,
  colors: boolean = true
): ProgressIndicator {
  return new ProgressIndicator({ total, label, colors });
}

/**
 * Create a spinner for indeterminate operations
 * @param message Message to display
 * @returns Spinner instance
 */
export function createSpinner(message: string, colors: boolean = true): Spinner {
  return new Spinner(message, colors);
}
