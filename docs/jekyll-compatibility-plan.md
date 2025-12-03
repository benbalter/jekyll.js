# Jekyll.rb Compatibility Plan

This document outlines the plan for achieving feature parity between jekyll.js (TypeScript implementation) and Jekyll.rb (Ruby implementation). The goal is to make jekyll.js a drop-in replacement for Jekyll.rb for most common use cases.

**Version**: 1.0  
**Target Jekyll Version**: 4.3.x  
**Last Updated**: 2025-12-03

> 📖 **See also**: [PARITY.md](./PARITY.md) for a user-friendly guide to parity and backwards-compatible improvements.

---

## Current Implementation Status

### ✅ Fully Implemented Features

These features are currently working and well-tested:

1. **CLI Commands**
   - `jekyll-ts new` - Create new Jekyll sites (with `--blank` option)
   - `jekyll-ts build` - Build static sites from source
   - `jekyll-ts serve` - Development server with basic functionality

2. **Configuration Parsing**
   - Full `_config.yml` YAML parsing
   - Site metadata (title, description, url, baseurl)
   - Build settings (source, destination, collections_dir)
   - Plugin configuration
   - Exclude/include patterns

3. **Content Processing**
   - **Pages**: Standalone markdown/HTML pages
   - **Posts**: Date-based blog posts in `_posts/` directory
   - **Collections**: Custom content types with configurable output
   - **Layouts**: Template inheritance with nested layouts
   - **Includes**: Reusable template partials
   - **Front Matter**: YAML front matter parsing

4. **Markdown Processing**
   - Remark-based markdown rendering
   - GitHub Flavored Markdown (GFM) support
   - HTML output generation

5. **Liquid Template Engine**
   - Full Liquid syntax support
   - Jekyll-specific filters (date, URL, array, string)
   - Jekyll-specific tags (highlight, link, post_url)
   - Layout rendering with template inheritance
   - Include tag with parameters

6. **URL Generation & Permalinks**
   - Configurable permalink patterns
   - Relative and absolute URL helpers
   - Post and page URL generation

7. **Built-in Plugins**
   - `jekyll-seo-tag` - SEO meta tags and JSON-LD
   - `jekyll-sitemap` - XML sitemap generation
   - `jekyll-feed` - Atom feed generation

8. **Development Server**
   - Static file serving
   - Live reload with WebSocket support
   - File watching (basic implementation)
   - Configurable port and host

9. **Draft & Future Post Filtering**
   - `--drafts` flag to include draft posts
   - `--future` flag to include future-dated posts

---

## 🔴 Missing Features (High Priority)

These are critical features for Jekyll compatibility that are currently missing:

### 1. Data Files (`_data` directory)

**Status**: Config exists, not implemented  
**Priority**: High  
**Complexity**: Medium

**Description**: Jekyll allows storing site data in `_data/` directory in YAML, JSON, CSV, or TSV formats. This data becomes accessible as `site.data` in templates.

**Implementation Requirements**:
- [ ] Read files from `_data/` directory (configurable via `data_dir`)
- [ ] Support YAML, JSON, CSV, and TSV formats
- [ ] Parse nested directory structures (e.g., `_data/authors/john.yml` → `site.data.authors.john`)
- [ ] Make data available as `site.data` in Liquid templates
- [ ] Watch for data file changes in development mode

**Example Use Case**:
```yaml
# _data/navigation.yml
- name: Home
  link: /
- name: About
  link: /about.html
```

```liquid
{% for item in site.data.navigation %}
  <a href="{{ item.link }}">{{ item.name }}</a>
{% endfor %}
```

**Testing Strategy**:
- Unit tests for parsing different formats
- Integration tests for `site.data` in templates
- Test nested directory structures
- Test live reload with data changes

---

### 2. Pagination

**Status**: Config exists, not implemented  
**Priority**: High  
**Complexity**: High

**Description**: Jekyll provides pagination for posts and collections, allowing long lists to be split across multiple pages.

**Implementation Requirements**:
- [ ] Implement `paginate` and `paginate_path` config options
- [ ] Create paginator object with properties:
  - `paginator.posts` - Posts on current page
  - `paginator.total_posts` - Total number of posts
  - `paginator.total_pages` - Total number of pages
  - `paginator.page` - Current page number
  - `paginator.per_page` - Posts per page
  - `paginator.previous_page` / `next_page` - Navigation
  - `paginator.previous_page_path` / `next_page_path` - URLs
- [ ] Generate multiple HTML files for paginated content
- [ ] Support custom pagination paths (e.g., `/blog/page:num/`)
- [ ] Support pagination for collections (jekyll-paginate-v2 feature)

**Example Configuration**:
```yaml
# _config.yml
paginate: 10
paginate_path: "/blog/page:num/"
```

**Example Usage**:
```liquid
{% for post in paginator.posts %}
  <h2>{{ post.title }}</h2>
{% endfor %}

{% if paginator.previous_page %}
  <a href="{{ paginator.previous_page_path }}">Previous</a>
{% endif %}
{% if paginator.next_page %}
  <a href="{{ paginator.next_page_path }}">Next</a>
{% endif %}
```

**Testing Strategy**:
- Test basic post pagination
- Test edge cases (first page, last page, single page)
- Test custom pagination paths
- Test collection pagination
- Integration tests with themes

---

### 3. Watch Mode for Builds

**Status**: TODO in code  
**Priority**: High  
**Complexity**: Medium

**Description**: The `--watch` flag should enable file watching during builds, automatically rebuilding when source files change.

**Implementation Requirements**:
- [ ] Implement file watching using `chokidar` (already a dependency)
- [ ] Watch for changes in:
  - Pages, posts, collections
  - Layouts and includes
  - Data files
  - Configuration (should restart/reload)
  - Assets
- [ ] Debounce rebuild triggers to avoid excessive builds
- [ ] Provide clear console feedback on rebuilds
- [ ] Handle errors gracefully during rebuilds
- [ ] Implement incremental builds (optional optimization)

**Testing Strategy**:
- Test file change detection
- Test rebuild triggers
- Test configuration reload
- Test error handling during watch

---

### 4. SASS/SCSS Processing

**Status**: Not implemented  
**Priority**: High  
**Complexity**: Medium

**Description**: Jekyll provides built-in SASS/SCSS support. Files in `_sass/` are partials, and `.scss` files with front matter are compiled to CSS.

**Implementation Requirements**:
- [ ] Add SASS/SCSS processor dependency (e.g., `sass` or `node-sass`)
- [ ] Process `.scss` and `.sass` files with YAML front matter
- [ ] Support `@import` from `_sass/` directory
- [ ] Support SASS configuration options:
  - `sass.sass_dir` - Directory for SASS partials (default: `_sass`)
  - `sass.style` - Output style (nested, expanded, compact, compressed)
  - `sass.source_comments` - Add source map comments
- [ ] Generate CSS files in destination
- [ ] Watch for SASS file changes in development

**Example Configuration**:
```yaml
# _config.yml
sass:
  sass_dir: _sass
  style: compressed
```

**Example File**:
```scss
---
# css/main.scss - Front matter required!
---
@import "variables";
@import "base";
```

**Testing Strategy**:
- Test SASS compilation
- Test import resolution
- Test different output styles
- Test source maps (if enabled)
- Test watch mode integration

---

### 5. Asset Pipeline & Static Files

**Status**: Partially implemented  
**Priority**: Medium  
**Complexity**: Low

**Description**: Improve handling of static assets (images, fonts, JavaScript files) that don't require processing.

**Implementation Requirements**:
- [ ] Copy static files to destination during build
- [ ] Respect `keep_files` configuration
- [ ] Handle binary files properly
- [ ] Support custom asset directories
- [ ] Optimize asset copying (only copy changed files)
- [ ] Provide `site.static_files` array in templates

**Testing Strategy**:
- Test static file copying
- Test `keep_files` configuration
- Test binary file handling
- Test incremental copying

---

### 6. Front Matter Defaults

**Status**: Config exists, not implemented  
**Priority**: Medium  
**Complexity**: Medium

**Description**: Allow setting default front matter values for files matching certain patterns.

**Implementation Requirements**:
- [ ] Parse `defaults` configuration
- [ ] Match files by path and type
- [ ] Apply defaults before file-specific front matter
- [ ] Support scope definitions:
  - `scope.path` - Path pattern
  - `scope.type` - Document type (pages, posts, collections)
- [ ] Merge defaults with file front matter (file wins)

**Example Configuration**:
```yaml
# _config.yml
defaults:
  - scope:
      path: ""
      type: "posts"
    values:
      layout: "post"
      author: "John Doe"
  - scope:
      path: "projects"
      type: "pages"
    values:
      layout: "project"
```

**Testing Strategy**:
- Test path matching
- Test type filtering
- Test front matter merging (precedence)
- Test multiple default scopes

---

### 7. Theme Support

**Status**: Not implemented  
**Priority**: Medium  
**Complexity**: High

**Description**: Support gem-based themes that package layouts, includes, and assets.

**Implementation Requirements**:
- [ ] Define theme package structure for npm packages
- [ ] Load theme from `node_modules` or local directory
- [ ] Support theme configuration via `theme` key in `_config.yml`
- [ ] Allow overriding theme files in site directory
- [ ] Merge theme configuration with site configuration
- [ ] Support `ignore_theme_config` option
- [ ] Document theme creation guidelines
- [ ] Create at least one default theme (e.g., "minima" equivalent)

**Example Configuration**:
```yaml
# _config.yml
theme: jekyll-theme-minimal
```

**Testing Strategy**:
- Test theme loading from npm packages
- Test file override mechanism
- Test configuration merging
- Integration test with sample theme

---

## 🟡 Missing Features (Medium Priority)

These features would improve compatibility but are not critical for most sites:

### 8. Additional Liquid Filters

**Current Status**: Basic filters implemented  
**Priority**: Medium  
**Complexity**: Low-Medium

**Missing Filters**:
- [ ] `sort` - Sort array
- [ ] `sort_natural` - Natural sort
- [ ] `uniq` - Remove duplicates
- [ ] `sample` - Random element(s)
- [ ] `push` / `pop` / `shift` / `unshift` - Array manipulation
- [ ] `find` / `find_exp` - Find element
- [ ] `normalize_whitespace` - Normalize whitespace
- [ ] `to_integer` / `to_float` - Type conversions
- [ ] `abs` - Absolute value
- [ ] Additional date filters

**Implementation**: Add filter implementations to Renderer class.

---

### 9. Additional Liquid Tags

**Current Status**: ✅ Basic and advanced tags implemented  
**Priority**: Medium  
**Complexity**: Medium

**Implemented Tags**:
- [x] `{% raw %}` - Disable Liquid processing (built into liquidjs)
- [x] `{% include_relative %}` - Include relative to current file
- [x] `{% comment %}` - Multi-line comments (built into liquidjs)

**Missing Tags**:
- [ ] Custom block tags support

**Implementation**: Register tags with liquidjs engine.

---

### 10. Incremental Builds

**Status**: Not implemented  
**Priority**: Medium  
**Complexity**: High

**Description**: Only rebuild files that have changed or depend on changed files.

**Implementation Requirements**:
- [ ] Track file modification times
- [ ] Build dependency graph
- [ ] Identify which files need rebuilding
- [ ] Implement partial site regeneration
- [ ] Handle layout/include dependencies
- [ ] Store build cache in `.jekyll-cache`

**Benefits**: Significantly faster rebuild times for large sites.

---

### 11. Advanced Configuration Options

**Status**: Partially implemented  
**Priority**: Low-Medium  
**Complexity**: Low

**Missing Options**:
- [ ] `timezone` - Timezone for date processing
- [ ] `encoding` - File encoding
- [ ] `markdown_ext` - Custom markdown extensions
- [ ] `strict_front_matter` - Error on invalid front matter
- [ ] `liquid.error_mode` - Liquid error handling modes
- [ ] `whitelist` - Safe mode plugin whitelist
- [ ] `lsi` - Latent Semantic Indexing (low priority)

**Implementation**: Add to Config interface and use in relevant modules.

---

### 12. Multiple Configuration Files

**Status**: Not implemented  
**Priority**: Low  
**Complexity**: Low

**Description**: Support loading multiple config files (e.g., `_config.yml`, `_config.dev.yml`).

**Example**:
```bash
jekyll-ts build --config _config.yml,_config.dev.yml
```

**Implementation**: Parse comma-separated config paths and merge sequentially.

---

### 13. Environment Variables in Configuration

**Status**: Not implemented  
**Priority**: Low  
**Complexity**: Low

**Description**: Support using environment variables in `_config.yml`.

**Example**:
```yaml
url: <%= ENV['SITE_URL'] || 'http://localhost:4000' %>
```

**Implementation**: Add ERB-style template processing for config files.

---

## 🟢 Lower Priority Features

These features are less commonly used or can be deferred to later versions:

### 14. Custom Collections Metadata
- Collection-specific permalink patterns
- Collection sort order options
- Collection output configuration

### 15. Advanced Markdown Options
- Custom markdown processors
- Markdown extensions configuration
- Math support (KaTeX, MathJax)

### 16. Localization & i18n
- Multi-language support
- Translation helpers
- Locale-specific permalinks

### 17. Performance Optimizations
- Parallel processing
- Caching improvements
- Memory optimization for large sites

### 18. Advanced Plugin System
- Custom generator plugins (TypeScript-based)
- Custom converter plugins
- Plugin hooks and events
- Plugin API documentation

---

## Implementation Strategy

### Phase 1: Core Compatibility (v0.2.0)
**Goal**: Essential features for basic Jekyll compatibility

1. Data Files (`_data`)
2. Watch Mode for Builds
3. SASS/SCSS Processing
4. Front Matter Defaults
5. Additional Liquid Filters

**Timeline**: 2-3 months  
**Testing**: Comprehensive unit and integration tests

---

### Phase 2: Advanced Features (v0.3.0)
**Goal**: Feature parity for common use cases

1. Pagination
2. Theme Support
3. Asset Pipeline Improvements
4. Incremental Builds
5. Additional Liquid Tags

**Timeline**: 2-3 months  
**Testing**: Real-world Jekyll site testing

---

### Phase 3: Optimization & Polish (v0.4.0)
**Goal**: Performance and developer experience

1. Advanced Configuration Options
2. Multiple Configuration Files
3. Performance Optimizations
4. Better Error Messages
5. Documentation Improvements

**Timeline**: 1-2 months  
**Testing**: Performance benchmarks, user feedback

---

### Phase 4: Ecosystem (v1.0.0)
**Goal**: Mature, production-ready tool

1. Custom Plugin System
2. Theme Ecosystem
3. Migration Tools
4. Complete Documentation
5. Community Building

**Timeline**: 3-4 months  
**Testing**: Production site migrations, community feedback

---

## Success Metrics

### Compatibility Metrics
- [ ] 90%+ of Jekyll sites build without modifications
- [ ] Output matches Jekyll.rb byte-for-byte (or close)
- [ ] All official Jekyll themes work without modification
- [ ] Top 10 Jekyll plugins have TypeScript equivalents

### Performance Metrics
- [ ] Build time within 2x of Jekyll.rb for typical sites
- [ ] Memory usage comparable to Jekyll.rb
- [ ] Watch mode rebuild time < 500ms for single file changes

### Quality Metrics
- [ ] 80%+ test coverage
- [ ] All features have integration tests
- [ ] Comprehensive documentation for all features
- [ ] Zero critical bugs in issue tracker

### Community Metrics
- [ ] Active GitHub repository with contributions
- [ ] Published npm package with regular updates
- [ ] User adoption and positive feedback
- [ ] Migration success stories

---

## Testing Strategy

### Unit Tests
- Every new feature has unit tests
- Test edge cases and error conditions
- Mock external dependencies

### Integration Tests
- End-to-end tests with fixture sites
- Test feature interactions
- Verify output correctness

### Compatibility Tests
- Test against real Jekyll sites
- Compare output with Jekyll.rb
- Automated regression testing

### Performance Tests
- Benchmark build times
- Memory profiling
- Watch mode performance

---

## Migration Guide Template

For each feature, provide:
1. Feature overview
2. Jekyll.rb equivalent
3. Configuration examples
4. Template usage examples
5. Common pitfalls
6. Troubleshooting guide

---

## Community Engagement

### Documentation
- Update README.md with feature status
- Create migration guides for each feature
- Provide example sites and templates
- Write blog posts about new features

### Communication
- Announce new features on GitHub
- Respond to user feedback promptly
- Maintain changelog with each release
- Create roadmap issues for transparency

### Contribution
- Label "good first issue" for newcomers
- Provide contribution guidelines
- Code review and feedback
- Recognize contributors

---

## Risks & Mitigation

### Risk: Ruby-specific Behavior
**Mitigation**: Document intentional differences, provide migration notes

### Risk: Performance Issues
**Mitigation**: Profile early and often, optimize hot paths, consider parallel processing

### Risk: Breaking Changes
**Mitigation**: Follow semantic versioning, deprecate before removing, maintain compatibility layer

### Risk: Maintenance Burden
**Mitigation**: Comprehensive tests, automated CI/CD, community contributions

### Risk: Dependency Updates
**Mitigation**: Regular dependency audits, security updates, version pinning where needed

---

## Conclusion

This plan provides a roadmap for achieving Jekyll.rb compatibility in jekyll.js. By implementing features in phases, we can deliver value incrementally while maintaining code quality and test coverage.

The focus is on:
1. **Core compatibility** first (data files, watch, SASS)
2. **Common features** second (pagination, themes)
3. **Advanced features** third (plugins, optimizations)
4. **Ecosystem building** as we mature

With this plan, jekyll.js can become a viable alternative to Jekyll.rb for the Node.js ecosystem, enabling developers to build static sites with familiar Jekyll workflows while leveraging the TypeScript/JavaScript toolchain.

---

## References

- [Jekyll Official Documentation](https://jekyllrb.com/docs/)
- [Jekyll Configuration Options](https://jekyllrb.com/docs/configuration/options/)
- [Liquid Template Language](https://shopify.github.io/liquid/)
- [Jekyll Pagination](https://jekyllrb.com/docs/pagination/)
- [Jekyll Themes](https://jekyllrb.com/docs/themes/)
- [Jekyll Data Files](https://jekyllrb.com/docs/datafiles/)

---

**Maintainer**: @benbalter  
**Contributors**: Welcome!  
**License**: MIT
