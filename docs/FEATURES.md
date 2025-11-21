# Jekyll.js Feature Status

Quick reference for feature implementation status in jekyll.js compared to Jekyll.rb.

> 📋 For detailed specifications, see [Jekyll Compatibility Plan](./jekyll-compatibility-plan.md)  
> 📅 For implementation timeline, see [ROADMAP.md](./ROADMAP.md)

---

## Legend

- ✅ **Fully Implemented** - Feature works as in Jekyll.rb
- 🟡 **Partially Implemented** - Basic functionality works, advanced features missing
- 🔴 **Not Implemented** - Feature is planned but not yet available
- ⚫ **Not Planned** - Feature will not be implemented (e.g., Ruby-specific)

---

## Core Features

| Feature | Status | Version | Notes |
|---------|--------|---------|-------|
| CLI Commands | ✅ | v0.1.0 | `new`, `build`, `serve` |
| Configuration Parsing | ✅ | v0.1.0 | Full `_config.yml` support |
| Front Matter (YAML) | ✅ | v0.1.0 | YAML front matter parsing |
| Markdown Processing | ✅ | v0.1.0 | Remark with GFM support |
| HTML Processing | ✅ | v0.1.0 | Direct HTML page support |
| Permalinks | ✅ | v0.1.0 | Configurable URL patterns |
| Draft Posts | ✅ | v0.1.0 | `--drafts` flag support |
| Future Posts | ✅ | v0.1.0 | `--future` flag support |

---

## Content Types

| Feature | Status | Version | Notes |
|---------|--------|---------|-------|
| Pages | ✅ | v0.1.0 | Standalone pages |
| Posts | ✅ | v0.1.0 | Blog posts in `_posts/` |
| Collections | ✅ | v0.1.0 | Custom content types |
| Layouts | ✅ | v0.1.0 | Template inheritance |
| Includes | ✅ | v0.1.0 | Reusable partials |
| Data Files | 🔴 | v0.2.0 | `_data/` directory - **High Priority** |
| Static Files | 🟡 | v0.1.0 | Basic copying, needs improvements |

---

## Templating

| Feature | Status | Version | Notes |
|---------|--------|---------|-------|
| Liquid Engine | ✅ | v0.1.0 | Full Liquid syntax support |
| Jekyll Filters (Basic) | ✅ | v0.1.0 | Date, URL, array, string filters |
| Jekyll Filters (Advanced) | 🟡 | v0.2.0 | Some filters missing |
| Jekyll Tags (Basic) | ✅ | v0.1.0 | `include`, `highlight`, `link` |
| Jekyll Tags (Advanced) | 🟡 | v0.3.0 | `raw`, `include_relative` missing |
| Layout Inheritance | ✅ | v0.1.0 | Nested layouts work |
| Front Matter Defaults | 🔴 | v0.2.0 | Path/type-based defaults |

---

## Build Features

| Feature | Status | Version | Notes |
|---------|--------|---------|-------|
| Basic Build | ✅ | v0.1.0 | Site generation works |
| Watch Mode | 🔴 | v0.2.0 | `--watch` flag - **High Priority** |
| Incremental Builds | 🔴 | v0.3.0 | Only rebuild changed files |
| Verbose Output | ✅ | v0.1.0 | `--verbose` flag |
| Custom Source/Dest | ✅ | v0.1.0 | `-s`, `-d` options |
| Configuration File | ✅ | v0.1.0 | `--config` option |
| Multiple Configs | 🔴 | v0.4.0 | Comma-separated configs |

---

## Development Server

| Feature | Status | Version | Notes |
|---------|--------|---------|-------|
| Static File Serving | ✅ | v0.1.0 | HTTP server works |
| Live Reload | ✅ | v0.1.0 | WebSocket-based reload |
| File Watching | 🟡 | v0.1.0 | Basic watching, needs polish |
| Custom Port/Host | ✅ | v0.1.0 | `-P`, `-H` options |
| HTTPS Support | 🔴 | v0.4.0 | Not yet available |

---

## Assets & Styling

| Feature | Status | Version | Notes |
|---------|--------|---------|-------|
| Static Assets | 🟡 | v0.1.0 | Copies files, needs optimization |
| SASS/SCSS | 🔴 | v0.2.0 | Not implemented - **High Priority** |
| CSS Minification | 🔴 | v0.3.0 | SASS output styles |
| Source Maps | 🔴 | v0.3.0 | For debugging |
| Asset Pipeline | 🔴 | v0.3.0 | Advanced asset handling |

---

## Plugins

| Feature | Status | Version | Notes |
|---------|--------|---------|-------|
| jekyll-seo-tag | ✅ | v0.1.0 | SEO meta tags, JSON-LD |
| jekyll-sitemap | ✅ | v0.1.0 | XML sitemap generation |
| jekyll-feed | ✅ | v0.1.0 | Atom feed generation |
| Custom TS Plugins | 🔴 | v1.0.0 | Plugin API not yet defined |
| Ruby Plugins | ⚫ | N/A | Not supported - requires TS rewrite |

---

## Advanced Features

| Feature | Status | Version | Notes |
|---------|--------|---------|-------|
| Pagination | 🔴 | v0.3.0 | Posts and collections - **High Priority** |
| Themes | 🔴 | v0.3.0 | Gem-based equivalent |
| Localization (i18n) | 🔴 | v1.0.0+ | Multi-language support |
| Math Support | 🔴 | v1.0.0+ | KaTeX/MathJax |
| Search | 🔴 | Future | Site search functionality |
| Categories | 🟡 | v0.1.0 | Basic support, needs improvement |
| Tags | 🟡 | v0.1.0 | Basic support, needs improvement |

---

## Configuration Options

| Option | Status | Version | Notes |
|--------|--------|---------|-------|
| `title`, `description` | ✅ | v0.1.0 | Site metadata |
| `url`, `baseurl` | ✅ | v0.1.0 | Site URLs |
| `source`, `destination` | ✅ | v0.1.0 | Build directories |
| `collections` | ✅ | v0.1.0 | Collection definitions |
| `permalink` | ✅ | v0.1.0 | URL patterns |
| `exclude`, `include` | ✅ | v0.1.0 | File filters |
| `plugins` | 🟡 | v0.1.0 | List support, loading TBD |
| `defaults` | 🔴 | v0.2.0 | Front matter defaults |
| `paginate` | 🔴 | v0.3.0 | Pagination settings |
| `theme` | 🔴 | v0.3.0 | Theme selection |
| `timezone` | 🔴 | v0.4.0 | Date processing |
| `encoding` | 🔴 | v0.4.0 | File encoding |
| `markdown_ext` | 🔴 | v0.4.0 | Custom extensions |
| `liquid` | 🟡 | v0.1.0 | Error modes |
| `sass` | 🔴 | v0.2.0 | SASS configuration |

---

## Liquid Filters

### ✅ Implemented

**Date Filters:**
- `date_to_xmlschema`
- `date_to_rfc822`
- `date_to_string`
- `date_to_long_string`

**URL Filters:**
- `relative_url`
- `absolute_url`

**Array Filters:**
- `where`
- `where_exp` (basic)
- `group_by`
- `group_by_exp` (basic)
- `array_to_sentence_string`

**String Filters:**
- `xml_escape`
- `cgi_escape`
- `uri_escape`
- `slugify`
- `smartify`
- `number_of_words`
- `markdownify`
- `jsonify`
- `inspect`

### 🔴 Planned (v0.2.0+)

**Array Filters:**
- `sort`
- `sort_natural`
- `uniq`
- `sample`
- `push`, `pop`, `shift`, `unshift`
- `find`, `find_exp`

**Type Filters:**
- `to_integer`
- `to_float`

**String Filters:**
- `normalize_whitespace`

**Math Filters:**
- `abs`
- `plus`, `minus`, `times`, `divided_by`
- `modulo`
- `round`, `ceil`, `floor`

---

## Liquid Tags

### ✅ Implemented

- `{% include %}` - Include partials
- `{% highlight %}` - Syntax highlighting markup
- `{% link %}` - Link to pages (basic)
- `{% post_url %}` - Link to posts (basic)

### 🔴 Planned (v0.3.0+)

- `{% raw %}` - Disable Liquid processing
- `{% include_relative %}` - Include relative to current file
- `{% comment %}` - Multi-line comments (may be built-in)

---

## Performance Benchmarks

Current performance compared to Jekyll.rb (as of v0.1.0):

| Site Size | Jekyll.rb | jekyll.js | Ratio |
|-----------|-----------|-----------|-------|
| Small (10 pages) | ~1s | ~1.2s | 1.2x |
| Medium (100 pages) | ~3s | ~4.5s | 1.5x |
| Large (1000 pages) | ~30s | TBD* | TBD* |

\* *Insufficient test data - benchmarks needed for large sites*

**Goals for v1.0.0:**
- Build time within 2x of Jekyll.rb
- Incremental builds < 500ms
- Memory usage comparable to Jekyll.rb

---

## Compatibility Testing

### Test Sites

We test against various Jekyll sites:

| Site Type | Status | Notes |
|-----------|--------|-------|
| Basic blog | ✅ | Working |
| Portfolio | ✅ | Working |
| Documentation | 🟡 | Mostly working |
| E-commerce | 🔴 | Advanced features needed |
| Multi-language | 🔴 | i18n not implemented |

### Theme Compatibility

| Theme | Status | Issues |
|-------|--------|--------|
| Minima | 🔴 | Needs theme support |
| Minimal Mistakes | 🔴 | Needs theme support |
| Just the Docs | 🔴 | Needs theme support |
| Custom themes | 🟡 | Manual setup works |

---

## Migration from Jekyll.rb

### Zero-Change Sites ✅

Sites that work without modification:
- Basic blogs with posts and pages
- Sites using collections
- Sites with includes and layouts
- Sites using supported plugins (SEO, sitemap, feed)

### Minor Changes Required 🟡

Sites that need small adjustments:
- Sites using unsupported Liquid filters (can work around)
- Sites with custom layouts (may need path adjustments)
- Sites with complex permalinks (mostly work)

### Major Changes Required 🔴

Sites that need significant work:
- Sites using Ruby plugins (need TS reimplementation)
- Sites using SASS (not yet supported)
- Sites using pagination (not yet supported)
- Sites using themes (not yet supported)
- Sites using data files (not yet supported)

---

## Getting Help

### Documentation
- [README.md](../README.md) - Getting started
- [ROADMAP.md](./ROADMAP.md) - Development timeline
- [Jekyll Compatibility Plan](./jekyll-compatibility-plan.md) - Feature specs
- [Liquid Rendering](./liquid-rendering.md) - Template guide

### Support
- [GitHub Issues](https://github.com/benbalter/jekyll.js/issues) - Bug reports
- [GitHub Discussions](https://github.com/benbalter/jekyll.js/discussions) - Questions
- [Jekyll Documentation](https://jekyllrb.com/docs/) - Jekyll reference

### Contributing
- Check [ROADMAP.md](./ROADMAP.md) for priority features
- Look for "good first issue" labels
- Read [Compatibility Plan](./jekyll-compatibility-plan.md) for specs
- Submit PRs with tests and documentation

---

**Last Updated**: 2025-11-21  
**Version**: 0.1.0  
**Maintained by**: @benbalter
