/**
 * Tests for error classes and utilities
 */

import {
  JekyllError,
  ConfigError,
  FrontMatterError,
  TemplateError,
  MarkdownError,
  BuildError,
  FileSystemError,
  wrapError,
  parseErrorLocation,
} from '../errors';

describe('JekyllError', () => {
  it('should create a basic error', () => {
    const error = new JekyllError('Test error');
    
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(JekyllError);
    expect(error.message).toBe('Test error');
    expect(error.name).toBe('JekyllError');
  });

  it('should include file context', () => {
    const error = new JekyllError('Test error', {
      file: 'test.md',
      line: 10,
      column: 5,
    });
    
    expect(error.file).toBe('test.md');
    expect(error.line).toBe(10);
    expect(error.column).toBe(5);
  });

  it('should include cause', () => {
    const cause = new Error('Original error');
    const error = new JekyllError('Wrapped error', { cause });
    
    expect(error.cause).toBe(cause);
  });

  it('should format message with file context', () => {
    const error = new JekyllError('Test error', {
      file: 'test.md',
      line: 10,
      column: 5,
    });
    
    const formatted = error.getFormattedMessage();
    expect(formatted).toContain('test.md:10:5');
    expect(formatted).toContain('Test error');
  });

  it('should format message with cause', () => {
    const cause = new Error('Original error');
    const error = new JekyllError('Wrapped error', {
      file: 'test.md',
      cause,
    });
    
    const formatted = error.getFormattedMessage();
    expect(formatted).toContain('Wrapped error');
    expect(formatted).toContain('Caused by: Original error');
  });
});

describe('ConfigError', () => {
  it('should create a config error', () => {
    const error = new ConfigError('Invalid configuration', {
      file: '_config.yml',
      line: 5,
    });
    
    expect(error).toBeInstanceOf(JekyllError);
    expect(error).toBeInstanceOf(ConfigError);
    expect(error.name).toBe('ConfigError');
    expect(error.file).toBe('_config.yml');
  });
});

describe('FrontMatterError', () => {
  it('should create a front matter error', () => {
    const error = new FrontMatterError('Invalid YAML', {
      file: 'post.md',
      line: 3,
    });
    
    expect(error).toBeInstanceOf(JekyllError);
    expect(error).toBeInstanceOf(FrontMatterError);
    expect(error.name).toBe('FrontMatterError');
  });
});

describe('TemplateError', () => {
  it('should create a template error', () => {
    const error = new TemplateError('Invalid Liquid syntax', {
      file: 'layout.html',
      line: 15,
      templateName: 'default',
    });
    
    expect(error).toBeInstanceOf(JekyllError);
    expect(error).toBeInstanceOf(TemplateError);
    expect(error.name).toBe('TemplateError');
    expect(error.templateName).toBe('default');
  });

  it('should format message with template name', () => {
    const error = new TemplateError('Invalid syntax', {
      file: 'layout.html',
      templateName: 'default',
    });
    
    const formatted = error.getFormattedMessage();
    expect(formatted).toContain('Template: default');
    expect(formatted).toContain('layout.html');
  });
});

describe('MarkdownError', () => {
  it('should create a markdown error', () => {
    const error = new MarkdownError('Failed to parse markdown', {
      file: 'post.md',
    });
    
    expect(error).toBeInstanceOf(JekyllError);
    expect(error).toBeInstanceOf(MarkdownError);
    expect(error.name).toBe('MarkdownError');
  });
});

describe('BuildError', () => {
  it('should create a build error', () => {
    const error = new BuildError('Build failed');
    
    expect(error).toBeInstanceOf(JekyllError);
    expect(error).toBeInstanceOf(BuildError);
    expect(error.name).toBe('BuildError');
  });
});

describe('FileSystemError', () => {
  it('should create a file system error', () => {
    const error = new FileSystemError('File not found', {
      file: '/path/to/file.txt',
    });
    
    expect(error).toBeInstanceOf(JekyllError);
    expect(error).toBeInstanceOf(FileSystemError);
    expect(error.name).toBe('FileSystemError');
  });
});

describe('wrapError', () => {
  it('should wrap an Error instance', () => {
    const original = new Error('Original error');
    const wrapped = wrapError(original, 'Wrapped message', {
      file: 'test.txt',
    });
    
    expect(wrapped).toBeInstanceOf(JekyllError);
    expect(wrapped.message).toBe('Wrapped message');
    expect(wrapped.cause).toBe(original);
    expect(wrapped.file).toBe('test.txt');
  });

  it('should handle non-Error values', () => {
    const wrapped = wrapError('string error', 'Wrapped message');
    
    expect(wrapped).toBeInstanceOf(JekyllError);
    expect(wrapped.message).toBe('Wrapped message');
    expect(wrapped.cause).toBeUndefined();
  });
});

describe('parseErrorLocation', () => {
  it('should parse "line X, column Y" format', () => {
    const result = parseErrorLocation('Error at line 10, column 5');
    
    expect(result.line).toBe(10);
    expect(result.column).toBe(5);
  });

  it('should parse "X:Y" format', () => {
    const result = parseErrorLocation('Error at 10:5');
    
    expect(result.line).toBe(10);
    expect(result.column).toBe(5);
  });

  it('should parse "line X" format', () => {
    const result = parseErrorLocation('Error at line 42');
    
    expect(result.line).toBe(42);
    expect(result.column).toBeUndefined();
  });

  it('should return empty object when no location found', () => {
    const result = parseErrorLocation('Generic error message');
    
    expect(result.line).toBeUndefined();
    expect(result.column).toBeUndefined();
  });

  it('should handle case-insensitive "line" keyword', () => {
    const result = parseErrorLocation('Error at Line 15');
    
    expect(result.line).toBe(15);
  });
});
