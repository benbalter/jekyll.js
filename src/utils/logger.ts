/**
 * Logger utility using Winston for structured logging
 *
 * Winston provides battle-tested, feature-rich logging with:
 * - Multiple log levels (error, warn, info, debug, etc.)
 * - Multiple transports (console, file, http, etc.)
 * - Flexible formatting
 * - Production-ready error handling
 *
 * This wrapper adds Jekyll-specific features on top of Winston.
 */

import winston from 'winston';
import chalk from 'chalk';
import { JekyllError } from './errors';

/**
 * Custom Winston logger wrapper with Jekyll-specific features
 */
class JekyllLogger {
  private winstonLogger: winston.Logger;
  private verbose = false;
  private quiet = false;
  private colors = true;

  constructor() {
    // Create Winston logger with custom formatting
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this; // Needed to access JekyllLogger instance from Winston callbacks

    this.winstonLogger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.json() // Store as JSON internally
      ),
      transports: [
        new winston.transports.Console({
          // Override console methods to use console.log for all levels
          // This matches the original logger behavior and test expectations
          log(info: any, callback: () => void) {
            if (this.format) {
              const formatted = this.format.transform(info, this.format.options || {});
              if (formatted && typeof formatted === 'object') {
                // Get the formatted message
                const msg = (formatted as any)[Symbol.for('message')] || (formatted as any).message;

                // Use console.log for info/debug/success, console.error for error, console.warn for warn
                const level = info[Symbol.for('level')] || info.level;
                if (level === 'error') {
                  console.error(msg);
                } else if (level === 'warn') {
                  console.warn(msg);
                } else {
                  console.log(msg);
                }
              }
            }
            callback();
          },
          format: winston.format.printf((info) => {
            const ts = self.verbose ? `[${info.timestamp}] ` : '';
            let formattedMessage = `${ts}${info.message}`;

            // Add context in verbose mode
            if (self.verbose) {
              // Filter out Winston internal fields
              const metadata: Record<string, any> = {};
              const excludeKeys = ['timestamp', 'level', 'message', 'splat'];

              for (const [key, value] of Object.entries(info)) {
                if (
                  !excludeKeys.includes(key) &&
                  typeof key === 'string' &&
                  !key.startsWith('Symbol')
                ) {
                  metadata[key] = value;
                }
              }

              if (Object.keys(metadata).length > 0) {
                formattedMessage += '\n' + self.formatContext(metadata);
              }
            }

            return formattedMessage;
          }),
        }),
      ],
    });
  }

  /**
   * Format context data for display
   */
  private formatContext(context: Record<string, any>): string {
    if (Object.keys(context).length === 0) {
      return '';
    }

    return Object.entries(context)
      .map(([key, value]) => {
        let formattedValue: string;
        try {
          if (typeof value === 'object' && value !== null) {
            const seen = new WeakSet();
            formattedValue = JSON.stringify(
              value,
              function replacer(_k, v) {
                if (typeof v === 'object' && v !== null) {
                  if (seen.has(v)) return '[Circular]';
                  seen.add(v);
                }
                return v;
              },
              2
            );
          } else {
            formattedValue = String(value);
          }
        } catch (_error) {
          formattedValue = '[Complex Object]';
        }
        const prefix = this.colors ? chalk.gray(`  ${key}: `) : `  ${key}: `;
        return prefix + formattedValue;
      })
      .join('\n');
  }

  /**
   * Configure the logger
   */
  configure(options: { verbose?: boolean; quiet?: boolean; colors?: boolean }): void {
    if (options.verbose !== undefined) {
      this.setVerbose(options.verbose);
    }
    if (options.quiet !== undefined) {
      this.setQuiet(options.quiet);
    }
    if (options.colors !== undefined) {
      this.colors = options.colors;
    }
  }

  /**
   * Set verbose mode
   */
  setVerbose(verbose: boolean): void {
    this.verbose = verbose;
    this.winstonLogger.level = verbose || process.env.DEBUG ? 'debug' : 'info';
  }

  /**
   * Set quiet mode
   */
  setQuiet(quiet: boolean): void {
    this.quiet = quiet;
    this.winstonLogger.level = quiet ? 'error' : this.verbose ? 'debug' : 'info';
  }

  /**
   * Log info message
   */
  info(message: string, context?: Record<string, any>): void {
    if (this.quiet) return;
    const icon = this.colors ? chalk.blue('ℹ') : 'ℹ';
    const formatted = icon + ' ' + message;
    this.winstonLogger.info(formatted, context);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: Record<string, any>): void {
    if (this.quiet) return;
    const icon = this.colors ? chalk.yellow('⚠') : '⚠';
    const msg = this.colors ? chalk.yellow(message) : message;
    const formatted = icon + ' ' + msg;
    this.winstonLogger.warn(formatted, context);
  }

  /**
   * Log error message
   */
  error(message: string, context?: Record<string, any>): void {
    const icon = this.colors ? chalk.red('✗') : '✗';
    const msg = this.colors ? chalk.red(message) : message;
    const formatted = icon + ' ' + msg;
    this.winstonLogger.error(formatted, context);
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: Record<string, any>): void {
    if (!this.verbose && !process.env.DEBUG) return;
    const prefix = this.colors ? chalk.gray('[DEBUG]') : '[DEBUG]';
    const msg = this.colors ? chalk.gray(message) : message;
    const formatted = prefix + ' ' + msg;
    this.winstonLogger.debug(formatted, context);
  }

  /**
   * Log success message
   */
  success(message: string, context?: Record<string, any>): void {
    if (this.quiet) return;
    const icon = this.colors ? chalk.green('✓') : '✓';
    const msg = this.colors ? chalk.green(message) : message;
    const formatted = icon + ' ' + msg;
    this.winstonLogger.info(formatted, context);
  }

  /**
   * Log an error with optional Jekyll error context
   */
  logError(error: Error | JekyllError, additionalContext?: Record<string, any>): void {
    if (error instanceof JekyllError) {
      const context = {
        ...additionalContext,
        ...(error.file && { file: error.file }),
        ...(error.line && { line: error.line }),
        ...(error.column && { column: error.column }),
      };

      // Use enhanced message which includes source snippet and suggestion
      this.error(error.getEnhancedMessage(), context);

      // In verbose mode, show the stack trace
      if (this.verbose && error.stack) {
        const stackPrefix = this.colors ? chalk.gray('\nStack trace:') : '\nStack trace:';
        const stackTrace = this.colors ? chalk.gray(error.stack) : error.stack;
        console.error(stackPrefix);
        console.error(stackTrace);
      }

      // Show cause if available
      if (error.cause && this.verbose) {
        const causePrefix = this.colors ? chalk.gray('\nCaused by:') : '\nCaused by:';
        console.error(causePrefix);
        if (error.cause instanceof Error) {
          const causeMsg = this.colors ? chalk.gray(error.cause.message) : error.cause.message;
          console.error(causeMsg);
          if (error.cause.stack) {
            const causeStack = this.colors ? chalk.gray(error.cause.stack) : error.cause.stack;
            console.error(causeStack);
          }
        } else {
          const causeStr = this.colors ? chalk.gray(String(error.cause)) : String(error.cause);
          console.error(causeStr);
        }
      }
    } else {
      this.error(error.message, additionalContext);
      if (this.verbose && error.stack) {
        const stackPrefix = this.colors ? chalk.gray('\nStack trace:') : '\nStack trace:';
        const stackTrace = this.colors ? chalk.gray(error.stack) : error.stack;
        console.error(stackPrefix);
        console.error(stackTrace);
      }
    }
  }

  /**
   * Create a section header for better output organization
   */
  section(title: string): void {
    if (this.quiet) return;

    const line = '─'.repeat(50);
    if (this.colors) {
      console.log(chalk.blue(`\n${line}`));
      console.log(chalk.blue.bold(`  ${title}`));
      console.log(chalk.blue(`${line}\n`));
    } else {
      console.log(`\n${line}`);
      console.log(`  ${title}`);
      console.log(`${line}\n`);
    }
  }

  /**
   * Log a simple message without formatting (useful for progress indicators)
   */
  plain(message: string): void {
    if (this.quiet) return;
    console.log(message);
  }
}

// Export singleton instance
export const logger = new JekyllLogger();
