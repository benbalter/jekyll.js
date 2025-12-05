# Jekyll.js Parity and Improvements

This document describes where Jekyll.js has achieved parity with Ruby Jekyll (Jekyll.rb), and the backwards-compatible improvements that have been added to enhance functionality while maintaining full compatibility with existing Jekyll sites.

---

## Table of Contents

- [What is Parity?](#what-is-parity)
- [Features with Full Parity](#features-with-full-parity)
- [Backwards-Compatible Improvements](#backwards-compatible-improvements)
- [Differences from Ruby Jekyll](#differences-from-ruby-jekyll)
- [Migration Guide](#migration-guide)

---

## What is Parity?

**Parity** means that Jekyll.js behaves identically to Ruby Jekyll for a given feature. When a feature has parity:

- ✅ The same `_config.yml` settings work without modification
- ✅ The same Liquid template syntax produces identical output
- ✅ The same directory structure is recognized and processed
- ✅ Existing Jekyll sites work without any changes

Jekyll.js aims to be a **drop-in replacement** for Ruby Jekyll, allowing users to switch without modifying their site configuration, templates, or content.

---

## Features with Full Parity

The following features have been implemented with full compatibility with Ruby Jekyll 4.x:

### Core Build System ✅

| Feature | Jekyll.rb | Jekyll.js | Notes |
|---------|-----------|-----------|-------|
| `jekyll build` command | ✅ | ✅ | Identical CLI interface |
| `jekyll serve` command | ✅ | ✅ | Development server with live reload |
| `jekyll new` command | ✅ | ✅ | Site scaffolding with `--blank` option |
| YAML configuration (`_config.yml`) | ✅ | ✅ | Full configuration support |
| Front matter parsing | ✅ | ✅ | YAML front matter in all document types |
| Static site generation | ✅ | ✅ | Complete build workflow |
| Verbose output (`--verbose`) | ✅ | ✅ | Detailed build information |

### Content Types ✅

| Feature | Jekyll.rb | Jekyll.js | Notes |
|---------|-----------|-----------|-------|
| Pages | ✅ | ✅ | Markdown and HTML pages |
| Posts (`_posts/`) | ✅ | ✅ | Date-based blog posts |
| Drafts (`_drafts/`) | ✅ | ✅ | `--drafts` flag support |
| Future posts | ✅ | ✅ | `--future` flag support |
| Collections | ✅ | ✅ | Custom content types |
| Layouts (`_layouts/`) | ✅ | ✅ | Template inheritance |
| Includes (`_includes/`) | ✅ | ✅ | Reusable partials |
| Data files (`_data/`) | ✅ | ✅ | YAML and JSON data |

### Liquid Templating ✅

| Feature | Jekyll.rb | Jekyll.js | Notes |
|---------|-----------|-----------|-------|
| Full Liquid syntax | ✅ | ✅ | All standard Liquid features |
| Jekyll filters | ✅ | ✅ | 60+ filters implemented |
| Jekyll tags | ✅ | ✅ | `include`, `highlight`, `link`, `post_url` |
| Layout inheritance | ✅ | ✅ | Nested layouts work correctly |
| Front matter defaults | ✅ | ✅ | Path and type-based defaults |

### URL & Permalink Support ✅

| Feature | Jekyll.rb | Jekyll.js | Notes |
|---------|-----------|-----------|-------|
| Permalinks | ✅ | ✅ | All permalink patterns |
| `relative_url` filter | ✅ | ✅ | Respects `baseurl` |
| `absolute_url` filter | ✅ | ✅ | Full URL generation |
| Post URL generation | ✅ | ✅ | Automatic date-based URLs |
| Collection URLs | ✅ | ✅ | Custom permalink patterns |

### Build Features ✅

| Feature | Jekyll.rb | Jekyll.js | Notes |
|---------|-----------|-----------|-------|
| Watch mode (`--watch`) | ✅ | ✅ | Automatic rebuild on changes |
| Incremental builds (`--incremental`) | ✅ | ✅ | Only rebuild changed files |
| Custom source/destination | ✅ | ✅ | `-s`, `-d` flags |
| File exclusion (`exclude`) | ✅ | ✅ | Pattern-based exclusion |
| File inclusion (`include`) | ✅ | ✅ | Force include files |
| Configuration file (`--config`) | ✅ | ✅ | Custom config file path |

### Development Server ✅

| Feature | Jekyll.rb | Jekyll.js | Notes |
|---------|-----------|-----------|-------|
| HTTP server | ✅ | ✅ | Static file serving |
| Live reload | ✅ | ✅ | WebSocket-based browser refresh |
| File watching | ✅ | ✅ | Automatic rebuild |
| Custom port (`-P`) | ✅ | ✅ | Default: 4000 |
| Custom host (`-H`) | ✅ | ✅ | Default: localhost |
| Base URL support | ✅ | ✅ | Respects `baseurl` config |

### Built-in Plugins ✅

| Plugin | Jekyll.rb | Jekyll.js | Notes |
|--------|-----------|-----------|-------|
| `jekyll-seo-tag` | ✅ | ✅ | SEO meta tags, JSON-LD, Open Graph |
| `jekyll-sitemap` | ✅ | ✅ | XML sitemap generation |
| `jekyll-feed` | ✅ | ✅ | Atom/RSS feed generation |
| `jekyll-jemoji` | ✅ | ✅ | Emoji support |
| `jekyll-github-metadata` | ✅ | ✅ | GitHub repository metadata |
| `jekyll-mentions` | ✅ | ✅ | @mention links |
| `jekyll-redirect-from` | ✅ | ✅ | Redirect pages |
| `jekyll-avatar` | ✅ | ✅ | GitHub avatar helper |

### Pagination ✅

| Feature | Jekyll.rb | Jekyll.js | Notes |
|--------|-----------|-----------|-------|
| `paginate` config | ✅ | ✅ | Posts per page |
| `paginate_path` config | ✅ | ✅ | Custom URL pattern |
| `paginator.posts` | ✅ | ✅ | Posts on current page |
| `paginator.total_posts` | ✅ | ✅ | Total number of posts |
| `paginator.total_pages` | ✅ | ✅ | Total number of pages |
| `paginator.page` | ✅ | ✅ | Current page number |
| `paginator.per_page` | ✅ | ✅ | Posts per page |
| `paginator.previous_page` | ✅ | ✅ | Previous page number |
| `paginator.next_page` | ✅ | ✅ | Next page number |
| `paginator.previous_page_path` | ✅ | ✅ | Previous page URL |
| `paginator.next_page_path` | ✅ | ✅ | Next page URL |

### Theme Support ✅

| Feature | Jekyll.rb | Jekyll.js | Notes |
|--------|-----------|-----------|-------|
| Theme loading | ✅ | ✅ | npm packages instead of gems |
| Layout inheritance | ✅ | ✅ | Site files override theme |
| Include inheritance | ✅ | ✅ | Site files override theme |
| Theme assets | ✅ | ✅ | _sass, assets directories |

### SASS/SCSS Processing ✅

| Feature | Jekyll.rb | Jekyll.js | Notes |
|--------|-----------|-----------|-------|
| `.scss` compilation | ✅ | ✅ | Full SASS support |
| `.sass` compilation | ✅ | ✅ | Indented syntax support |
| `_sass/` partials | ✅ | ✅ | Import directory |
| `sass.sass_dir` config | ✅ | ✅ | Custom partial directory |
| `sass.style` config | ✅ | ✅ | compressed, expanded, etc. |

### Liquid Filters (Complete List) ✅

**Date Filters:**
- `date` - Format date with strftime
- `date_to_xmlschema` - ISO 8601 format
- `date_to_rfc822` - RFC 822 format
- `date_to_string` - Short date
- `date_to_long_string` - Long date

**URL Filters:**
- `relative_url` - Prepend baseurl
- `absolute_url` - Prepend full URL

**Array Filters:**
- `where` - Filter by property
- `where_exp` - Filter by expression
- `group_by` - Group by property
- `group_by_exp` - Group by expression
- `array_to_sentence_string` - Array to sentence
- `sort` - Sort array
- `sort_natural` - Natural sort (case-insensitive)
- `uniq` - Remove duplicates
- `sample` - Random element(s)
- `push`, `pop`, `shift`, `unshift` - Array manipulation
- `find` - Find element by property
- `find_exp` - Find element by expression
- `first`, `last` - First/last element
- `reverse` - Reverse array
- `compact` - Remove nil values
- `concat` - Concatenate arrays
- `map` - Map property from objects
- `join` - Join array to string
- `size` - Array/string length

**String Filters:**
- `xml_escape` - XML escaping
- `cgi_escape` - URL encoding
- `uri_escape` - URI encoding
- `slugify` - URL-friendly slug
- `smartify` - Smart quotes
- `number_of_words` - Word count
- `markdownify` - Markdown to HTML
- `jsonify` - JSON output
- `inspect` - Debug output
- `normalize_whitespace` - Whitespace normalization
- `newline_to_br` - Newlines to HTML breaks
- `strip_html` - Remove HTML tags
- `strip_newlines` - Remove newlines
- `truncate` - Truncate by length
- `truncatewords` - Truncate by words
- `upcase`, `downcase`, `capitalize` - Case conversion
- `strip`, `lstrip`, `rstrip` - Trim whitespace
- `prepend`, `append` - Add prefix/suffix
- `remove`, `remove_first` - Remove substring
- `replace`, `replace_first` - Replace substring
- `split` - Split string to array
- `escape_once` - HTML escape without double-escaping
- `default` - Default value for nil/empty

**Math Filters:**
- `abs` - Absolute value
- `plus`, `minus`, `times`, `divided_by` - Arithmetic
- `modulo` - Modulo operation
- `round`, `ceil`, `floor` - Rounding
- `at_least`, `at_most` - Min/max bounds

**Type Filters:**
- `to_integer` - Convert to integer

### Liquid Tags (Complete List) ✅

- `{% include %}` - Include partials with parameters
- `{% include_relative %}` - Include relative to current file
- `{% include_cached %}` - Include with caching
- `{% highlight %}` - Syntax highlighting
- `{% link %}` - Link to pages
- `{% post_url %}` - Link to posts
- `{% raw %}` - Disable Liquid processing
- `{% comment %}` - Multi-line comments

---

## Backwards-Compatible Improvements

Jekyll.js includes several **optional** modern JavaScript enhancements that improve upon Ruby Jekyll while maintaining full backwards compatibility. These features are opt-in and do not affect existing Jekyll sites unless explicitly enabled.

### 1. Modern Syntax Highlighting with Shiki 🆕

**What**: Replace Rouge (Ruby) with Shiki for syntax highlighting

**Benefits**:
- VSCode-powered highlighting engine
- 100+ languages supported out of the box
- More accurate color themes
- Zero runtime dependencies (pre-generated HTML)
- Perfect color accuracy

**How to Enable**:
```yaml
# _config.yml
modern:
  syntaxHighlighting:
    enabled: true
    theme: github-light  # or github-dark, monokai, etc.
    showLineNumbers: true
```

**Backwards Compatible**: When disabled (default), `{% highlight %}` works identically to Ruby Jekyll.

---

### 2. Image Optimization with Sharp 🆕

**What**: Automatic image optimization during builds

**Benefits**:
- Reduce image sizes by 30-70%
- Automatic WebP/AVIF generation
- Responsive image generation
- 4-5x faster than JavaScript alternatives

**How to Enable**:
```yaml
# _config.yml
modern:
  imageOptimization:
    enabled: true
    quality: 80
    generateWebP: true
    generateAVIF: true
    responsiveSizes:
      - 400
      - 800
      - 1200
```

**Backwards Compatible**: When disabled (default), images are copied unchanged.

---

### 3. Configuration Validation with Zod 🆕

**What**: Runtime type validation for `_config.yml`

**Benefits**:
- Catch configuration errors before build
- Clear, actionable error messages
- TypeScript autocomplete support
- Prevent invalid configuration values

**How it Works**:
- Validates configuration automatically during build
- Warns about invalid or missing values
- Suggests corrections for common mistakes

**Backwards Compatible**: Invalid configurations that worked in Ruby Jekyll will produce warnings, not errors.

---

### 4. npm-Based Themes 🆕

**What**: Themes distributed as npm packages instead of Ruby gems

**Benefits**:
- No Ruby installation required
- Standard JavaScript package management
- Easier theme customization
- Works with existing npm tooling

**How to Use**:
```bash
npm install jekyll-theme-minimal
```

```yaml
# _config.yml
theme: jekyll-theme-minimal
```

**Backwards Compatible**: Sites can override any theme file by placing a file with the same path in their site directory.

---

### 5. TypeScript Implementation 🆕

**What**: Entire codebase written in TypeScript

**Benefits**:
- Type safety prevents many bugs
- Better IDE support (autocomplete, refactoring)
- Easier to contribute and maintain
- Modern JavaScript features

**Backwards Compatible**: TypeScript is compiled to JavaScript; users don't need TypeScript knowledge.

---

### 6. Enhanced Error Messages 🆕

**What**: Improved error messages with context and suggestions

**Benefits**:
- File and line number references
- Suggestions for fixing common issues
- Stack traces for debugging
- Colored output for readability

**Example**:
```
Error: Invalid front matter in _posts/2024-01-01-hello.md
  Line 3: Invalid YAML syntax - unexpected ':'
  
  Suggestion: Enclose values with special characters in quotes
  Example: title: "Hello: World"
```

---

## Differences from Ruby Jekyll

While Jekyll.js aims for full parity, there are some intentional differences:

### Ruby Plugins Not Supported ⚫

Ruby-based Jekyll plugins cannot run in Node.js. Instead:
- Common plugins are reimplemented in TypeScript
- Custom plugins require TypeScript reimplementation
- A TypeScript plugin API is planned for v1.0.0

### Gem-Based Themes Replaced with npm Themes

Ruby gem themes are replaced with npm packages:
- Same functionality, different distribution method
- Themes work identically once installed
- Override mechanism is the same

### Minor Output Differences

Some minor differences may occur:
- Whitespace handling in some edge cases
- Markdown rendering (Remark vs. Kramdown)
- Date formatting locale differences

These differences are rare and typically don't affect site appearance.

---

## Migration Guide

### From Ruby Jekyll to Jekyll.js

**Step 1: Install Jekyll.js**
```bash
npm install -g jekyll-ts
```

**Step 2: Test Your Site**
```bash
# In your Jekyll site directory
jekyll-ts build --verbose
```

**Step 3: Check for Issues**
- Missing plugins → Check if reimplemented or find alternatives
- Theme issues → Install npm version or extract theme files
- Custom plugins → Reimplement in TypeScript

**Step 4: Optional Enhancements**
Enable modern features in `_config.yml`:
```yaml
modern:
  syntaxHighlighting:
    enabled: true
  imageOptimization:
    enabled: true
```

### Sites That Work Without Changes

Most Jekyll sites work immediately:
- ✅ Basic blogs with posts and pages
- ✅ Documentation sites with collections
- ✅ Portfolio sites with custom layouts
- ✅ Sites using SEO, sitemap, feed, jemoji, mentions, redirect-from, or avatar plugins
- ✅ Sites using data files (`_data` directory with YAML/JSON)
- ✅ Sites using front matter defaults
- ✅ Sites using pagination
- ✅ Sites using SASS/SCSS

### Sites Requiring Minor Changes

Some sites need small adjustments:
- 🟡 Sites with Ruby plugins → Find TypeScript alternatives or check if reimplemented
- 🟡 Sites with gem themes → Use npm themes or extract theme files
- 🟡 Sites using CSV/TSV data files → Convert to YAML/JSON

---

## Summary

Jekyll.js provides:

1. **Full Parity** with Ruby Jekyll for core features (88% implemented)
2. **Backwards-Compatible Improvements** that are opt-in
3. **Modern JavaScript Ecosystem** integration
4. **Zero Ruby Dependencies** for Node.js environments
5. **8 Built-in Plugins** reimplemented in TypeScript

Existing Jekyll sites can migrate with minimal or no changes, while gaining access to modern JavaScript tooling and optional enhancements.

---

## Resources

- [Jekyll.rb Documentation](https://jekyllrb.com/docs/) - Ruby Jekyll reference
- [COMPARISON.md](./COMPARISON.md) - Detailed feature comparison
- [FEATURES.md](./FEATURES.md) - Feature status reference
- [MODERN-FEATURES.md](./MODERN-FEATURES.md) - Modern enhancements guide
- [ROADMAP.md](./ROADMAP.md) - Development timeline

---

**Last Updated**: 2025-12-05  
**Jekyll.js Version**: 0.1.0  
**Target Jekyll.rb Version**: 4.3.x  
**Maintained by**: @benbalter
