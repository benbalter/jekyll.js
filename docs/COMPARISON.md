# Jekyll.js vs Jekyll.rb Feature Comparison

Side-by-side comparison of jekyll.js (TypeScript) and Jekyll.rb (Ruby) features.

**Version Comparison:**
- Jekyll.js: v0.1.0
- Jekyll.rb: v4.3.x

> 📝 **Note**: This comparison reflects the current state as of the last update date below. Version numbers and feature status will evolve with each release.
>
> 📖 **See also**: [PARITY.md](./PARITY.md) for a detailed guide to features with full parity and backwards-compatible improvements.

---

## Quick Summary

| Category | Supported | Planned | Not Planned |
|----------|-----------|---------|-------------|
| Core Features | 8/8 (100%) | 0 | 0 |
| Content Types | 7/7 (100%) | 0 | 0 |
| Templating | 7/7 (100%) | 0 | 0 |
| Build Features | 7/8 (88%) | 1 | 0 |
| Assets & Styling | 4/5 (80%) | 1 | 0 |
| Plugins | 8/9 (89%) | 1 | 0 |
| Advanced Features | 4/7 (57%) | 3 | 0 |

**Overall**: 45/51 features (88%) implemented, 6 planned, 0 blocked

---

## Detailed Feature Comparison

### Core Build System

| Feature | Jekyll.rb | jekyll.js | Notes |
|---------|-----------|-----------|-------|
| CLI interface | ✅ | ✅ | Commands: new, build, serve |
| YAML configuration | ✅ | ✅ | Full _config.yml support |
| Front matter parsing | ✅ | ✅ | YAML front matter |
| Markdown to HTML | ✅ | ✅ | GFM support via Remark |
| Static site generation | ✅ | ✅ | Complete workflow |
| File filtering (exclude/include) | ✅ | ✅ | Pattern matching |
| Verbose output | ✅ | ✅ | --verbose flag |
| Draft handling | ✅ | ✅ | --drafts flag |

---

### Content Types

| Feature | Jekyll.rb | jekyll.js | Status |
|---------|-----------|-----------|--------|
| Pages | ✅ | ✅ | ✅ Working |
| Posts | ✅ | ✅ | ✅ Working |
| Collections | ✅ | ✅ | ✅ Working |
| Layouts | ✅ | ✅ | ✅ Working |
| Includes | ✅ | ✅ | ✅ Working |
| Data files (_data) | ✅ | ✅ | ✅ Working (YAML, JSON) |
| Static files | ✅ | ✅ | ✅ Working |

---

### Liquid Templating

| Feature | Jekyll.rb | jekyll.js | Status |
|---------|-----------|-----------|--------|
| Liquid syntax | ✅ | ✅ | ✅ Full support |
| Jekyll filters (basic) | ✅ | ✅ | ✅ Date, URL, array, string |
| Jekyll filters (advanced) | ✅ | ✅ | ✅ 60+ filters implemented |
| Jekyll tags (basic) | ✅ | ✅ | ✅ include, highlight, raw |
| Jekyll tags (advanced) | ✅ | ✅ | ✅ include_relative, include_cached |
| Layout inheritance | ✅ | ✅ | ✅ Nested layouts |
| Front matter defaults | ✅ | ✅ | ✅ Working |

---

### Build Features

| Feature | Jekyll.rb | jekyll.js | Implementation |
|---------|-----------|-----------|----------------|
| Basic build | ✅ | ✅ | ✅ Complete |
| Custom source/destination | ✅ | ✅ | ✅ -s, -d flags |
| Watch mode | ✅ | ✅ | ✅ --watch flag |
| Incremental builds | ✅ | ✅ | ✅ --incremental flag with cache |
| Configuration files | ✅ | ✅ | ✅ --config option |
| Multiple configs | ✅ | 🔴 | 🔴 Planned v0.4.0 |
| Environment variables | ✅ | 🔴 | 🔴 Planned v0.4.0 |
| Profiling | ✅ | 🔴 | 🔴 Future |

---

### Development Server

| Feature | Jekyll.rb | jekyll.js | Status |
|---------|-----------|-----------|--------|
| HTTP server | ✅ | ✅ | ✅ Built-in |
| LiveReload | ✅ | ✅ | ✅ WebSocket-based |
| File watching | ✅ | ✅ | ✅ Chokidar-based |
| Custom port/host | ✅ | ✅ | ✅ -P, -H flags |
| HTTPS | ✅ | 🔴 | 🔴 Future |
| URL prefix | ✅ | ✅ | ✅ baseurl support |

---

### Assets & Styling

| Feature | Jekyll.rb | jekyll.js | Gap Analysis |
|---------|-----------|-----------|--------------|
| Static assets | ✅ | ✅ | ✅ Full copying |
| SASS/SCSS | ✅ | ✅ | ✅ sass package |
| CSS output styles | ✅ | ✅ | ✅ compressed, expanded |
| Source maps | ✅ | 🔴 | 🔴 Planned |
| Asset pipeline | ✅ | 🟡 | 🟡 Basic implementation |

---

### Plugins

| Plugin Type | Jekyll.rb | jekyll.js | Compatibility |
|-------------|-----------|-----------|---------------|
| jekyll-seo-tag | ✅ | ✅ | ✅ Reimplemented |
| jekyll-sitemap | ✅ | ✅ | ✅ Reimplemented |
| jekyll-feed | ✅ | ✅ | ✅ Reimplemented |
| jekyll-jemoji | ✅ | ✅ | ✅ Reimplemented |
| jekyll-github-metadata | ✅ | ✅ | ✅ Reimplemented |
| jekyll-mentions | ✅ | ✅ | ✅ Reimplemented |
| jekyll-redirect-from | ✅ | ✅ | ✅ Reimplemented |
| jekyll-avatar | ✅ | ✅ | ✅ Reimplemented |
| jekyll-paginate | ✅ | ✅ | ✅ Built-in pagination |
| Ruby plugins | ✅ | ⚫ | ⚫ Not supported |
| Custom TS plugins | N/A | 🔴 | 🔴 Planned v1.0.0 |

**Note**: Ruby plugins require TypeScript reimplementation. No direct compatibility possible.

---

### Advanced Features

| Feature | Jekyll.rb | jekyll.js | Priority |
|---------|-----------|-----------|----------|
| Pagination | ✅ | ✅ | ✅ Implemented |
| Themes | ✅ | ✅ | ✅ npm-based |
| Categories | ✅ | ✅ | ✅ Full support |
| Tags | ✅ | ✅ | ✅ Full support |
| i18n/Localization | ✅ | 🔴 | 🔴 Low - v1.0.0+ |
| Math (LaTeX) | ✅ via plugin | 🔴 | 🔴 Low - v1.0.0+ |
| Search | ✅ via plugin | 🔴 | 🔴 Future |

---

### Configuration Options

| Option | Jekyll.rb | jekyll.js | Support Level |
|--------|-----------|-----------|---------------|
| **Site Settings** |
| title, description, url | ✅ | ✅ | ✅ Full |
| baseurl | ✅ | ✅ | ✅ Full |
| **Build Settings** |
| source, destination | ✅ | ✅ | ✅ Full |
| collections_dir | ✅ | ✅ | ✅ Full |
| layouts_dir | ✅ | ✅ | ✅ Full |
| data_dir | ✅ | ✅ | ✅ Full |
| includes_dir | ✅ | ✅ | ✅ Full |
| **Content** |
| permalink | ✅ | ✅ | ✅ Full |
| paginate | ✅ | ✅ | ✅ Full |
| paginate_path | ✅ | ✅ | ✅ Full |
| timezone | ✅ | 🔴 | 🔴 Planned v0.4.0 |
| **Processing** |
| exclude, include | ✅ | ✅ | ✅ Full |
| keep_files | ✅ | ✅ | ✅ Full |
| **Plugins** |
| plugins | ✅ | ✅ | ✅ Full |
| **Defaults** |
| defaults | ✅ | ✅ | ✅ Full |
| **Theme** |
| theme | ✅ | ✅ | ✅ Full (npm-based) |
| **SASS** |
| sass.sass_dir | ✅ | ✅ | ✅ Full |
| sass.style | ✅ | ✅ | ✅ Full |
| **Liquid** |
| liquid.error_mode | ✅ | 🟡 | 🟡 Partial |
| liquid.strict_filters | ✅ | ✅ | ✅ Full |
| liquid.strict_variables | ✅ | ✅ | ✅ Full |

---

### Liquid Filters & Tags

**60+ filters implemented** covering all standard Jekyll filter categories:

| Category | Status | Count |
|----------|--------|-------|
| Date Filters | ✅ | 5 |
| URL Filters | ✅ | 2 |
| Array Filters | ✅ | 23 |
| String Filters | ✅ | 30 |
| Math Filters | ✅ | 11 |
| Type Filters | ✅ | 1 |
| Modern Filters | 🆕 | 5 |

**Liquid Tags:** `include`, `include_cached`, `include_relative`, `highlight`, `link`, `post_url`, `raw`, `comment`

> 📖 See [PARITY.md](./PARITY.md#liquid-filters-complete-list-) for the complete filter list with descriptions.

---

## Performance Comparison

### Build Times (Preliminary)

| Site Size | Jekyll.rb | jekyll.js | Ratio |
|-----------|-----------|-----------|-------|
| 10 pages | ~1.0s | ~1.2s | 1.2x slower |
| 100 pages | ~3.0s | ~4.5s | 1.5x slower |
| 1000 pages | ~30s | TBD | TBD |

**Note**: Performance numbers are preliminary and from limited testing on a standard development machine. Test methodology: Basic Jekyll site with posts, pages, and default layout. Results may vary based on hardware, site complexity, and system load. TBD entries indicate insufficient data for reliable comparison.

### Performance Goals

- **v0.2.0**: Maintain <2x Jekyll.rb speed
- **v0.3.0**: Achieve <2x with incremental builds
- **v1.0.0**: Within 2x for all typical sites

### Performance Factors

**Advantages:**
- Node.js single-threaded model can be faster for I/O
- TypeScript compilation overhead paid upfront
- Modern JavaScript engines (V8) are highly optimized

**Challenges:**
- Ruby has mature optimization for Jekyll workloads
- Need to implement incremental builds
- Large sites may hit memory limits

---

## Migration Path

### Sites that Work Today (v0.1.0) ✅

**Zero modifications needed:**
- Basic blogs with posts and pages
- Portfolio sites with collections
- Documentation sites with layouts/includes
- Sites using supported plugins (SEO, sitemap, feed, jemoji, mentions, redirect-from, avatar, github-metadata)
- Sites using data files (`_data` directory with YAML/JSON)
- Sites using front matter defaults
- Sites using pagination
- Sites using SASS/SCSS
- Sites using themes (npm-based)

**Example compatible sites:**
- Simple blog (posts, pages, layouts)
- Portfolio (collections, custom permalinks)
- Documentation (nested includes, front matter, data files)

### Sites Needing Minor Changes 🟡

**Small adjustments required:**
- Sites using CSV/TSV data files → Use YAML/JSON
- Sites using gem-based themes → Use npm-based themes
- Sites with specific unsupported Liquid filters → Check alternatives

**Migration effort**: < 1 hour

### Sites Needing Major Changes 🔴

**Significant work required:**
- Sites using Ruby plugins → Reimplement in TypeScript
- Sites using i18n/localization → Wait for v1.0.0+
- Sites using math (KaTeX/MathJax) → Wait for v1.0.0+

**Migration effort**: Varies (wait for features or significant rewrite)

---

## Ecosystem Comparison

### Jekyll.rb Ecosystem

**Strengths:**
- Mature, 10+ years of development
- Large plugin ecosystem (Ruby gems)
- GitHub Pages integration
- Extensive themes available
- Strong community and documentation

**Weaknesses:**
- Ruby dependency (installation complexity)
- Slower build times for large sites
- Limited to Ruby ecosystem

### jekyll.js Ecosystem

**Strengths:**
- No Ruby dependency
- npm ecosystem integration
- TypeScript type safety
- Modern JavaScript toolchain
- Active development

**Weaknesses:**
- Young project (early stage)
- Limited plugin ecosystem
- No theme marketplace yet
- Smaller community

---

## Decision Matrix

### When to Use Jekyll.rb

✅ Use Jekyll.rb if:
- You need maximum compatibility with Ruby plugins
- You're using GitHub Pages (built-in support)
- You need i18n/localization support
- You have complex Ruby plugin dependencies

### When to Use jekyll.js

✅ Use jekyll.js if:
- You want to avoid Ruby dependency
- You're in a Node.js environment
- You want TypeScript integration
- You're starting a new site
- You value modern JavaScript tooling
- You want built-in features like syntax highlighting with Shiki
- Your site uses common plugins (SEO, sitemap, feed, jemoji, etc.)
- You need npm-based theme management

### Hybrid Approach

🔄 Use both:
- Develop with jekyll.js
- Deploy with Jekyll.rb (if needed)
- Test compatibility regularly
- Report issues to help improve jekyll.js

---

## Compatibility Testing

### Test Sites

We maintain compatibility tests with:

1. **Basic Blog**
   - Status: ✅ Working
   - Features: Posts, pages, layouts, includes, data files

2. **Portfolio Site**
   - Status: ✅ Working
   - Features: Collections, custom permalinks, SASS

3. **Documentation Site**
   - Status: ✅ Working
   - Features: Collections, data files, nested layouts

4. **E-commerce Site**
   - Status: 🟡 Mostly working
   - Issues: Complex Ruby plugins need reimplementation

5. **Multi-language Site**
   - Status: 🔴 Not working
   - Issues: Needs i18n support

### Compatibility Score

| Aspect | Score | Grade |
|--------|-------|-------|
| Core Features | 8/8 | A+ |
| Content Processing | 7/7 | A+ |
| Templating | 7/7 | A+ |
| Build System | 7/8 | A |
| Dev Experience | 6/7 | A- |
| **Overall** | **35/37** | **A** |

---

## Roadmap Alignment

### Short Term (v0.2.0 - Completed ✅)

Completed high-priority features:
- ✅ Data files
- ✅ Watch mode
- ✅ SASS/SCSS
- ✅ Front matter defaults
- ✅ Additional Liquid filters

**Target compatibility**: 88% ✅

### Medium Term (v0.3.0 - Completed ✅)

Added advanced features:
- ✅ Pagination
- ✅ Theme support
- ✅ Incremental builds
- ✅ Asset pipeline

**Target compatibility**: 88% ✅

### Long Term (v1.0.0 - In Progress)

Achieve production-ready status:
- Custom plugin system
- Performance optimization
- Full feature parity
- Mature ecosystem

**Target compatibility**: 90%+

---

## Contributing to Compatibility

### How You Can Help

1. **Test Your Site**
   - Try building with jekyll.js
   - Report issues
   - Document workarounds

2. **Report Missing Features**
   - Check existing issues
   - Provide use cases
   - Share site examples

3. **Contribute Code**
   - Pick a feature from roadmap
   - Submit pull request
   - Write tests and docs

4. **Write Documentation**
   - Migration guides
   - Feature tutorials
   - Comparison tables

5. **Build Themes**
   - Create compatible themes
   - Port existing themes
   - Share with community

---

## Resources

- [Jekyll.rb Documentation](https://jekyllrb.com/docs/)
- [jekyll.js Compatibility Plan](./jekyll-compatibility-plan.md)
- [jekyll.js Roadmap](./ROADMAP.md)
- [jekyll.js Features](./FEATURES.md)
- [Quick Reference](./QUICK-REFERENCE.md)

---

**Last Updated**: 2025-12-04  
**Comparison Version**: Jekyll.rb 4.3.x vs jekyll.js 0.1.0  
**Maintained by**: @benbalter
