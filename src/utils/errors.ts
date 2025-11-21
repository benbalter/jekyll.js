/**
 * Custom error classes for Jekyll.js
 * Provides structured error information with file context and helpful messages
 */

/**
 * Base class for all Jekyll errors with file context
 */
export class JekyllError extends Error {
  public readonly file?: string;
  public readonly line?: number;
  public readonly column?: number;
  public readonly cause?: Error;

  constructor(
    message: string,
    options?: {
      file?: string;
      line?: number;
      column?: number;
      cause?: Error;
    }
  ) {
    super(message);
    this.name = 'JekyllError';
    this.file = options?.file;
    this.line = options?.line;
    this.column = options?.column;
    this.cause = options?.cause;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Get a formatted error message with file context
   */
  getFormattedMessage(): string {
    const parts: string[] = [];

    if (this.file) {
      let location = this.file;
      if (this.line !== undefined) {
        location += `:${this.line}`;
        if (this.column !== undefined) {
          location += `:${this.column}`;
        }
      }
      parts.push(location);
    }

    parts.push(this.message);

    if (this.cause) {
      parts.push(`\nCaused by: ${this.cause.message}`);
    }

    return parts.join(' - ');
  }
}

/**
 * Error for configuration-related issues
 */
export class ConfigError extends JekyllError {
  constructor(
    message: string,
    options?: {
      file?: string;
      line?: number;
      column?: number;
      cause?: Error;
    }
  ) {
    super(message, options);
    this.name = 'ConfigError';
  }
}

/**
 * Error for front matter parsing issues
 */
export class FrontMatterError extends JekyllError {
  constructor(
    message: string,
    options?: {
      file?: string;
      line?: number;
      column?: number;
      cause?: Error;
    }
  ) {
    super(message, options);
    this.name = 'FrontMatterError';
  }
}

/**
 * Error for Liquid template rendering issues
 */
export class TemplateError extends JekyllError {
  public readonly templateName?: string;

  constructor(
    message: string,
    options?: {
      file?: string;
      line?: number;
      column?: number;
      templateName?: string;
      cause?: Error;
    }
  ) {
    super(message, options);
    this.name = 'TemplateError';
    this.templateName = options?.templateName;
  }

  getFormattedMessage(): string {
    const parts: string[] = [];

    if (this.templateName) {
      parts.push(`Template: ${this.templateName}`);
    }

    if (this.file) {
      let location = this.file;
      if (this.line !== undefined) {
        location += `:${this.line}`;
        if (this.column !== undefined) {
          location += `:${this.column}`;
        }
      }
      parts.push(location);
    }

    parts.push(this.message);

    if (this.cause) {
      parts.push(`\nCaused by: ${this.cause.message}`);
    }

    return parts.join(' - ');
  }
}

/**
 * Error for markdown processing issues
 */
export class MarkdownError extends JekyllError {
  constructor(
    message: string,
    options?: {
      file?: string;
      line?: number;
      column?: number;
      cause?: Error;
    }
  ) {
    super(message, options);
    this.name = 'MarkdownError';
  }
}

/**
 * Error for build process issues
 */
export class BuildError extends JekyllError {
  constructor(
    message: string,
    options?: {
      file?: string;
      line?: number;
      column?: number;
      cause?: Error;
    }
  ) {
    super(message, options);
    this.name = 'BuildError';
  }
}

/**
 * Error for file system issues
 */
export class FileSystemError extends JekyllError {
  constructor(
    message: string,
    options?: {
      file?: string;
      cause?: Error;
    }
  ) {
    super(message, options);
    this.name = 'FileSystemError';
  }
}

/**
 * Helper to create an error with context from another error
 */
export function wrapError(
  error: unknown,
  message: string,
  options?: {
    file?: string;
    line?: number;
    column?: number;
  }
): JekyllError {
  const cause = error instanceof Error ? error : undefined;
  return new JekyllError(message, { ...options, cause });
}

/**
 * Extract line and column information from error message if available
 */
export function parseErrorLocation(errorMessage: string): {
  line?: number;
  column?: number;
} {
  // Try to match common error formats: "line X, column Y", "X:Y", etc.
  // Try to match "line X, column Y" format (case insensitive)
  // Examples: "line 10, column 5", "line:10 column:5"
  const lineColMatch = errorMessage.match(/line[:\s]+(\d+)[:,\s]+column[:\s]+(\d+)/i);
  if (lineColMatch && lineColMatch[1] && lineColMatch[2]) {
    return {
      line: parseInt(lineColMatch[1], 10),
      column: parseInt(lineColMatch[2], 10),
    };
  }

  // Match "X:Y" format with context to avoid false positives
  // Requires prefix like "at", "position", start of string, whitespace, or comma
  // Examples: "at 10:5", "position 10:5", "error at 10:5"
  // Avoids: "http://example.com:8080", "12:34:56 timestamp"
  const colonMatch = errorMessage.match(/(?:^|[\s,]|at\s|position\s)(\d+):(\d+)\b/);
  if (colonMatch && colonMatch[1] && colonMatch[2]) {
    return {
      line: parseInt(colonMatch[1], 10),
      column: parseInt(colonMatch[2], 10),
    };
  }

  const lineMatch = errorMessage.match(/line[:\s]+(\d+)/i);
  if (lineMatch && lineMatch[1]) {
    return {
      line: parseInt(lineMatch[1], 10),
    };
  }

  return {};
}
