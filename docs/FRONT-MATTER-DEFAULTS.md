# Front Matter Defaults Example

This directory demonstrates the front matter defaults feature in Jekyll.js.

## What are Front Matter Defaults?

Front matter defaults allow you to set default values for front matter variables across multiple files without having to repeat them in each file. This is particularly useful for setting default layouts, authors, or other metadata.

## Configuration

In your `_config.yml`, define defaults using the `defaults` key:

```yaml
defaults:
  # Defaults for all posts
  - scope:
      path: ""
      type: "posts"
    values:
      layout: "post"
      author: "Site Admin"
      comments: true
  
  # Defaults for all pages
  - scope:
      path: ""
      type: "pages"
    values:
      layout: "page"
  
  # Path-specific defaults (all files in projects directory)
  - scope:
      path: "projects"
    values:
      layout: "project"
      featured: true
  
  # Collection-specific defaults
  - scope:
      path: ""
      type: "recipes"
    values:
      layout: "recipe"
      difficulty: "medium"
```

## Scope Options

### `path`
- **Empty string (`""`)**: Matches all files
- **Directory name**: Matches all files in that directory and subdirectories
- **Glob pattern**: Use wildcards like `*.draft.md`

### `type`
- **`posts`**: Matches all posts in `_posts/`
- **`pages`**: Matches all pages (files not in special directories)
- **Collection name**: Matches documents in that collection (e.g., `recipes` for `_recipes/`)
- **Omitted**: Matches all document types

## Precedence

1. File-specific front matter always takes precedence
2. Later scopes override earlier scopes
3. Defaults are merged, not replaced

## Example Usage

### Post without explicit front matter
```markdown
---
title: My Post
---
Content here
```

With defaults configured, this post will automatically have:
- `layout: post`
- `author: Site Admin`
- `comments: true`

### Page overriding defaults
```markdown
---
title: Special Page
layout: custom
---
Content here
```

This page will have `layout: custom` (file wins) but will still get other applicable defaults.

## Testing the Feature

1. Build the example site:
   ```bash
   jekyll-ts build --source /tmp/test-fm-defaults --destination /tmp/test-fm-defaults/_site
   ```

2. Check the generated HTML files to verify defaults were applied.

## Real-World Use Cases

### 1. Blog with Multiple Authors
```yaml
defaults:
  - scope:
      path: ""
      type: "posts"
    values:
      layout: "post"
      comments: true
  - scope:
      path: "_posts/tech"
    values:
      author: "Tech Team"
      category: "technology"
  - scope:
      path: "_posts/blog"
    values:
      author: "Blog Team"
      category: "general"
```

### 2. Documentation Site
```yaml
defaults:
  - scope:
      path: ""
      type: "pages"
    values:
      layout: "docs"
      toc: true
  - scope:
      path: "api"
    values:
      layout: "api"
      version: "v1"
```

### 3. Multi-language Site
```yaml
defaults:
  - scope:
      path: "en"
    values:
      lang: "en"
      locale: "en_US"
  - scope:
      path: "es"
    values:
      lang: "es"
      locale: "es_ES"
```

## Benefits

- **DRY (Don't Repeat Yourself)**: Set values once, apply everywhere
- **Consistency**: Ensure all similar content has the same metadata
- **Easy maintenance**: Change defaults in one place
- **Flexibility**: Override defaults when needed

## Compatibility

This feature is compatible with Jekyll 4.x front matter defaults. The behavior matches Jekyll's implementation:
- Scope matching based on path patterns and document types
- File front matter takes precedence
- Multiple scopes can apply to the same file
