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
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

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

  it('should include suggestion', () => {
    const error = new JekyllError('Test error', {
      suggestion: 'Try fixing this specific issue',
    });

    expect(error.suggestion).toBe('Try fixing this specific issue');
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

  describe('getEnhancedMessage', () => {
    it('should include suggestion in enhanced message', () => {
      const error = new JekyllError('Test error', {
        suggestion: 'Try this fix',
      });

      const enhanced = error.getEnhancedMessage();
      expect(enhanced).toContain('Test error');
      expect(enhanced).toContain('💡 Suggestion:');
      expect(enhanced).toContain('Try this fix');
    });
  });

  describe('source snippet generation', () => {
    const testDir = join(__dirname, 'temp-test-files');

    beforeEach(() => {
      mkdirSync(testDir, { recursive: true });
    });

    afterEach(() => {
      rmSync(testDir, { recursive: true, force: true });
    });

    it('should generate source snippet for existing file', () => {
      const testFile = join(testDir, 'test-source.md');
      const content = `line 1
line 2
line 3 with error
line 4
line 5`;
      writeFileSync(testFile, content);

      const error = new JekyllError('Error on line 3', {
        file: testFile,
        line: 3,
      });

      expect(error.sourceSnippet).toBeDefined();
      expect(error.sourceSnippet).toContain('line 3 with error');
      expect(error.sourceSnippet).toContain('>'); // Error line marker
    });

    it('should include column marker in source snippet', () => {
      const testFile = join(testDir, 'test-column.md');
      const content = `line 1
line 2 with error at column
line 3`;
      writeFileSync(testFile, content);

      const error = new JekyllError('Error at column 10', {
        file: testFile,
        line: 2,
        column: 10,
      });

      expect(error.sourceSnippet).toBeDefined();
      expect(error.sourceSnippet).toContain('^'); // Column marker
    });

    it('should not generate snippet for non-existent file', () => {
      const error = new JekyllError('File missing', {
        file: '/nonexistent/path/file.md',
        line: 1,
      });

      expect(error.sourceSnippet).toBeUndefined();
    });

    it('should include snippet in enhanced message', () => {
      const testFile = join(testDir, 'test-enhanced.md');
      const content = `---
title: Test
---
Content here`;
      writeFileSync(testFile, content);

      const error = new JekyllError('Error in front matter', {
        file: testFile,
        line: 2,
        suggestion: 'Check YAML syntax',
      });

      const enhanced = error.getEnhancedMessage();
      expect(enhanced).toContain('title: Test');
      expect(enhanced).toContain('💡 Suggestion:');
    });
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

  it('should auto-generate suggestion for YAML errors', () => {
    const error = new ConfigError('YAML parse error');

    expect(error.suggestion).toBeDefined();
    expect(error.suggestion).toContain('YAML');
  });

  it('should auto-generate suggestion for missing config', () => {
    const error = new ConfigError('Config file not found');

    expect(error.suggestion).toBeDefined();
    expect(error.suggestion).toContain('configuration file');
  });

  it('should use custom suggestion when provided', () => {
    const error = new ConfigError('Custom error', {
      suggestion: 'Custom fix',
    });

    expect(error.suggestion).toBe('Custom fix');
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

  it('should auto-generate suggestion for YAML errors', () => {
    const error = new FrontMatterError('Invalid YAML syntax');

    expect(error.suggestion).toBeDefined();
    expect(error.suggestion).toContain('YAML');
  });

  it('should auto-generate suggestion for date errors', () => {
    const error = new FrontMatterError('Invalid date format');

    expect(error.suggestion).toBeDefined();
    expect(error.suggestion).toContain('ISO 8601');
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

  it('should auto-generate suggestion for undefined variables', () => {
    const error = new TemplateError('undefined variable');

    expect(error.suggestion).toBeDefined();
    expect(error.suggestion).toContain('variable');
  });

  it('should auto-generate suggestion for include errors', () => {
    const error = new TemplateError('include not found');

    expect(error.suggestion).toBeDefined();
    expect(error.suggestion).toContain('_includes');
  });

  it('should auto-generate suggestion for syntax errors', () => {
    const error = new TemplateError('unexpected token');

    expect(error.suggestion).toBeDefined();
    expect(error.suggestion).toContain('Liquid syntax');
  });

  it('should auto-generate suggestion for circular references', () => {
    const error = new TemplateError('circular reference detected');

    expect(error.suggestion).toBeDefined();
    expect(error.suggestion).toContain('circular');
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

  it('should auto-generate suggestion for permission errors', () => {
    const error = new FileSystemError('Permission denied');

    expect(error.suggestion).toBeDefined();
    expect(error.suggestion).toContain('permission');
  });

  it('should auto-generate suggestion for not found errors', () => {
    const error = new FileSystemError('File not found ENOENT');

    expect(error.suggestion).toBeDefined();
    expect(error.suggestion).toContain('does not exist');
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
