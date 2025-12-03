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
      expect(doc.date).toEqual(new Date('2023-01-15'));
    });

    it('should extract date from post filename', () => {
      const filePath = join(testDir, '2023-01-15-my-post.md');
      writeFileSync(filePath, 'Content');

      const doc = new Document(filePath, testDir, DocumentType.POST);
      expect(doc.date).toEqual(new Date('2023-01-15'));
    });

    it('should return undefined if no date found', () => {
      const filePath = join(testDir, 'test.md');
      writeFileSync(filePath, 'Content');

      const doc = new Document(filePath, testDir, DocumentType.PAGE);
      expect(doc.date).toBeUndefined();
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

      expect(json.path).toBe(filePath);
      expect(json.relativePath).toBe('test.md');
      expect(json.type).toBe(DocumentType.PAGE);
      expect(json.title).toBe('Test');
      expect(json.layout).toBe('post');
      expect(json.data).toEqual({ title: 'Test', layout: 'post' });
    });
  });
});
