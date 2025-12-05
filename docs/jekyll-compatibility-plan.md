# Jekyll.rb Compatibility Plan

This document outlines the plan for achieving feature parity between jekyll.js (TypeScript implementation) and Jekyll.rb (Ruby implementation). The goal is to make jekyll.js a drop-in replacement for Jekyll.rb for most common use cases.

**Version**: 1.0  
**Target Jekyll Version**: 4.3.x  
**Last Updated**: 2025-12-05

> 📖 **See also**: [PARITY.md](./PARITY.md) for a user-friendly guide to parity and backwards-compatible improvements.

---

## Current Implementation Status

### ✅ Fully Implemented Features

These features are currently working and well-tested:

1. **CLI Commands**
   - `jekyll-ts new` - Create new Jekyll sites (with `--blank` option)
   - `jekyll-ts build` - Build static sites from source (with `--watch` and `--incremental`)
   - `jekyll-ts serve` - Development server with live reload

2. **Configuration Parsing**
   - Full `_config.yml` YAML parsing
   - Site metadata (title, description, url, baseurl)
   - Build settings (source, destination, collections_dir)
   - Plugin configuration
   - Exclude/include patterns
   - Front matter defaults
   - Pagination settings
   - SASS configuration
   - Theme configuration

3. **Content Processing**
   - **Pages**: Standalone markdown/HTML pages
   - **Posts**: Date-based blog posts in `_posts/` directory
   - **Collections**: Custom content types with configurable output
   - **Layouts**: Template inheritance with nested layouts
   - **Includes**: Reusable template partials
   - **Front Matter**: YAML front matter parsing
   - **Data Files**: YAML and JSON files from `_data/` directory

4. **Markdown Processing**
   - Remark-based markdown rendering
   - GitHub Flavored Markdown (GFM) support
   - HTML output generation

5. **Liquid Template Engine**
   - Full Liquid syntax support
   - 60+ Jekyll-specific filters (date, URL, array, string, math, etc.)
   - Jekyll-specific tags (highlight, link, post_url, include_relative, include_cached)
   - Layout rendering with template inheritance
   - Include tag with parameters
   - Modern filters (reading_time, toc, heading_anchors, external_links)

6. **URL Generation & Permalinks**
   - Configurable permalink patterns
   - Relative and absolute URL helpers
   - Post and page URL generation
   - Pagination URL generation

7. **Built-in Plugins**
   - `jekyll-seo-tag` - SEO meta tags and JSON-LD
   - `jekyll-sitemap` - XML sitemap generation
   - `jekyll-feed` - Atom feed generation
   - `jekyll-jemoji` - Emoji support
   - `jekyll-github-metadata` - GitHub repository metadata
   - `jekyll-mentions` - @mention links
   - `jekyll-redirect-from` - Redirect pages
   - `jekyll-avatar` - GitHub avatar helper

8. **Development Server**
   - Static file serving
   - Live reload with WebSocket support
   - File watching with chokidar
   - Configurable port and host

9. **Build Features**
   - `--drafts` flag to include draft posts
   - `--future` flag to include future-dated posts
   - `--watch` flag for automatic rebuilds
   - `--incremental` flag for faster builds with cache
   - `--verbose` flag for detailed output

10. **SASS/SCSS Processing**
    - Compile `.scss` and `.sass` files
    - Import from `_sass/` directory
    - Configurable output styles (compressed, expanded, etc.)

11. **Theme Support**
    - npm package-based themes
    - Theme loading from node_modules
    - File override mechanism
    - Layout and include directory merging

12. **Pagination**
    - `paginate` and `paginate_path` config options
    - Full paginator object in templates
    - Custom pagination paths

13. **Incremental Builds**
    - CacheManager for tracking file changes
    - Build cache in `.jekyll-cache/`
    - Config change detection for full rebuilds

14. **Modern Enhancements**
    - Shiki-based syntax highlighting
    - Sharp-based image optimization
    - Zod-based configuration validation

---

## 🟡 Partially Implemented Features

### 1. Data Files

**Status**: YAML and JSON implemented  
**Priority**: Low  
**Remaining**: CSV and TSV format support

---

### 2. Multiple Configuration Files

**Status**: Single file only  
**Priority**: Medium  
**Remaining**: Support comma-separated config files

---

## 🔴 Missing Features (Future Versions)

### 1. Localization (i18n)

**Status**: Not implemented  
**Priority**: Low  
**Complexity**: High

Multi-language support for sites.

---

### 2. Math Support

**Status**: Not implemented  
**Priority**: Low  
**Complexity**: Medium

KaTeX or MathJax integration for mathematical notation.

---

### 3. Custom TypeScript Plugin API

**Status**: Not implemented  
**Priority**: Medium  
**Complexity**: High

Allow users to create custom plugins in TypeScript.

---

## Implementation Strategy

### Phase 1: Core Compatibility (v0.2.0) ✅ COMPLETED

**Status**: All features completed  
**Focus**: Essential features for basic Jekyll compatibility

1. ✅ Data Files (`_data`)
2. ✅ Watch Mode for Builds
3. ✅ SASS/SCSS Processing
4. ✅ Front Matter Defaults
5. ✅ Additional Liquid Filters (60+ implemented)

---

### Phase 2: Advanced Features (v0.3.0) ✅ COMPLETED

**Status**: All features completed  
**Focus**: Feature parity for common use cases

1. ✅ Pagination
2. ✅ Theme Support
3. ✅ Asset Pipeline Improvements
4. ✅ Incremental Builds
5. ✅ Additional Liquid Tags

---

### Phase 3: Optimization & Polish (v0.4.0)

**Target**: Q1 2025  
**Focus**: Performance and developer experience

1. Multiple Configuration Files
2. CSV/TSV Data File Support
3. Performance Optimizations
4. Better Error Messages
5. Documentation Improvements

---

### Phase 4: Ecosystem (v1.0.0)

**Target**: Q2 2025  
**Focus**: Mature, production-ready tool

1. Custom Plugin System
2. Theme Ecosystem
3. Migration Tools
4. i18n/Localization
5. Math Support

---

## Success Metrics

### Compatibility Metrics
- ✅ 88%+ of Jekyll features implemented
- ✅ Most Jekyll sites build without modifications
- ✅ 8 Jekyll plugins reimplemented
- [ ] All official Jekyll themes work without modification

### Performance Metrics
- ✅ Build time competitive with Jekyll.rb
- ✅ Watch mode rebuild time fast for typical sites
- [ ] Memory usage comparable to Jekyll.rb for large sites

### Quality Metrics
- ✅ 1163 tests passing
- ✅ All features have integration tests
- ✅ Comprehensive documentation
- [ ] Zero critical bugs in issue tracker

### Community Metrics
- ✅ Active GitHub repository
- ✅ Published npm package
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
- ✅ README.md with feature status
- ✅ Migration guides
- ✅ Example sites and templates
- [ ] Blog posts about features

### Communication
- ✅ GitHub Issues for bug reports
- ✅ GitHub Discussions for questions
- ✅ Changelog with each release
- [ ] Roadmap issues for transparency

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

Jekyll.js has achieved significant feature parity with Jekyll.rb:

**Completed Features (88%)**:
- ✅ CLI commands (new, build, serve)
- ✅ Configuration parsing
- ✅ Content processing (pages, posts, collections, layouts, includes)
- ✅ Data files (YAML, JSON)
- ✅ Liquid templating (60+ filters, all core tags)
- ✅ SASS/SCSS processing
- ✅ Front matter defaults
- ✅ Pagination
- ✅ Theme support
- ✅ Watch mode and incremental builds
- ✅ 8 built-in plugins
- ✅ Development server with live reload

**Remaining Features (12%)**:
- CSV/TSV data files
- Multiple config files
- i18n/Localization
- Math support
- Custom plugin API

Jekyll.js is now a viable drop-in replacement for Jekyll.rb for most common use cases.

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
