import { Document, DocumentType } from '../Document';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { JekyllConfig } from '../../config';

describe('Document with front matter defaults', () => {
  const testDir = join(__dirname, '../../../../tmp/test-frontmatter-defaults');

  beforeEach(() => {
    // Clean up and create fresh test directory
    if (rmSync) {
      rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    if (rmSync) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should apply defaults to document without config', () => {
    const filePath = join(testDir, 'test.md');
    const fileContent = `---
title: Test Page
---
Content here`;
    writeFileSync(filePath, fileContent);

    const doc = new Document(filePath, testDir, DocumentType.PAGE);

    expect(doc.data.title).toBe('Test Page');
    expect(doc.data.layout).toBeUndefined(); // No defaults applied
  });

  it('should apply defaults when config is provided', () => {
    const filePath = join(testDir, 'test.md');
    const fileContent = `---
title: Test Page
---
Content here`;
    writeFileSync(filePath, fileContent);

    const config: JekyllConfig = {
      defaults: [
        {
          scope: { path: '' },
          values: { layout: 'default', author: 'Site Author' },
        },
      ],
    };

    const doc = new Document(filePath, testDir, DocumentType.PAGE, undefined, config);

    expect(doc.data.title).toBe('Test Page');
    expect(doc.data.layout).toBe('default');
    expect(doc.data.author).toBe('Site Author');
  });

  it('should allow file front matter to override defaults', () => {
    const filePath = join(testDir, 'test.md');
    const fileContent = `---
title: Test Page
layout: custom
---
Content here`;
    writeFileSync(filePath, fileContent);

    const config: JekyllConfig = {
      defaults: [
        {
          scope: { path: '' },
          values: { layout: 'default', author: 'Site Author' },
        },
      ],
    };

    const doc = new Document(filePath, testDir, DocumentType.PAGE, undefined, config);

    expect(doc.data.title).toBe('Test Page');
    expect(doc.data.layout).toBe('custom'); // File wins
    expect(doc.data.author).toBe('Site Author');
  });

  it('should apply type-specific defaults to posts', () => {
    const postsDir = join(testDir, '_posts');
    mkdirSync(postsDir);
    const filePath = join(postsDir, '2024-01-01-test.md');
    const fileContent = `---
title: Test Post
---
Content here`;
    writeFileSync(filePath, fileContent);

    const config: JekyllConfig = {
      defaults: [
        {
          scope: { path: '', type: 'posts' },
          values: { layout: 'post', comments: true },
        },
      ],
    };

    const doc = new Document(filePath, testDir, DocumentType.POST, undefined, config);

    expect(doc.data.title).toBe('Test Post');
    expect(doc.data.layout).toBe('post');
    expect(doc.data.comments).toBe(true);
  });

  it('should not apply posts defaults to pages', () => {
    const filePath = join(testDir, 'about.md');
    const fileContent = `---
title: About Page
---
Content here`;
    writeFileSync(filePath, fileContent);

    const config: JekyllConfig = {
      defaults: [
        {
          scope: { path: '', type: 'posts' },
          values: { layout: 'post', comments: true },
        },
      ],
    };

    const doc = new Document(filePath, testDir, DocumentType.PAGE, undefined, config);

    expect(doc.data.title).toBe('About Page');
    expect(doc.data.layout).toBeUndefined();
    expect(doc.data.comments).toBeUndefined();
  });

  it('should apply path-specific defaults', () => {
    const projectsDir = join(testDir, 'projects');
    mkdirSync(projectsDir);
    const filePath = join(projectsDir, 'my-project.md');
    const fileContent = `---
title: My Project
---
Content here`;
    writeFileSync(filePath, fileContent);

    const config: JekyllConfig = {
      defaults: [
        {
          scope: { path: 'projects' },
          values: { layout: 'project', category: 'projects' },
        },
      ],
    };

    const doc = new Document(filePath, testDir, DocumentType.PAGE, undefined, config);

    expect(doc.data.title).toBe('My Project');
    expect(doc.data.layout).toBe('project');
    expect(doc.data.category).toBe('projects');
  });

  it('should apply collection-specific defaults', () => {
    const recipesDir = join(testDir, '_recipes');
    mkdirSync(recipesDir);
    const filePath = join(recipesDir, 'chocolate-cake.md');
    const fileContent = `---
title: Chocolate Cake
---
Delicious recipe`;
    writeFileSync(filePath, fileContent);

    const config: JekyllConfig = {
      defaults: [
        {
          scope: { path: '', type: 'recipes' },
          values: { layout: 'recipe', category: 'desserts' },
        },
      ],
    };

    const doc = new Document(filePath, testDir, DocumentType.COLLECTION, 'recipes', config);

    expect(doc.data.title).toBe('Chocolate Cake');
    expect(doc.data.layout).toBe('recipe');
    expect(doc.data.category).toBe('desserts');
  });

  it('should apply multiple matching scopes in order', () => {
    const projectsDir = join(testDir, 'projects');
    mkdirSync(projectsDir);
    const filePath = join(projectsDir, 'my-project.md');
    const fileContent = `---
title: My Project
---
Content here`;
    writeFileSync(filePath, fileContent);

    const config: JekyllConfig = {
      defaults: [
        {
          scope: { path: '' },
          values: { layout: 'default', author: 'Site Author', category: 'general' },
        },
        {
          scope: { path: 'projects' },
          values: { layout: 'project', category: 'projects' },
        },
      ],
    };

    const doc = new Document(filePath, testDir, DocumentType.PAGE, undefined, config);

    expect(doc.data.title).toBe('My Project');
    expect(doc.data.layout).toBe('project'); // Later scope wins
    expect(doc.data.author).toBe('Site Author'); // From first scope
    expect(doc.data.category).toBe('projects'); // Later scope wins
  });

  it('should handle document with no front matter', () => {
    const filePath = join(testDir, 'test.md');
    const fileContent = `Just content, no front matter`;
    writeFileSync(filePath, fileContent);

    const config: JekyllConfig = {
      defaults: [
        {
          scope: { path: '' },
          values: { layout: 'default', author: 'Site Author' },
        },
      ],
    };

    const doc = new Document(filePath, testDir, DocumentType.PAGE, undefined, config);

    expect(doc.data.layout).toBe('default');
    expect(doc.data.author).toBe('Site Author');
    expect(doc.content).toBe('Just content, no front matter');
  });

  it('should handle empty front matter', () => {
    const filePath = join(testDir, 'test.md');
    const fileContent = `---
---
Just content`;
    writeFileSync(filePath, fileContent);

    const config: JekyllConfig = {
      defaults: [
        {
          scope: { path: '' },
          values: { layout: 'default', author: 'Site Author' },
        },
      ],
    };

    const doc = new Document(filePath, testDir, DocumentType.PAGE, undefined, config);

    expect(doc.data.layout).toBe('default');
    expect(doc.data.author).toBe('Site Author');
    expect(doc.content).toBe('Just content');
  });

  it('should preserve complex front matter values', () => {
    const filePath = join(testDir, 'test.md');
    const fileContent = `---
title: Test Page
tags:
  - javascript
  - typescript
metadata:
  author: John Doe
  date: 2024-01-01
---
Content here`;
    writeFileSync(filePath, fileContent);

    const config: JekyllConfig = {
      defaults: [
        {
          scope: { path: '' },
          values: { layout: 'default', category: 'blog' },
        },
      ],
    };

    const doc = new Document(filePath, testDir, DocumentType.PAGE, undefined, config);

    expect(doc.data.title).toBe('Test Page');
    expect(doc.data.layout).toBe('default');
    expect(doc.data.category).toBe('blog');
    expect(doc.data.tags).toEqual(['javascript', 'typescript']);
    expect(doc.data.metadata).toEqual({
      author: 'John Doe',
      date: new Date('2024-01-01'), // YAML parser converts to Date
    });
  });
});
