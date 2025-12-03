# Jekyll.js Documentation

Welcome to the jekyll.js documentation! This directory contains comprehensive guides, plans, and references for understanding and contributing to jekyll.js.

---

## 📚 Documentation Overview

### For Users

| Document | Purpose | When to Read |
|----------|---------|--------------|
| [**Main README**](../README.md) | Getting started, installation | Start here! |
| [**PARITY.md**](./PARITY.md) | Parity with Ruby Jekyll & improvements | Understanding compatibility |
| [**FEATURES.md**](./FEATURES.md) | Feature status reference | Check if feature is supported |
| [**COMPARISON.md**](./COMPARISON.md) | jekyll.js vs Jekyll.rb | Deciding which to use |
| [**liquid-rendering.md**](./liquid-rendering.md) | Template engine guide | Using Liquid templates |
| [**theme-development.md**](./theme-development.md) | Theme creation guide | Creating or using themes |

### For Contributors

| Document | Purpose | When to Read |
|----------|---------|--------------|
| [**Jekyll Compatibility Plan**](./jekyll-compatibility-plan.md) | Feature specifications | Implementing new features |
| [**ROADMAP.md**](./ROADMAP.md) | Development timeline | Understanding priorities |
| [**QUICK-REFERENCE.md**](./QUICK-REFERENCE.md) | Developer guide | Contributing code |

---

## 📖 Document Details

### [Main README](../README.md)
**Length**: ~240 lines  
**Target Audience**: All users

The main entry point for jekyll.js. Contains:
- Installation instructions
- Quick start guide
- CLI command reference
- Basic usage examples
- Development setup

**Read this first** if you're new to jekyll.js.

---

### [PARITY.md](./PARITY.md)
**Length**: ~400 lines  
**Target Audience**: Users evaluating compatibility

Guide to parity with Ruby Jekyll and backwards-compatible improvements. Includes:
- Complete list of features with full parity
- Backwards-compatible modern enhancements
- Differences from Ruby Jekyll
- Migration guide from Jekyll.rb

**Use this** to understand what works identically and what's improved.

---

### [FEATURES.md](./FEATURES.md)
**Length**: ~500 lines  
**Target Audience**: Users evaluating features

Quick reference for feature implementation status. Includes:
- Feature status tables (✅ 🟡 🔴 ⚫)
- Core features, content types, templating
- Build features, dev server, assets
- Plugin support
- Configuration options
- Liquid filters and tags
- Performance benchmarks
- Migration guidance

**Use this** to quickly check if a feature is supported.

---

### [COMPARISON.md](./COMPARISON.md)
**Length**: ~720 lines  
**Target Audience**: Users choosing between Jekyll.rb and jekyll.js

Side-by-side comparison with Jekyll.rb. Contains:
- Feature-by-feature comparison tables
- Performance benchmarks
- Compatibility testing results
- Decision matrix (when to use which)
- Migration path guidance
- Ecosystem comparison

**Use this** when deciding between Jekyll.rb and jekyll.js.

---

### [Jekyll Compatibility Plan](./jekyll-compatibility-plan.md)
**Length**: ~1000 lines  
**Target Audience**: Contributors implementing features

Comprehensive feature specifications. Contains:
- Current implementation status
- Missing features (High/Medium/Low priority)
- Detailed implementation requirements
- Example configurations and usage
- Testing strategies
- 4-phase implementation roadmap
- Success metrics
- Risk management

**Use this** when implementing new features.

---

### [ROADMAP.md](./ROADMAP.md)
**Length**: ~500 lines  
**Target Audience**: Contributors and project stakeholders

Development timeline and release plan. Contains:
- Version milestones (v0.2.0 through v1.0.0)
- Feature priorities by version
- Success criteria for each phase
- Release schedule and process
- Contribution guidelines
- Progress tracking metrics
- Communication channels

**Use this** to understand project priorities and timeline.

---

### [QUICK-REFERENCE.md](./QUICK-REFERENCE.md)
**Length**: ~500 lines  
**Target Audience**: Contributors

Developer quick start guide. Contains:
- Priority features for v0.2.0 with hints
- Repository structure
- Testing strategies and commands
- Development commands
- Code style guidelines
- Debugging tips
- Pull request checklist
- Implementation templates

**Use this** when actively contributing code.

---

### [liquid-rendering.md](./liquid-rendering.md)
**Length**: ~310 lines  
**Target Audience**: Users writing templates

Liquid template engine documentation. Contains:
- Basic usage examples
- Configuration options
- Jekyll filters (date, URL, array, string)
- Jekyll tags (include, highlight, link)
- Custom filter/tag registration
- Document rendering
- Context variables
- Plugin development
- Compatibility notes
- Performance tips

**Use this** when writing Liquid templates.

---

## 🎯 Quick Navigation

### "I want to..."

**...get started with jekyll.js**
→ Read [Main README](../README.md)

**...understand compatibility with Ruby Jekyll**
→ Read [PARITY.md](./PARITY.md)

**...check if a feature is supported**
→ Check [FEATURES.md](./FEATURES.md)

**...compare with Jekyll.rb**
→ Read [COMPARISON.md](./COMPARISON.md)

**...contribute a feature**
→ Read [Compatibility Plan](./jekyll-compatibility-plan.md) + [QUICK-REFERENCE.md](./QUICK-REFERENCE.md)

**...understand the timeline**
→ Read [ROADMAP.md](./ROADMAP.md)

**...write Liquid templates**
→ Read [liquid-rendering.md](./liquid-rendering.md)

**...create or use a theme**
→ Read [theme-development.md](./theme-development.md)

**...report a bug**
→ [GitHub Issues](https://github.com/benbalter/jekyll.js/issues)

**...ask a question**
→ [GitHub Discussions](https://github.com/benbalter/jekyll.js/discussions)

---

## 📊 Feature Status Summary

As of **v0.1.0**:

- **✅ Implemented**: 27/46 features (59%)
- **🟡 Partial**: 5 features
- **🔴 Planned**: 19 features
- **⚫ Not Planned**: 0 features (Ruby-specific only)

**Next Version (v0.2.0)**: +5 high-priority features

See [FEATURES.md](./FEATURES.md) for complete breakdown.

---

## 🚀 Current Priorities (v0.2.0)

1. **Data Files** (`_data` directory) - Medium complexity
2. **Watch Mode** for builds - Medium complexity
3. **SASS/SCSS** Processing - Medium complexity
4. **Front Matter Defaults** - Medium complexity
5. **Additional Liquid Filters** - Low complexity

See [Compatibility Plan](./jekyll-compatibility-plan.md) for detailed specifications.

---

## 🤝 Contributing

We welcome contributions! Here's how:

1. **Read the docs** - Start with [QUICK-REFERENCE.md](./QUICK-REFERENCE.md)
2. **Pick a feature** - Check [ROADMAP.md](./ROADMAP.md) priorities
3. **Understand the spec** - Read [Compatibility Plan](./jekyll-compatibility-plan.md)
4. **Write code & tests** - Follow existing patterns
5. **Submit PR** - Include tests and documentation

Look for **"good first issue"** labels on GitHub!

---

## 📞 Getting Help

- **Questions**: [GitHub Discussions](https://github.com/benbalter/jekyll.js/discussions)
- **Bugs**: [GitHub Issues](https://github.com/benbalter/jekyll.js/issues)
- **Feature Requests**: [GitHub Issues](https://github.com/benbalter/jekyll.js/issues)

---

## 🔄 Document Updates

Documentation is actively maintained. Last major update: **2025-11-21**

If you find outdated information:
1. Open an issue
2. Submit a documentation PR
3. Update the relevant document

---

## 📝 Documentation Standards

When updating documentation:

### Style Guidelines
- Use Markdown formatting
- Include code examples
- Add links between documents
- Keep tables aligned
- Use emoji sparingly but consistently

### Structure
- Start with clear overview
- Use hierarchical headings
- Include table of contents for long docs
- End with resources/references

### Code Examples
- Provide complete, runnable examples
- Show both input and expected output
- Include comments for clarity
- Test examples before committing

### Maintenance
- Update "Last Updated" dates
- Keep version numbers current
- Verify links still work
- Remove outdated information

---

## 🏗️ Documentation Roadmap

### Planned Documentation

**Short Term (v0.2.0)**:
- [ ] Migration guides (Jekyll.rb → jekyll.js)
- [ ] Feature tutorials (data files, SASS, etc.)
- [ ] Troubleshooting guide
- [ ] Performance tuning guide

**Medium Term (v0.3.0)**:
- [x] Theme development guide
- [ ] Plugin development guide
- [ ] API reference documentation
- [ ] Video tutorials

**Long Term (v1.0.0)**:
- [ ] Complete cookbook (recipes for common tasks)
- [ ] Architecture documentation
- [ ] Deployment guides
- [ ] Case studies

---

## 📚 External Resources

### Jekyll Resources
- [Jekyll Official Documentation](https://jekyllrb.com/docs/)
- [Liquid Template Language](https://shopify.github.io/liquid/)
- [Jekyll GitHub Repository](https://github.com/jekyll/jekyll)

### TypeScript Resources
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/)
- [Node.js Documentation](https://nodejs.org/en/docs/)

### Community
- [Jekyll Community Forum](https://talk.jekyllrb.com/)
- [Jekyll Discord](https://discord.gg/jekyll)

---

## 📄 License

All documentation is licensed under MIT License, same as the project.

---

**Maintained by**: @benbalter  
**Contributors**: Welcome!  
**Last Updated**: 2025-12-03
