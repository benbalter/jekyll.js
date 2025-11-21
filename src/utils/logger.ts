/**
 * Logger utility using Winston for structured logging
 * 
 * Winston provides battle-tested, feature-rich logging with:
 * - Multiple log levels (error, warn, info, debug, etc.)
 * - Multiple transports (console, file, http, etc.)
 * - Flexible formatting
 * - Production-ready error handling
 */

import winston from 'winston';

/**
 * Create and configure the Winston logger instance
 */
const logger = winston.createLogger({
  level: process.env.DEBUG || process.env.VERBOSE ? 'debug' : 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ level, message, timestamp, ...metadata }) => {
      let msg = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
      if (Object.keys(metadata).length > 0 && metadata.timestamp === undefined) {
        msg += ` ${JSON.stringify(metadata)}`;
      }
      return msg;
    })
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, ...metadata }) => {
          let msg = `[${timestamp}] [${level}] ${message}`;
          if (Object.keys(metadata).length > 0 && metadata.timestamp === undefined) {
            msg += ` ${JSON.stringify(metadata)}`;
          }
          return msg;
        })
      ),
    }),
  ],
});

export { logger };
