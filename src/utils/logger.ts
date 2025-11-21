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
 * Format log message with timestamp, level, message, and metadata
 * @param timestamp Log timestamp
 * @param level Log level (may be colored for console output)
 * @param message Log message (unknown from winston, will be converted to string)
 * @param metadata Additional metadata to include
 * @returns Formatted log string
 */
function formatLogMessage(
  timestamp: string,
  level: string,
  message: unknown,
  metadata: Record<string, unknown>
): string {
  let msg = `[${timestamp}] [${level}] ${String(message)}`;
  // Include metadata if present, excluding timestamp which is already in the message
  if (Object.keys(metadata).length > 0 && metadata.timestamp === undefined) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  return msg;
}

/**
 * Create and configure the Winston logger instance
 */
const logger = winston.createLogger({
  level: process.env.DEBUG || process.env.VERBOSE ? 'debug' : 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ level, message, timestamp, ...metadata }) => {
      return formatLogMessage(timestamp as string, level.toUpperCase(), message, metadata);
    })
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, ...metadata }) => {
          // Level is already colorized by winston.format.colorize()
          return formatLogMessage(timestamp as string, level, message, metadata);
        })
      ),
    }),
  ],
});

export { logger };
