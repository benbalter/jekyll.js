/**
 * Simple logger utility for structured logging
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: Record<string, any>;
}

class Logger {
  private static instance: Logger;

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context,
    };

    // For now, output to console
    // In the future, this could be extended to write to files, send to services, etc.
    const prefix = `[${entry.timestamp.toISOString()}] [${level.toUpperCase()}]`;
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    
    switch (level) {
      case 'error':
        console.error(`${prefix} ${message}${contextStr}`);
        break;
      case 'warn':
        console.warn(`${prefix} ${message}${contextStr}`);
        break;
      case 'debug':
        if (process.env.DEBUG || process.env.VERBOSE) {
          console.log(`${prefix} ${message}${contextStr}`);
        }
        break;
      default:
        console.log(`${prefix} ${message}${contextStr}`);
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
}

export const logger = Logger.getInstance();
