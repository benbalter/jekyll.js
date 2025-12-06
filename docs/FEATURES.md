# Jekyll.js Feature Status

Quick reference for feature implementation status in jekyll.js compared to Jekyll.rb.

> 📋 For detailed specifications, see [Jekyll Compatibility Plan](./jekyll-compatibility-plan.md)  
> 📅 For implementation timeline, see [ROADMAP.md](./ROADMAP.md)  
> 🔄 For parity details and improvements, see [PARITY.md](./PARITY.md)

---

## Legend

- ✅ **Fully Implemented** - Feature works as in Jekyll.rb (full parity)
- 🟡 **Partially Implemented** - Basic functionality works, advanced features missing
- 🔴 **Not Implemented** - Feature is planned but not yet available
- ⚫ **Not Planned** - Feature will not be implemented (e.g., Ruby-specific)
- 🆕 **Improvement** - Backwards-compatible enhancement over Jekyll.rb

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
| Data Files | ✅ | v0.1.0 | `_data/` directory - YAML and JSON |
| Static Files | ✅ | v0.1.0 | Copies files to destination |

---

## Templating

| Feature | Status | Version | Notes |
|---------|--------|---------|-------|
| Liquid Engine | ✅ | v0.1.0 | Full Liquid syntax support |
| Jekyll Filters (Basic) | ✅ | v0.1.0 | Date, URL, array, string filters |
| Jekyll Filters (Advanced) | ✅ | v0.1.0 | 60+ filters implemented |
| Jekyll Tags (Basic) | ✅ | v0.1.0 | `include`, `highlight`, `link` |
| Jekyll Tags (Advanced) | ✅ | v0.1.0 | `raw`, `include_relative`, `include_cached` |
| Layout Inheritance | ✅ | v0.1.0 | Nested layouts work |
| Front Matter Defaults | ✅ | v0.1.0 | Path/type-based defaults |

---

## Build Features

| Feature | Status | Version | Notes |
|---------|--------|---------|-------|
| Basic Build | ✅ | v0.1.0 | Site generation works |
| Watch Mode | ✅ | v0.1.0 | `--watch` flag implemented |
| Incremental Builds | ✅ | v0.1.0 | `--incremental` flag with build cache |
| Verbose Output | ✅ | v0.1.0 | `--verbose` flag |
| Custom Source/Dest | ✅ | v0.1.0 | `-s`, `-d` options |
| Configuration File | ✅ | v0.1.0 | `--config` option |
| Multiple Configs | ✅ | v0.1.0 | Comma-separated configs supported |

---

## Development Server

| Feature | Status | Version | Notes |
|---------|--------|---------|-------|
| Static File Serving | ✅ | v0.1.0 | HTTP server works |
| Live Reload | ✅ | v0.1.0 | WebSocket-based reload |
| File Watching | ✅ | v0.1.0 | Chokidar-based watching |
| Custom Port/Host | ✅ | v0.1.0 | `-P`, `-H` options |
| HTTPS Support | 🔴 | v0.4.0 | Not yet available |

---

## Assets & Styling

| Feature | Status | Version | Notes |
|---------|--------|---------|-------|
| Static Assets | ✅ | v0.1.0 | Copies files to destination |
| SASS/SCSS | ✅ | v0.1.0 | Full SASS processing with sass package |
| CSS Output Styles | ✅ | v0.1.0 | compressed, expanded, etc. |
| Source Maps | 🔴 | v0.4.0 | For debugging |
| Asset Pipeline | 🟡 | v0.1.0 | Basic implementation |

---

## Plugins

| Feature | Status | Version | Notes |
|---------|--------|---------|-------|
| jekyll-seo-tag | ✅ | v0.1.0 | SEO meta tags, JSON-LD |
| jekyll-sitemap | ✅ | v0.1.0 | XML sitemap generation |
| jekyll-feed | ✅ | v0.1.0 | Atom feed generation |
| jekyll-jemoji | ✅ | v0.1.0 | Emoji support |
| jekyll-github-metadata | ✅ | v0.1.0 | GitHub repository metadata |
| jekyll-mentions | ✅ | v0.1.0 | @mention links |
| jekyll-redirect-from | ✅ | v0.1.0 | Redirect pages |
| jekyll-avatar | ✅ | v0.1.0 | GitHub avatar helper |
| npm Plugin System | ✅ | v0.1.0 | Load plugins from npm packages |
| Ruby Plugins | ⚫ | N/A | Not supported - requires TS rewrite |

> 📖 See [PLUGINS.md](./PLUGINS.md) for detailed plugin documentation and how to create custom plugins.

---

## Advanced Features

| Feature | Status | Version | Notes |
|---------|--------|---------|-------|
| Pagination | ✅ | v0.1.0 | Posts pagination with paginator object |
| Themes | ✅ | v0.1.0 | npm package-based themes |
| Categories | ✅ | v0.1.0 | Full support |
| Tags | ✅ | v0.1.0 | Full support |
| Localization (i18n) | 🔴 | v1.0.0+ | Multi-language support |
| Math Support | 🔴 | v1.0.0+ | KaTeX/MathJax |
| Search | 🔴 | Future | Site search functionality |

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
| `plugins` | ✅ | v0.1.0 | Plugin list support |
| `defaults` | ✅ | v0.1.0 | Front matter defaults |
| `paginate` | ✅ | v0.1.0 | Pagination settings |
| `paginate_path` | ✅ | v0.1.0 | Pagination URL pattern |
| `theme` | ✅ | v0.1.0 | Theme selection |
| `timezone` | ✅ | v0.1.0 | Date processing (validated) |
| `encoding` | ✅ | v0.1.0 | File encoding for source files |
| `markdown_ext` | ✅ | v0.1.0 | Custom markdown extensions |
| `liquid.strict_filters` | ✅ | v0.1.0 | Strict filter mode |
| `liquid.strict_variables` | ✅ | v0.1.0 | Strict variable mode |
| `sass.sass_dir` | ✅ | v0.1.0 | SASS directory |
| `sass.style` | ✅ | v0.1.0 | Output style |

---

## Liquid Filters

**60+ filters implemented** including all standard Jekyll filters:

| Category | Filters |
|----------|---------|
| Date | `date`, `date_to_xmlschema`, `date_to_rfc822`, `date_to_string`, `date_to_long_string` |
| URL | `relative_url`, `absolute_url` |
| Array | `where`, `where_exp`, `group_by`, `group_by_exp`, `sort`, `sort_natural`, `uniq`, `sample`, `push`, `pop`, `shift`, `unshift`, `find`, `find_exp`, `first`, `last`, `reverse`, `compact`, `concat`, `map`, `join`, `size`, `array_to_sentence_string` |
| String | `xml_escape`, `cgi_escape`, `uri_escape`, `slugify`, `smartify`, `markdownify`, `jsonify`, `inspect`, `normalize_whitespace`, `newline_to_br`, `strip_html`, `strip_newlines`, `truncate`, `truncatewords`, `upcase`, `downcase`, `capitalize`, `strip`, `lstrip`, `rstrip`, `prepend`, `append`, `remove`, `remove_first`, `replace`, `replace_first`, `split`, `escape_once`, `default`, `number_of_words` |
| Math | `abs`, `plus`, `minus`, `times`, `divided_by`, `modulo`, `round`, `ceil`, `floor`, `at_least`, `at_most` |
| Type | `to_integer` |
| Modern | `reading_time`, `toc`, `heading_anchors`, `external_links`, `auto_excerpt` |

> 📖 See [PARITY.md](./PARITY.md#liquid-filters-complete-list-) for complete filter documentation with descriptions.

---

## Liquid Tags

### ✅ Implemented

- `{% include %}` - Include partials with parameters
- `{% include_cached %}` - Include with caching
- `{% include_relative %}` - Include relative to current file
- `{% highlight %}` - Syntax highlighting (with Shiki support)
- `{% link %}` - Link to pages
- `{% post_url %}` - Link to posts
- `{% raw %}` - Disable Liquid processing (built into liquidjs)
- `{% comment %}` - Multi-line comments (built into liquidjs)

### 🔴 Planned

- Custom block tag support for plugins

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
| Documentation | ✅ | Working with collections and data files |
| E-commerce | 🟡 | Most features work |
| Multi-language | 🔴 | Needs i18n support |

### Theme Compatibility

| Theme | Status | Issues |
|-------|--------|--------|
| npm-based themes | ✅ | Full support |
| Custom themes | ✅ | Manual setup works |
| Minima equivalent | 🔴 | Official theme needed |
| Minimal Mistakes | 🔴 | Needs testing |
| Just the Docs | 🔴 | Needs testing |

---

## Migration from Jekyll.rb

### Zero-Change Sites ✅

Sites that work without modification:
- Basic blogs with posts and pages
- Sites using collections
- Sites with includes and layouts
- Sites using supported plugins (SEO, sitemap, feed, jemoji, mentions, etc.)
- Sites using data files (`_data` directory)
- Sites with front matter defaults
- Sites using pagination
- Sites using SASS/SCSS

### Minor Changes Required 🟡

Sites that need small adjustments:
- Sites using unsupported Liquid filters (most now supported)
- Sites with custom layouts (may need path adjustments)
- Sites using CSV/TSV data files (JSON/YAML supported)

### Major Changes Required 🔴

Sites that need significant work:
- Sites using Ruby plugins (need TS reimplementation)
- Sites using i18n/localization (not yet supported)
- Sites using math (KaTeX/MathJax not yet supported)

---

## Backwards-Compatible Improvements 🆕

These are optional enhancements over Ruby Jekyll that maintain full backwards compatibility:

| Feature | Status | Default | Notes |
|---------|--------|---------|-------|
| Shiki Syntax Highlighting | 🆕 | Disabled | VSCode-powered, 100+ languages |
| Sharp Image Optimization | 🆕 | Disabled | WebP/AVIF generation, 30-70% size reduction |
| Zod Config Validation | 🆕 | Enabled | Clear error messages for invalid config |
| npm-Based Themes | 🆕 | N/A | Standard JS package management |
| Enhanced Error Messages | 🆕 | Enabled | File/line references and suggestions |
| TypeScript Implementation | 🆕 | N/A | Type safety, better IDE support |

**Enable in `_config.yml`:**
```yaml
modern:
  syntaxHighlighting:
    enabled: true
    theme: github-light
  imageOptimization:
    enabled: true
    quality: 80
    generateWebP: true
```

> 📖 See [PARITY.md](./PARITY.md) and [MODERN-FEATURES.md](./MODERN-FEATURES.md) for details.

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

**Last Updated**: 2025-12-05  
**Version**: 0.1.0  
**Maintained by**: @benbalter
