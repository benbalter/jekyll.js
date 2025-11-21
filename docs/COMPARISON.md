# Jekyll.js vs Jekyll.rb Feature Comparison

Side-by-side comparison of jekyll.js (TypeScript) and Jekyll.rb (Ruby) features.

**Version Comparison:**
- Jekyll.js: v0.1.0
- Jekyll.rb: v4.3.x

---

## Quick Summary

| Category | Supported | Planned | Not Planned |
|----------|-----------|---------|-------------|
| Core Features | 8/8 (100%) | 0 | 0 |
| Content Types | 6/7 (86%) | 1 | 0 |
| Templating | 4/7 (57%) | 3 | 0 |
| Build Features | 5/8 (63%) | 3 | 0 |
| Assets & Styling | 1/5 (20%) | 4 | 0 |
| Plugins | 3/4 (75%) | 1 | 0 |
| Advanced Features | 0/7 (0%) | 7 | 0 |

**Overall**: 27/46 features (59%) implemented, 19 planned, 0 blocked

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
| Data files (_data) | ✅ | 🔴 | 🔴 v0.2.0 planned |
| Static files | ✅ | 🟡 | 🟡 Basic support |

---

### Liquid Templating

| Feature | Jekyll.rb | jekyll.js | Status |
|---------|-----------|-----------|--------|
| Liquid syntax | ✅ | ✅ | ✅ Full support |
| Jekyll filters (basic) | ✅ | ✅ | ✅ Date, URL, array, string |
| Jekyll filters (advanced) | ✅ | 🟡 | 🟡 Some missing |
| Jekyll tags (basic) | ✅ | ✅ | ✅ include, highlight |
| Jekyll tags (advanced) | ✅ | 🔴 | 🔴 raw, include_relative |
| Layout inheritance | ✅ | ✅ | ✅ Nested layouts |
| Front matter defaults | ✅ | 🔴 | 🔴 v0.2.0 planned |

---

### Build Features

| Feature | Jekyll.rb | jekyll.js | Implementation |
|---------|-----------|-----------|----------------|
| Basic build | ✅ | ✅ | ✅ Complete |
| Custom source/destination | ✅ | ✅ | ✅ -s, -d flags |
| Watch mode | ✅ | 🔴 | 🔴 Planned v0.2.0 |
| Incremental builds | ✅ | 🔴 | 🔴 Planned v0.3.0 |
| Configuration files | ✅ | 🟡 | 🟡 Single file only |
| Multiple configs | ✅ | 🔴 | 🔴 Planned v0.4.0 |
| Environment variables | ✅ | 🔴 | 🔴 Planned v0.4.0 |
| Profiling | ✅ | 🔴 | 🔴 Future |

---

### Development Server

| Feature | Jekyll.rb | jekyll.js | Status |
|---------|-----------|-----------|--------|
| HTTP server | ✅ | ✅ | ✅ Express-based |
| LiveReload | ✅ | ✅ | ✅ WebSocket-based |
| File watching | ✅ | 🟡 | 🟡 Basic, needs polish |
| Custom port/host | ✅ | ✅ | ✅ -P, -H flags |
| HTTPS | ✅ | 🔴 | 🔴 Future |
| URL prefix | ✅ | ✅ | ✅ baseurl support |

---

### Assets & Styling

| Feature | Jekyll.rb | jekyll.js | Gap Analysis |
|---------|-----------|-----------|--------------|
| Static assets | ✅ | 🟡 | 🟡 Basic copying |
| SASS/SCSS | ✅ | 🔴 | 🔴 High priority v0.2.0 |
| CSS minification | ✅ | 🔴 | 🔴 Via SASS config |
| Source maps | ✅ | 🔴 | 🔴 Via SASS |
| Asset pipeline | ✅ | 🔴 | 🔴 Planned v0.3.0 |

---

### Plugins

| Plugin Type | Jekyll.rb | jekyll.js | Compatibility |
|-------------|-----------|-----------|---------------|
| jekyll-seo-tag | ✅ | ✅ | ✅ Reimplemented |
| jekyll-sitemap | ✅ | ✅ | ✅ Reimplemented |
| jekyll-feed | ✅ | ✅ | ✅ Reimplemented |
| jekyll-paginate | ✅ | 🔴 | 🔴 Planned v0.3.0 |
| Ruby plugins | ✅ | ⚫ | ⚫ Not supported |
| Custom TS plugins | N/A | 🔴 | 🔴 Planned v1.0.0 |

**Note**: Ruby plugins require TypeScript reimplementation. No direct compatibility possible.

---

### Advanced Features

| Feature | Jekyll.rb | jekyll.js | Priority |
|---------|-----------|-----------|----------|
| Pagination | ✅ | 🔴 | 🔴 High - v0.3.0 |
| Themes | ✅ | 🔴 | 🔴 High - v0.3.0 |
| Categories | ✅ | 🟡 | 🟡 Basic support |
| Tags | ✅ | 🟡 | 🟡 Basic support |
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
| data_dir | ✅ | 🔴 | 🔴 Config exists, not used |
| includes_dir | ✅ | ✅ | ✅ Full |
| **Content** |
| permalink | ✅ | ✅ | ✅ Full |
| paginate | ✅ | 🔴 | 🔴 Config exists, not used |
| timezone | ✅ | 🔴 | 🔴 Planned v0.4.0 |
| **Processing** |
| exclude, include | ✅ | ✅ | ✅ Full |
| keep_files | ✅ | 🟡 | 🟡 Partial |
| **Plugins** |
| plugins | ✅ | 🟡 | 🟡 List only, not loaded |
| **Defaults** |
| defaults | ✅ | 🔴 | 🔴 Planned v0.2.0 |
| **SASS** |
| sass.sass_dir | ✅ | 🔴 | 🔴 Planned v0.2.0 |
| sass.style | ✅ | 🔴 | 🔴 Planned v0.2.0 |
| **Liquid** |
| liquid.error_mode | ✅ | 🟡 | 🟡 Partial |
| liquid.strict_filters | ✅ | ✅ | ✅ Full |
| liquid.strict_variables | ✅ | ✅ | ✅ Full |

---

### Liquid Filters

#### Implemented in jekyll.js ✅

**Date Filters:**
- `date_to_xmlschema` - ISO 8601 format
- `date_to_rfc822` - RFC 822 format
- `date_to_string` - Short date
- `date_to_long_string` - Long date

**URL Filters:**
- `relative_url` - Prepend baseurl
- `absolute_url` - Prepend full URL

**Array Filters:**
- `where` - Filter by property
- `where_exp` - Filter by expression (basic)
- `group_by` - Group by property
- `group_by_exp` - Group by expression (basic)
- `array_to_sentence_string` - Array to sentence

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

#### Missing from jekyll.js 🔴

**Array Filters:**
- `sort`, `sort_natural` - Sorting
- `uniq` - Remove duplicates
- `sample` - Random element
- `push`, `pop`, `shift`, `unshift` - Array manipulation
- `find`, `find_exp` - Find element

**Math Filters:**
- `abs` - Absolute value
- `plus`, `minus`, `times`, `divided_by` - Arithmetic
- `modulo` - Modulo operation
- `round`, `ceil`, `floor` - Rounding

**Type Filters:**
- `to_integer`, `to_float` - Type conversion

**String Filters:**
- `normalize_whitespace` - Whitespace normalization

---

### Liquid Tags

#### Implemented ✅

- `{% include %}` - Include partials
- `{% highlight %}` - Syntax highlighting
- `{% link %}` - Link to pages (basic)
- `{% post_url %}` - Link to posts (basic)

#### Missing 🔴

- `{% raw %}` - Disable Liquid
- `{% include_relative %}` - Relative includes
- `{% comment %}` - Multi-line comments (may be built-in)

---

## Performance Comparison

### Build Times (Preliminary)

| Site Size | Jekyll.rb | jekyll.js | Ratio |
|-----------|-----------|-----------|-------|
| 10 pages | ~1.0s | ~1.2s | 1.2x slower |
| 100 pages | ~3.0s | ~4.5s | 1.5x slower |
| 1000 pages | ~30s | TBD | TBD |

**Note**: Performance numbers are preliminary and from limited testing.

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
- Sites using supported plugins (SEO, sitemap, feed)

**Example compatible sites:**
- Simple blog (posts, pages, layouts)
- Portfolio (collections, custom permalinks)
- Documentation (nested includes, front matter)

### Sites Needing Minor Changes 🟡

**Small adjustments required:**
- Sites with complex Liquid filters → Use workarounds
- Sites with custom layouts → Path adjustments
- Sites with specific permalinks → Mostly work

**Migration effort**: < 1 hour

### Sites Needing Major Changes 🔴

**Significant work required:**
- Sites using SASS/SCSS → Wait for v0.2.0 or convert CSS
- Sites using pagination → Wait for v0.3.0
- Sites using themes → Wait for v0.3.0 or extract theme
- Sites using data files → Wait for v0.2.0 or inline data
- Sites using Ruby plugins → Reimplement in TypeScript

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
- You need maximum compatibility
- You're using complex Ruby plugins
- You're using GitHub Pages (built-in support)
- You have existing Jekyll.rb sites
- You need mature theme ecosystem
- You need pagination (until v0.3.0)
- You need SASS/SCSS (until v0.2.0)

### When to Use jekyll.js

✅ Use jekyll.js if:
- You want to avoid Ruby dependency
- You're in a Node.js environment
- You want TypeScript integration
- You're starting a new simple site
- You value modern JavaScript tooling
- You want to contribute to an early project
- Your site doesn't need advanced features yet

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
   - Features: Posts, pages, layouts, includes

2. **Portfolio Site**
   - Status: ✅ Working
   - Features: Collections, custom permalinks

3. **Documentation Site**
   - Status: 🟡 Mostly working
   - Issues: Some advanced features missing

4. **E-commerce Site**
   - Status: 🔴 Not working
   - Issues: Needs pagination, data files, plugins

5. **Multi-language Site**
   - Status: 🔴 Not working
   - Issues: Needs i18n support

### Compatibility Score

| Aspect | Score | Grade |
|--------|-------|-------|
| Core Features | 8/8 | A+ |
| Content Processing | 6/7 | B+ |
| Templating | 4/7 | C+ |
| Build System | 5/8 | C+ |
| Dev Experience | 5/7 | B |
| **Overall** | **28/37** | **B-** |

---

## Roadmap Alignment

### Short Term (v0.2.0 - Q1 2025)

Focus on high-priority features:
- Data files
- Watch mode
- SASS/SCSS
- Front matter defaults
- Additional Liquid filters

**Target compatibility**: 70%

### Medium Term (v0.3.0 - Q2 2025)

Add advanced features:
- Pagination
- Theme support
- Incremental builds
- Asset pipeline

**Target compatibility**: 85%

### Long Term (v1.0.0 - Q4 2025)

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

**Last Updated**: 2025-11-21  
**Comparison Version**: Jekyll.rb 4.3.x vs jekyll.js 0.1.0  
**Maintained by**: @benbalter
