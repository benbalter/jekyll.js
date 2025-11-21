# Jekyll.js Roadmap

This roadmap outlines the development timeline for jekyll.js to achieve full compatibility with Jekyll 4.x.

> 📋 For detailed feature specifications, see [Jekyll Compatibility Plan](./jekyll-compatibility-plan.md)
> 
> ⏰ **Note**: Target dates are estimates and may be adjusted based on progress and community feedback. Last updated: 2025-11-21

---

## Current Version: 0.1.0

### ✅ Implemented Features

- CLI commands (new, build, serve)
- Configuration parsing (_config.yml)
- Liquid template engine with Jekyll filters and tags
- Pages, posts, and collections
- Layouts and includes
- Markdown processing (GFM)
- Permalinks and URL generation
- Built-in plugins (SEO, sitemap, feed)
- Development server with live reload
- Draft and future post filtering

---

## Version 0.2.0 (Phase 1: Core Compatibility)

**Target**: Q1 2025  
**Focus**: Essential features for basic Jekyll compatibility

### High Priority Features

- [ ] **Data Files Support** (`_data` directory)
  - YAML, JSON, CSV, TSV formats
  - Nested directory structures
  - `site.data` in templates
  - Watch for changes

- [ ] **Watch Mode for Builds**
  - File change detection
  - Automatic rebuilds
  - Configuration reload
  - Error handling

- [ ] **SASS/SCSS Processing**
  - Compile `.scss` and `.sass` files
  - Import from `_sass/` directory
  - Configuration options (style, source_comments)
  - Integration with watch mode

- [ ] **Front Matter Defaults**
  - Path and type-based defaults
  - Scope matching
  - Front matter merging

- [ ] **Additional Liquid Filters**
  - Array filters (sort, uniq, sample)
  - Type conversion filters
  - String manipulation filters
  - Date formatting improvements

### Success Criteria
- ✅ All features have comprehensive tests
- ✅ Documentation updated
- ✅ Benchmark tests show reasonable performance
- ✅ At least 3 real Jekyll sites build successfully

---

## Version 0.3.0 (Phase 2: Advanced Features)

**Target**: Q2 2025  
**Focus**: Feature parity for common use cases

### Major Features

- [ ] **Pagination**
  - Basic post pagination
  - Custom pagination paths
  - Paginator object in templates
  - Collection pagination

- [ ] **Theme Support**
  - npm package-based themes
  - Theme loading and resolution
  - File override mechanism
  - Configuration merging
  - Default theme (minima equivalent)

- [ ] **Asset Pipeline Improvements**
  - Static file copying optimization
  - `site.static_files` array
  - `keep_files` support
  - Binary file handling

- [ ] **Incremental Builds**
  - Track file modifications
  - Dependency graph
  - Partial regeneration
  - Build cache

- [x] **Additional Liquid Tags**
  - `{% raw %}` tag (built into liquidjs)
  - `{% include_relative %}` tag
  - Custom block tags support (future)

### Success Criteria
- ✅ Pagination works with common blog layouts
- ✅ At least one theme available and documented
- ✅ Incremental builds provide 3x+ speedup
- ✅ 10+ real Jekyll sites build successfully

---

## Version 0.4.0 (Phase 3: Optimization & Polish)

**Target**: Q3 2025  
**Focus**: Performance and developer experience

### Features

- [ ] **Advanced Configuration Options**
  - Timezone support
  - File encoding options
  - Custom markdown extensions
  - Liquid error modes
  - Multiple config files

- [ ] **Performance Optimizations**
  - Parallel processing
  - Caching improvements
  - Memory optimization
  - Benchmark improvements

- [ ] **Developer Experience**
  - Better error messages
  - Verbose logging modes
  - Debug tools
  - Progress indicators

- [ ] **Documentation Improvements**
  - Migration guides
  - API documentation
  - Example sites
  - Video tutorials

### Success Criteria
- ✅ Build time within 2x of Jekyll.rb
- ✅ Comprehensive documentation
- ✅ Positive community feedback
- ✅ 25+ real Jekyll sites build successfully

---

## Version 1.0.0 (Phase 4: Ecosystem)

**Target**: Q4 2025  
**Focus**: Mature, production-ready tool

### Features

- [ ] **Custom Plugin System**
  - TypeScript plugin API
  - Generator plugins
  - Converter plugins
  - Plugin hooks and events
  - Plugin documentation

- [ ] **Theme Ecosystem**
  - 3-5 official themes
  - Theme creation guide
  - Theme gallery/directory
  - Theme customization docs

- [ ] **Migration Tools**
  - Jekyll.rb to jekyll.js converter
  - Configuration validator
  - Compatibility checker
  - Migration guide

- [ ] **Advanced Features**
  - Localization (i18n)
  - Custom collections metadata
  - Math support (KaTeX/MathJax)
  - Advanced caching

- [ ] **Community & Ecosystem**
  - Active community forum
  - Contribution guidelines
  - Code of conduct
  - Regular releases

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
- **Node.js**: LTS versions (18+)
- **liquidjs**: Liquid template engine
- **remark**: Markdown processing
- **chokidar**: File watching

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

**Last Updated**: 2025-11-21  
**Maintained by**: @benbalter  
**License**: MIT
