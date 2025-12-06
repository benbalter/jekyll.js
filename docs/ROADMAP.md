# Jekyll.js Roadmap

This roadmap outlines the development timeline for jekyll.js to achieve full compatibility with Jekyll 4.x.

> 📋 For detailed feature specifications, see [Jekyll Compatibility Plan](./jekyll-compatibility-plan.md)
> 
> ⏰ **Note**: Target dates are estimates and may be adjusted based on progress and community feedback. Last updated: 2025-12-05

---

## Current Version: 0.1.0

### ✅ Implemented Features

- CLI commands (new, build, serve)
- Configuration parsing (_config.yml)
- Liquid template engine with 60+ Jekyll filters and tags
- Pages, posts, and collections
- Layouts and includes
- Markdown processing (GFM)
- Permalinks and URL generation
- Built-in plugins (SEO, sitemap, feed, jemoji, github-metadata, mentions, redirect-from, avatar)
- Development server with live reload
- Draft and future post filtering
- **Data files support** (`_data` directory) - YAML and JSON
- **Watch mode for builds** (`--watch` flag)
- **Incremental builds** (`--incremental` flag) with build cache
- **SASS/SCSS processing** with configurable options
- **Front matter defaults** (path and type-based)
- **Theme support** (npm package-based themes)
- **Pagination** with paginator object in templates
- **Syntax highlighting** with Shiki
- **Image optimization** with Sharp

---

## Version 0.2.0 (Phase 1: Core Compatibility) ✅ COMPLETED

**Status**: Completed  
**Focus**: Essential features for basic Jekyll compatibility

### ✅ Completed Features

- [x] **Data Files Support** (`_data` directory)
  - YAML and JSON formats
  - Nested directory structures
  - `site.data` in templates
  - Watch for changes

- [x] **Watch Mode for Builds**
  - File change detection via chokidar
  - Automatic rebuilds
  - Configuration reload
  - Error handling

- [x] **SASS/SCSS Processing**
  - Compile `.scss` and `.sass` files
  - Import from `_sass/` directory
  - Configuration options (style, sass_dir)
  - Integration with watch mode

- [x] **Front Matter Defaults**
  - Path and type-based defaults
  - Scope matching
  - Front matter merging

- [x] **Additional Liquid Filters** (60+ filters implemented)
  - All array filters (sort, sort_natural, uniq, sample, push, pop, shift, unshift, find, find_exp, etc.)
  - Type conversion filters (to_integer)
  - String manipulation filters (normalize_whitespace, strip_html, etc.)
  - Math filters (abs, plus, minus, times, divided_by, modulo, round, ceil, floor, at_least, at_most)
  - Date formatting (date, date_to_xmlschema, date_to_rfc822, date_to_string, date_to_long_string)
  - Modern filters (reading_time, toc, heading_anchors, external_links, auto_excerpt)

### Success Criteria ✅
- ✅ All features have comprehensive tests (1163 tests passing)
- ✅ Documentation updated
- ✅ Benchmark tests available
- ✅ Real Jekyll sites build successfully

---

## Version 0.3.0 (Phase 2: Advanced Features) ✅ COMPLETED

**Status**: Completed  
**Focus**: Feature parity for common use cases

### ✅ Completed Features

- [x] **Pagination**
  - Basic post pagination
  - Custom pagination paths
  - Paginator object in templates with all properties
  - `paginate` and `paginate_path` config options

- [x] **Theme Support**
  - npm package-based themes
  - Theme loading and resolution from node_modules
  - File override mechanism (site files take precedence)
  - Layout and include directory merging

- [x] **Asset Pipeline Improvements**
  - Static file copying
  - SASS/SCSS processing
  - Binary file handling

- [x] **Incremental Builds**
  - Track file modifications via CacheManager
  - Build cache in `.jekyll-cache/`
  - Partial regeneration
  - Config change detection triggers full rebuild

- [x] **Additional Liquid Tags**
  - `{% raw %}` tag (built into liquidjs)
  - `{% include_relative %}` tag
  - `{% include_cached %}` tag
  - `{% highlight %}` tag with Shiki support
  - `{% link %}` and `{% post_url %}` tags

### Success Criteria ✅
- ✅ Pagination works with common blog layouts
- ✅ Theme support documented and working
- ✅ Incremental builds provide significant speedup
- ✅ Comprehensive test coverage

---

## Version 0.4.0 (Phase 3: Optimization & Polish)

**Target**: Q1 2025  
**Focus**: Performance and developer experience

### Features

- [x] **Advanced Configuration Options**
  - Timezone support (validation and default)
  - File encoding options (configurable source file encoding)
  - Custom markdown extensions (markdown_ext config option)
  - Multiple config files (comma-separated)
  - Environment variables in config (${VAR} and ${VAR:-default} syntax)

- [ ] **Performance Optimizations**
  - Parallel processing improvements
  - Memory optimization for large sites
  - Benchmark improvements

- [ ] **Developer Experience Improvements**
  - Better error messages with file/line references
  - Debug tools
  - Progress indicators

- [x] **Documentation Improvements**
  - Migration guides from Jekyll.rb
  - API documentation
  - More example sites

### Partially Completed ✅
- [x] **Verbose logging modes** (via Winston)
- [x] **Liquid error modes** (strict_variables, strict_filters)
- [x] **Enhanced error messages** (implemented)

### Success Criteria
- ✅ Build time within 2x of Jekyll.rb
- ✅ Comprehensive documentation
- ✅ Positive community feedback
- ✅ Many real Jekyll sites build successfully

---

## Version 1.0.0 (Phase 4: Ecosystem)

**Target**: Q2 2025  
**Focus**: Mature, production-ready tool

### Features

- [ ] **Custom Plugin System**
  - TypeScript plugin API
  - Generator plugins
  - Converter plugins
  - Plugin hooks and events
  - Plugin documentation

- [ ] **Theme Ecosystem**
  - Official themes (minima equivalent)
  - Theme creation guide (documented)
  - Theme gallery/directory
  - Theme customization docs

- [ ] **Migration Tools**
  - Jekyll.rb to jekyll.js converter
  - Configuration validator
  - Compatibility checker
  - Migration guide

- [ ] **Advanced Features**
  - Localization (i18n)
  - Custom collections metadata improvements
  - Math support (KaTeX/MathJax)
  - CSV/TSV data file support

### Partially Completed ✅
- [x] **Basic plugin system** (SEO, sitemap, feed, jemoji, mentions, redirect-from, avatar, github-metadata)
- [x] **Theme support** (npm package-based)
- [x] **Theme development guide** (documented)

### Success Criteria
- ✅ 90%+ Jekyll sites build without modification
- ✅ Output matches Jekyll.rb
- ✅ Active community with contributions
- ✅ Published themes and plugins
- ✅ Production deployments

---

## Beyond 1.0.0

### Future Possibilities

- **Enhanced Performance**
  - WebAssembly compilation
  - Distributed builds
  - Cloud build service

- **Modern Web Features**
  - Progressive Web App support
  - Service worker generation
  - Modern image formats (WebP, AVIF)
  - Automated optimization

- **Developer Tools**
  - VS Code extension
  - Browser DevTools integration
  - Visual site builder
  - Content management integration

- **Enterprise Features**
  - Multi-site management
  - Team collaboration tools
  - Deployment integrations
  - Analytics integration

---

## Release Schedule

We aim for quarterly releases with minor versions:

- **Monthly**: Patch releases (bug fixes, security)
- **Quarterly**: Minor releases (new features)
- **Annually**: Major releases (breaking changes)

### Release Process

1. Feature development in feature branches
2. Code review and testing
3. Beta release for community testing
4. Documentation updates
5. Official release with changelog
6. Announcement and migration guides

---

## How to Contribute

We welcome contributions! Here's how you can help:

### Pick a Feature
- Check the [project board](https://github.com/benbalter/jekyll.js/projects) for open issues
- Look for "good first issue" labels
- Comment on an issue to claim it

### Development Process
1. Fork the repository
2. Create a feature branch
3. Implement the feature with tests
4. Submit a pull request
5. Respond to code review feedback

### Areas Where We Need Help
- 🐛 **Bug fixes** - Always appreciated!
- 📝 **Documentation** - Improve existing docs or write new ones
- 🧪 **Testing** - Add test coverage, test real sites
- 🎨 **Themes** - Create compatible themes
- 🔌 **Plugins** - Reimplement Jekyll plugins
- 🌐 **Community** - Help answer questions, write tutorials

---

## Tracking Progress

### Metrics We Track

- **Feature Completion**: % of planned features implemented
- **Test Coverage**: % of code covered by tests
- **Compatibility**: # of real Jekyll sites that build successfully
- **Performance**: Build time vs Jekyll.rb
- **Community**: Contributors, issues, PRs, downloads

### Quarterly Reviews

Every quarter we:
1. Review progress against roadmap
2. Gather community feedback
3. Adjust priorities as needed
4. Celebrate achievements
5. Plan next quarter

---

## Communication Channels

- **GitHub Issues**: Bug reports, feature requests
- **GitHub Discussions**: Questions, ideas, community
- **Pull Requests**: Code contributions
- **Changelog**: Release notes and updates
- **README**: Quick start and status

---

## Versioning Strategy

We follow [Semantic Versioning](https://semver.org/):

- **Major (1.0.0)**: Breaking changes
- **Minor (0.1.0)**: New features, backward compatible
- **Patch (0.1.1)**: Bug fixes, backward compatible

### Pre-1.0 Versions
- May include breaking changes in minor versions
- Will provide migration guides
- Aim to minimize disruption

### Post-1.0 Versions
- Breaking changes only in major versions
- Deprecation warnings before removal
- Maintain compatibility layers where possible

---

## Dependencies & Maintenance

### Core Dependencies
- **TypeScript**: Latest stable version
- **Node.js**: LTS versions (22+ required for full features)
- **liquidjs**: Liquid template engine
- **remark**: Markdown processing
- **chokidar**: File watching
- **sass**: SASS/SCSS processing
- **shiki**: Syntax highlighting
- **sharp**: Image optimization
- **zod**: Configuration validation

### Dependency Strategy
- Regular security updates
- Quarterly dependency reviews
- Lock versions for stability
- Test before updating

---

## Risk Management

### Known Risks

1. **Ruby-specific behavior hard to replicate**
   - Mitigation: Document differences, provide alternatives

2. **Performance concerns with large sites**
   - Mitigation: Profile and optimize, incremental builds

3. **Breaking changes in dependencies**
   - Mitigation: Version locking, comprehensive tests

4. **Maintenance burden**
   - Mitigation: Community contributions, automated testing

### Contingency Plans

If timeline slips:
- Prioritize core features
- Delay nice-to-have features
- Seek additional contributors

If community adoption is slow:
- Improve documentation
- Create more examples
- Engage with Jekyll community
- Provide migration incentives

---

## Success Definition

Jekyll.js will be considered successful when:

1. ✅ **Compatibility**: 90%+ of Jekyll sites work without modification
2. ✅ **Performance**: Within 2x of Jekyll.rb build times
3. ✅ **Quality**: 80%+ test coverage, minimal bugs
4. ✅ **Community**: Active contributions, positive feedback
5. ✅ **Adoption**: Used in production by real projects

---

## Questions?

- Read the [Compatibility Plan](./jekyll-compatibility-plan.md) for detailed feature specs
- Check [existing issues](https://github.com/benbalter/jekyll.js/issues) for discussions
- Start a [new discussion](https://github.com/benbalter/jekyll.js/discussions) for questions
- Join us in making Jekyll.js the best static site generator for Node.js!

---

**Last Updated**: 2025-12-05  
**Maintained by**: @benbalter  
**License**: MIT
