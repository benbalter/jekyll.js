/**
 * Custom error classes for Jekyll.js
 * Provides structured error information with file context and helpful messages
 */

import { existsSync, readFileSync } from 'fs';

/**
 * Base class for all Jekyll errors with file context
 */
export class JekyllError extends Error {
  public readonly file?: string;
  public readonly line?: number;
  public readonly column?: number;
  public readonly cause?: Error;
  public readonly suggestion?: string;
  public readonly sourceSnippet?: string;

  constructor(
    message: string,
    options?: {
      file?: string;
      line?: number;
      column?: number;
      cause?: Error;
      suggestion?: string;
    }
  ) {
    super(message);
    this.name = 'JekyllError';
    this.file = options?.file;
    this.line = options?.line;
    this.column = options?.column;
    this.cause = options?.cause;
    this.suggestion = options?.suggestion;

    // Generate source snippet if file and line are available
    if (this.file && this.line !== undefined) {
      this.sourceSnippet = this.generateSourceSnippet();
    }

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Generate a source code snippet showing the error location
   * Shows 2 lines before and after the error line with line numbers
   */
  private generateSourceSnippet(): string | undefined {
    if (!this.file || this.line === undefined) {
      return undefined;
    }

    try {
      if (!existsSync(this.file)) {
        return undefined;
      }

      const content = readFileSync(this.file, 'utf-8');
      const lines = content.split('\n');

      // Calculate the range of lines to show (2 before and 2 after)
      const contextLines = 2;
      const startLine = Math.max(0, this.line - 1 - contextLines);
      const endLine = Math.min(lines.length - 1, this.line - 1 + contextLines);

      // Calculate the width needed for line numbers
      const lineNumWidth = String(endLine + 1).length;

      const snippetLines: string[] = [];
      for (let i = startLine; i <= endLine; i++) {
        const lineNum = String(i + 1).padStart(lineNumWidth, ' ');
        const lineContent = lines[i] ?? '';
        const isErrorLine = i === this.line - 1;
        const marker = isErrorLine ? '>' : ' ';

        snippetLines.push(`${marker} ${lineNum} | ${lineContent}`);

        // Add column marker if this is the error line and column is specified
        if (isErrorLine && this.column !== undefined) {
          const padding = ' '.repeat(lineNumWidth + 4 + this.column - 1);
          snippetLines.push(`${padding}^`);
        }
      }

      return snippetLines.join('\n');
    } catch {
      return undefined;
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

  /**
   * Get an enhanced formatted message with source snippet and suggestion
   */
  getEnhancedMessage(): string {
    let result = this.getFormattedMessage();

    // Add source snippet
    if (this.sourceSnippet) {
      result += '\n\n' + this.sourceSnippet;
    }

    // Add suggestion
    if (this.suggestion) {
      result += '\n\n💡 Suggestion: ' + this.suggestion;
    }

    return result;
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
      suggestion?: string;
    }
  ) {
    // Provide default suggestion for config errors
    const suggestion = options?.suggestion || getSuggestionForConfigError(message, options?.file);
    super(message, { ...options, suggestion });
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
      suggestion?: string;
    }
  ) {
    // Provide default suggestion for front matter errors
    const suggestion = options?.suggestion || getSuggestionForFrontMatterError(message);
    super(message, { ...options, suggestion });
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
      suggestion?: string;
    }
  ) {
    // Provide default suggestion for template errors
    const suggestion = options?.suggestion || getSuggestionForTemplateError(message);
    super(message, { ...options, suggestion });
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
      suggestion?: string;
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
      suggestion?: string;
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
      suggestion?: string;
    }
  ) {
    // Provide default suggestion for file system errors
    const suggestion = options?.suggestion || getSuggestionForFileSystemError(message);
    super(message, { ...options, suggestion });
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

/**
 * Get a helpful suggestion for config errors based on the error message
 */
function getSuggestionForConfigError(message: string, _file?: string): string | undefined {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('yaml') || lowerMessage.includes('parse')) {
    return 'Check your _config.yml for YAML syntax errors. Common issues include incorrect indentation, missing colons, or unquoted special characters.';
  }

  if (lowerMessage.includes('not found') || lowerMessage.includes('missing')) {
    return 'Ensure the configuration file exists and the path is correct. You can specify a custom config file with --config option.';
  }

  if (lowerMessage.includes('invalid') && lowerMessage.includes('collection')) {
    return 'Collection names should be lowercase and use underscores. Example: collections:\n  my_posts:\n    output: true';
  }

  if (lowerMessage.includes('invalid') && lowerMessage.includes('permalink')) {
    return 'Permalink patterns should use placeholders like :year, :month, :day, :title. Example: permalink: /:categories/:year/:month/:day/:title/';
  }

  return undefined;
}

/**
 * Get a helpful suggestion for front matter errors based on the error message
 */
function getSuggestionForFrontMatterError(message: string): string | undefined {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('yaml') || lowerMessage.includes('parse')) {
    return 'Front matter must be valid YAML between two lines of three dashes (---). Check for incorrect indentation, missing colons, or unquoted special characters.';
  }

  if (lowerMessage.includes('not found') || lowerMessage.includes('missing')) {
    return 'Front matter is required and must start at the very beginning of the file with three dashes (---).';
  }

  if (lowerMessage.includes('date')) {
    return 'Dates in front matter should use ISO 8601 format (YYYY-MM-DD) or include time (YYYY-MM-DD HH:MM:SS).';
  }

  if (lowerMessage.includes('layout')) {
    return 'The layout specified in front matter must exist in the _layouts directory. Check the layout name and file extension.';
  }

  return undefined;
}

/**
 * Get a helpful suggestion for template errors based on the error message
 */
function getSuggestionForTemplateError(message: string): string | undefined {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('undefined') || lowerMessage.includes('not defined')) {
    return 'The variable or object is not available in the current context. Check spelling and ensure the variable is defined in front matter or passed from the template.';
  }

  if (lowerMessage.includes('include') && lowerMessage.includes('not found')) {
    return 'The included file was not found. Check that the file exists in _includes directory and the path is correct.';
  }

  if (lowerMessage.includes('syntax') || lowerMessage.includes('unexpected')) {
    return 'Check Liquid syntax: tags use {% %}, output uses {{ }}, and filters use | character. Ensure all tags are properly closed.';
  }

  if (lowerMessage.includes('layout')) {
    return 'The layout was not found. Check that the layout exists in _layouts directory and front matter references the correct name (without file extension).';
  }

  if (lowerMessage.includes('filter')) {
    return 'The filter may not exist or has incorrect arguments. Check Jekyll/Liquid documentation for available filters and their usage.';
  }

  if (lowerMessage.includes('circular')) {
    return 'A circular reference was detected in layouts. Check that layouts do not reference each other in a loop.';
  }

  return undefined;
}

/**
 * Get a helpful suggestion for file system errors based on the error message
 */
function getSuggestionForFileSystemError(message: string): string | undefined {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('permission') || lowerMessage.includes('eacces')) {
    return 'Check file/directory permissions. Ensure you have read access to source files and write access to the destination directory.';
  }

  if (lowerMessage.includes('not found') || lowerMessage.includes('enoent')) {
    return 'The file or directory does not exist. Check the path and ensure all required directories and files are in place.';
  }

  if (lowerMessage.includes('already exists') || lowerMessage.includes('eexist')) {
    return 'The file or directory already exists. Use --force to overwrite or remove the existing file first.';
  }

  if (lowerMessage.includes('directory') && lowerMessage.includes('create')) {
    return 'Failed to create directory. Check parent directory permissions and ensure the path is valid.';
  }

  return undefined;
}
