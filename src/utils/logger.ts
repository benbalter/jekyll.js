/**
 * Enhanced logger utility for structured logging with color support
 */

import chalk from 'chalk';
import { JekyllError } from './errors';

type LogLevel = 'info' | 'warn' | 'error' | 'debug' | 'success';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: Record<string, any>;
}

interface LoggerOptions {
  verbose?: boolean;
  quiet?: boolean;
  colors?: boolean;
}

class Logger {
  private static instance: Logger;
  private options: LoggerOptions = {
    verbose: false,
    quiet: false,
    colors: true,
  };

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Configure the logger
   */
  configure(options: LoggerOptions): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Set verbose mode
   */
  setVerbose(verbose: boolean): void {
    this.options.verbose = verbose;
  }

  /**
   * Set quiet mode
   */
  setQuiet(quiet: boolean): void {
    this.options.quiet = quiet;
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>): void {
    // Skip logs in quiet mode (except errors)
    if (this.options.quiet && level !== 'error') {
      return;
    }

    // Skip debug logs unless verbose mode is enabled
    // Debug can be enabled via setVerbose(), configure(), or DEBUG environment variable
    if (level === 'debug' && !this.options.verbose && !process.env.DEBUG) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context,
    };

    const formattedMessage = this.formatMessage(entry);
    
    switch (level) {
      case 'error':
        console.error(formattedMessage);
        break;
      case 'warn':
        console.warn(formattedMessage);
        break;
      default:
        console.log(formattedMessage);
    }
  }

  /**
   * Format a log message with color and context
   */
  private formatMessage(entry: LogEntry): string {
    const { level, message, context } = entry;
    const timestamp = this.options.verbose
      ? `[${entry.timestamp.toISOString()}] `
      : '';

    let coloredLevel = '';
    let coloredMessage = message;

    if (this.options.colors) {
      switch (level) {
        case 'error':
          coloredLevel = chalk.red('✗');
          coloredMessage = chalk.red(message);
          break;
        case 'warn':
          coloredLevel = chalk.yellow('⚠');
          coloredMessage = chalk.yellow(message);
          break;
        case 'success':
          coloredLevel = chalk.green('✓');
          coloredMessage = chalk.green(message);
          break;
        case 'debug':
          coloredLevel = chalk.gray('[DEBUG]');
          coloredMessage = chalk.gray(message);
          break;
        case 'info':
        default:
          coloredLevel = chalk.blue('ℹ');
          break;
      }
    } else {
      coloredLevel = `[${level.toUpperCase()}]`;
    }

    const parts = [timestamp, coloredLevel, coloredMessage].filter(Boolean);
    let formatted = parts.join(' ');

    // Add context if in verbose mode
    if (this.options.verbose && context && Object.keys(context).length > 0) {
      formatted += '\n' + this.formatContext(context);
    }

    return formatted;
  }

  /**
   * Format context data for display
   */
  private formatContext(context: Record<string, any>): string {
    return Object.entries(context)
      .map(([key, value]) => {
        let formattedValue: string;
        try {
          formattedValue = typeof value === 'object' 
            ? JSON.stringify(value, null, 2)
            : String(value);
        } catch (error) {
          // Handle circular references or other stringify errors
          formattedValue = '[Complex Object]';
        }
        return chalk.gray(`  ${key}: ${formattedValue}`);
      })
      .join('\n');
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

      this.error(error.getFormattedMessage(), context);

      // In verbose mode, also show the stack trace
      if (this.options.verbose && error.stack) {
        console.error(chalk.gray('\nStack trace:'));
        console.error(chalk.gray(error.stack));
      }

      // Show cause if available
      if (error.cause && this.options.verbose) {
        console.error(chalk.gray('\nCaused by:'));
        if (error.cause instanceof Error) {
          console.error(chalk.gray(error.cause.message));
          if (error.cause.stack) {
            console.error(chalk.gray(error.cause.stack));
          }
        } else {
          console.error(chalk.gray(String(error.cause)));
        }
      }
    } else {
      this.error(error.message, additionalContext);
      if (this.options.verbose && error.stack) {
        console.error(chalk.gray('\nStack trace:'));
        console.error(chalk.gray(error.stack));
      }
    }
  }

  info(message: string, context?: Record<string, any>): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, any>): void {
    this.log('warn', message, context);
  }

  error(message: string, context?: Record<string, any>): void {
    this.log('error', message, context);
  }

  debug(message: string, context?: Record<string, any>): void {
    this.log('debug', message, context);
  }

  success(message: string, context?: Record<string, any>): void {
    this.log('success', message, context);
  }

  /**
   * Create a section header for better output organization
   */
  section(title: string): void {
    if (this.options.quiet) return;
    
    const line = '─'.repeat(50);
    console.log(chalk.blue(`\n${line}`));
    console.log(chalk.blue.bold(`  ${title}`));
    console.log(chalk.blue(`${line}\n`));
  }

  /**
   * Log a simple message without formatting (useful for progress indicators)
   */
  plain(message: string): void {
    if (this.options.quiet) return;
    console.log(message);
  }
}

export const logger = Logger.getInstance();
