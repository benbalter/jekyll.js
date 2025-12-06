import { Document, DocumentType } from '../Document';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

describe('Document', () => {
  const testDir = join(__dirname, '../../../../tmp/test-document');

  beforeEach(() => {
    // Create test directory
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    if (rmSync) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('constructor', () => {
    it('should parse a document with front matter', () => {
      const filePath = join(testDir, 'test.md');
      const content = `---
title: Test Page
date: 2023-01-15
tags: [test, jekyll]
---

# Hello World

This is a test page.`;

      writeFileSync(filePath, content);

      const doc = new Document(filePath, testDir, DocumentType.PAGE);

      expect(doc.path).toBe(filePath);
      expect(doc.relativePath).toBe('test.md');
      expect(doc.type).toBe(DocumentType.PAGE);
      expect(doc.extname).toBe('.md');
      expect(doc.basename).toBe('test');
      expect(doc.data.title).toBe('Test Page');
      expect(doc.content.trim()).toBe('# Hello World\n\nThis is a test page.');
      expect(doc.hasFrontMatter).toBe(true);
    });

    it('should parse a document without front matter', () => {
      const filePath = join(testDir, 'test.md');
      const content = `# Hello World\n\nThis is a test page.`;

      writeFileSync(filePath, content);

      const doc = new Document(filePath, testDir, DocumentType.PAGE);

      expect(doc.hasFrontMatter).toBe(false);
      expect(doc.data).toEqual({});
      expect(doc.content).toBe(content);
    });

    it('should extract collection name for collection documents', () => {
      const filePath = join(testDir, 'test.md');
      writeFileSync(filePath, '---\ntitle: Test\n---\nContent');

      const doc = new Document(filePath, testDir, DocumentType.COLLECTION, 'recipes');

      expect(doc.collection).toBe('recipes');
    });
  });

  describe('title property', () => {
    it('should return title from front matter', () => {
      const filePath = join(testDir, 'test.md');
      writeFileSync(filePath, '---\ntitle: My Title\n---\nContent');

      const doc = new Document(filePath, testDir, DocumentType.PAGE);
      expect(doc.title).toBe('My Title');
    });

    it('should fall back to basename if no title in front matter', () => {
      const filePath = join(testDir, 'my-page.md');
      writeFileSync(filePath, 'Content');

      const doc = new Document(filePath, testDir, DocumentType.PAGE);
      expect(doc.title).toBe('my-page');
    });
  });

  describe('date property', () => {
    it('should return date from front matter', () => {
      const filePath = join(testDir, 'test.md');
      writeFileSync(filePath, '---\ndate: 2023-01-15\n---\nContent');

      const doc = new Document(filePath, testDir, DocumentType.PAGE);
      // Date should be stored as UTC midnight for consistent handling across timezones
      expect(doc.date).toEqual(new Date(Date.UTC(2023, 0, 15)));
    });

    it('should extract date from post filename', () => {
      const filePath = join(testDir, '2023-01-15-my-post.md');
      writeFileSync(filePath, 'Content');

      const doc = new Document(filePath, testDir, DocumentType.POST);
      // Date should be stored as UTC midnight for consistent handling across timezones
      expect(doc.date).toEqual(new Date(Date.UTC(2023, 0, 15)));
    });

    it('should return undefined if no date found', () => {
      const filePath = join(testDir, 'test.md');
      writeFileSync(filePath, 'Content');

      const doc = new Document(filePath, testDir, DocumentType.PAGE);
      expect(doc.date).toBeUndefined();
    });

    it('should preserve calendar date regardless of timezone for filename dates', () => {
      // Test with a date that would shift when converted from UTC to a western timezone
      // 2021-02-01 UTC midnight would be 2021-01-31 in PST (UTC-8)
      const filePath = join(testDir, '2021-02-01-timezone-test.md');
      writeFileSync(filePath, 'Content');

      const doc = new Document(filePath, testDir, DocumentType.POST);
      const date = doc.date!;

      // Using UTC methods should always give us the correct date components
      expect(date.getUTCFullYear()).toBe(2021);
      expect(date.getUTCMonth()).toBe(1); // February (0-indexed)
      expect(date.getUTCDate()).toBe(1);
    });

    it('should preserve calendar date regardless of timezone for front matter dates', () => {
      const filePath = join(testDir, 'test.md');
      writeFileSync(filePath, '---\ndate: 2021-02-01\n---\nContent');

      const doc = new Document(filePath, testDir, DocumentType.PAGE);
      const date = doc.date!;

      // Using UTC methods should always give us the correct date components
      expect(date.getUTCFullYear()).toBe(2021);
      expect(date.getUTCMonth()).toBe(1); // February (0-indexed)
      expect(date.getUTCDate()).toBe(1);
    });
  });

  describe('published property', () => {
    it('should return true by default', () => {
      const filePath = join(testDir, 'test.md');
      writeFileSync(filePath, 'Content');

      const doc = new Document(filePath, testDir, DocumentType.PAGE);
      expect(doc.published).toBe(true);
    });

    it('should return false if published is false', () => {
      const filePath = join(testDir, 'test.md');
      writeFileSync(filePath, '---\npublished: false\n---\nContent');

      const doc = new Document(filePath, testDir, DocumentType.PAGE);
      expect(doc.published).toBe(false);
    });

    it('should return false if draft is true', () => {
      const filePath = join(testDir, 'test.md');
      writeFileSync(filePath, '---\ndraft: true\n---\nContent');

      const doc = new Document(filePath, testDir, DocumentType.PAGE);
      expect(doc.published).toBe(false);
    });
  });

  describe('layout property', () => {
    it('should return layout from front matter', () => {
      const filePath = join(testDir, 'test.md');
      writeFileSync(filePath, '---\nlayout: post\n---\nContent');

      const doc = new Document(filePath, testDir, DocumentType.PAGE);
      expect(doc.layout).toBe('post');
    });

    it('should return undefined if no layout', () => {
      const filePath = join(testDir, 'test.md');
      writeFileSync(filePath, 'Content');

      const doc = new Document(filePath, testDir, DocumentType.PAGE);
      expect(doc.layout).toBeUndefined();
    });
  });

  describe('categories property', () => {
    it('should return array of categories', () => {
      const filePath = join(testDir, 'test.md');
      writeFileSync(filePath, '---\ncategories: [tech, programming]\n---\nContent');

      const doc = new Document(filePath, testDir, DocumentType.POST);
      expect(doc.categories).toEqual(['tech', 'programming']);
    });

    it('should handle single category string', () => {
      const filePath = join(testDir, 'test.md');
      writeFileSync(filePath, '---\ncategory: tech\n---\nContent');

      const doc = new Document(filePath, testDir, DocumentType.POST);
      expect(doc.categories).toEqual(['tech']);
    });

    it('should handle space-separated categories', () => {
      const filePath = join(testDir, 'test.md');
      writeFileSync(filePath, '---\ncategories: tech programming\n---\nContent');

      const doc = new Document(filePath, testDir, DocumentType.POST);
      expect(doc.categories).toEqual(['tech', 'programming']);
    });

    it('should return empty array if no categories', () => {
      const filePath = join(testDir, 'test.md');
      writeFileSync(filePath, 'Content');

      const doc = new Document(filePath, testDir, DocumentType.POST);
      expect(doc.categories).toEqual([]);
    });

    it('should return empty array for empty string categories', () => {
      const filePath = join(testDir, 'test.md');
      writeFileSync(filePath, '---\ncategories: ""\n---\nContent');

      const doc = new Document(filePath, testDir, DocumentType.POST);
      expect(doc.categories).toEqual([]);
    });

    it('should return empty array for whitespace-only categories', () => {
      const filePath = join(testDir, 'test.md');
      writeFileSync(filePath, '---\ncategories: "   "\n---\nContent');

      const doc = new Document(filePath, testDir, DocumentType.POST);
      expect(doc.categories).toEqual([]);
    });
  });

  describe('tags property', () => {
    it('should return array of tags', () => {
      const filePath = join(testDir, 'test.md');
      writeFileSync(filePath, '---\ntags: [jekyll, typescript]\n---\nContent');

      const doc = new Document(filePath, testDir, DocumentType.POST);
      expect(doc.tags).toEqual(['jekyll', 'typescript']);
    });

    it('should handle single tag string', () => {
      const filePath = join(testDir, 'test.md');
      writeFileSync(filePath, '---\ntag: jekyll\n---\nContent');

      const doc = new Document(filePath, testDir, DocumentType.POST);
      expect(doc.tags).toEqual(['jekyll']);
    });

    it('should handle space-separated tags', () => {
      const filePath = join(testDir, 'test.md');
      writeFileSync(filePath, '---\ntags: jekyll typescript\n---\nContent');

      const doc = new Document(filePath, testDir, DocumentType.POST);
      expect(doc.tags).toEqual(['jekyll', 'typescript']);
    });

    it('should return empty array if no tags', () => {
      const filePath = join(testDir, 'test.md');
      writeFileSync(filePath, 'Content');

      const doc = new Document(filePath, testDir, DocumentType.POST);
      expect(doc.tags).toEqual([]);
    });

    it('should return empty array for empty string tags', () => {
      const filePath = join(testDir, 'test.md');
      writeFileSync(filePath, '---\ntags: ""\n---\nContent');

      const doc = new Document(filePath, testDir, DocumentType.POST);
      expect(doc.tags).toEqual([]);
    });

    it('should return empty array for whitespace-only tags', () => {
      const filePath = join(testDir, 'test.md');
      writeFileSync(filePath, '---\ntags: "   "\n---\nContent');

      const doc = new Document(filePath, testDir, DocumentType.POST);
      expect(doc.tags).toEqual([]);
    });
  });

  describe('toJSON method', () => {
    it('should return JSON representation of document', () => {
      const filePath = join(testDir, 'test.md');
      writeFileSync(filePath, '---\ntitle: Test\nlayout: post\n---\nContent');

      const doc = new Document(filePath, testDir, DocumentType.PAGE);
      const json = doc.toJSON();

      // In Jekyll, page.path is the relative path for template compatibility
      expect(json.path).toBe('test.md');
      expect(json.relativePath).toBe('test.md');
      expect(json.type).toBe(DocumentType.PAGE);
      expect(json.title).toBe('Test');
      expect(json.layout).toBe('post');
      expect(json.data).toEqual({ title: 'Test', layout: 'post' });
    });

    it('should expose front matter fields at top level for Liquid template access', () => {
      const filePath = join(testDir, 'test.md');
      writeFileSync(
        filePath,
        '---\ntitle: Test Post\ndescription: This is a test description\nauthor: John Doe\n---\nContent'
      );

      const doc = new Document(filePath, testDir, DocumentType.POST);
      const json = doc.toJSON();

      // Front matter fields should be accessible at the top level (Jekyll compatibility)
      expect(json.title).toBe('Test Post');
      expect(json.description).toBe('This is a test description');
      expect(json.author).toBe('John Doe');

      // Fields should also be available in the data object for backward compatibility
      expect(json.data.title).toBe('Test Post');
      expect(json.data.description).toBe('This is a test description');
      expect(json.data.author).toBe('John Doe');
    });
  });

  describe('encoding configuration', () => {
    it('should use utf-8 encoding by default', () => {
      const filePath = join(testDir, 'test.md');
      // UTF-8 content with special characters
      const content = `---
title: Café Münchën
---

Über den Wolken`;

      writeFileSync(filePath, content, 'utf-8');

      // No config provided, should use utf-8 default
      const doc = new Document(filePath, testDir, DocumentType.PAGE);
      expect(doc.data.title).toBe('Café Münchën');
      expect(doc.content.trim()).toBe('Über den Wolken');
    });

    it('should use encoding from config', () => {
      const filePath = join(testDir, 'test.md');
      // UTF-8 content
      const content = `---
title: Test
---

Hello World`;

      writeFileSync(filePath, content, 'utf-8');

      // Pass config with explicit encoding
      const config = { encoding: 'utf-8' as BufferEncoding };
      const doc = new Document(filePath, testDir, DocumentType.PAGE, undefined, config);
      expect(doc.data.title).toBe('Test');
      expect(doc.content.trim()).toBe('Hello World');
    });
  });
});
