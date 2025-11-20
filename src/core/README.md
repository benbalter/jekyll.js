# Core Module

This module contains the core Jekyll site processing functionality.

## Classes

### Document

The `Document` class represents a single file in a Jekyll site. It supports:
- Pages
- Posts
- Collection documents
- Layouts
- Includes

#### Usage

```typescript
import { Document, DocumentType } from './core';

// Create a document
const doc = new Document(
  '/path/to/file.md',
  '/path/to/site',
  DocumentType.PAGE
);

// Access properties
console.log(doc.title);        // Title from front matter or filename
console.log(doc.date);         // Date from front matter or filename (for posts)
console.log(doc.content);      // Content without front matter
console.log(doc.data);         // Front matter data
console.log(doc.categories);   // Array of categories
console.log(doc.tags);         // Array of tags
console.log(doc.layout);       // Layout name
console.log(doc.published);    // Published status
```

#### Document Types

```typescript
enum DocumentType {
  PAGE = 'page',
  POST = 'post',
  COLLECTION = 'collection',
  LAYOUT = 'layout',
  INCLUDE = 'include',
}
```

### Site

The `Site` class manages an entire Jekyll site structure. It discovers and organizes all documents.

#### Usage

```typescript
import { Site } from './core';

// Create a site
const site = new Site('/path/to/site', {
  title: 'My Site',
  collections: {
    recipes: { output: true }
  }
});

// Read all files
await site.read();

// Access documents
console.log(site.pages);       // Array of page documents
console.log(site.posts);       // Array of post documents (sorted by date)
console.log(site.layouts);     // Map of layout name to document
console.log(site.includes);    // Map of include path to document
console.log(site.collections); // Map of collection name to documents array

// Use accessor methods
const layout = site.getLayout('default');
const include = site.getInclude('header.html');
const recipes = site.getCollection('recipes');
const allDocs = site.getAllDocuments();
```

#### Configuration

The `SiteConfig` interface supports all Jekyll configuration options:

```typescript
interface SiteConfig {
  title?: string;
  description?: string;
  url?: string;
  baseurl?: string;
  source?: string;
  destination?: string;
  collections?: Record<string, any>;
  exclude?: string[];
  include?: string[];
  [key: string]: any;  // Any other Jekyll config options
}
```

## File Discovery

The `Site` class automatically discovers files based on Jekyll conventions:

### Pages
- Markdown/HTML files in the site root
- Excludes files in special directories (starting with `_`)

### Posts
- Files in `_posts/` directory
- Sorted by date (newest first)
- Date extracted from filename (YYYY-MM-DD-title format) or front matter

### Layouts
- Files in `_layouts/` directory
- Accessed by basename (without extension)

### Includes
- Files in `_includes/` directory
- Supports nested directories
- Accessed by relative path from `_includes/`

### Collections
- Configured in site config
- Files in `_<collection_name>/` directory
- Each document has a `collection` property

## Front Matter

Front matter is parsed using the `gray-matter` library. Supported formats:

```yaml
---
title: My Page
date: 2024-01-15
layout: default
categories: [tech, programming]
tags: [jekyll, typescript]
published: true
custom_field: value
---
```

## Exclude Patterns

Default exclude patterns:
- `_site`
- `.sass-cache`
- `.jekyll-cache`
- `.jekyll-metadata`
- `node_modules`
- `vendor`

Custom patterns can be added via configuration:

```typescript
const site = new Site('/path/to/site', {
  exclude: ['drafts', 'temp']
});
```

## Testing

Run the test suite:

```bash
npm test
```

Run the manual test:

```bash
node scripts/test-site-structure.js
```

## Examples

See `scripts/test-site-structure.js` for a complete working example of using the Site and Document classes.
