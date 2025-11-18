# Jekyll TypeScript Reimplementation - Copilot Instructions

## Project Overview

This is a TypeScript reimplementation of Jekyll, the static site generator. The goal is to create a Node.js-based tool that is fully compatible with existing Jekyll sites, allowing users to migrate without modifying their site structure or configuration.

## Core Principles

### Compatibility First
- **Primary Goal**: Generate identical output to Ruby-based Jekyll
- Users should NOT need to change their `_config.yml`, `Gemfile`, or site structure
- Prioritize reliability and compatibility over performance optimizations
- Support typical Jekyll site structures: pages, posts, collections, layouts, and includes

### Technology Stack
- **Language**: TypeScript (strict mode)
- **Runtime**: Node.js
- **Template Engine**: Liquid (must support existing Jekyll tags and filters)
- **Configuration**: YAML parsing compatible with Jekyll's `_config.yml`

## Key Requirements

### Functional Requirements

**FR-001: Site Structure Support**
- Support pages, posts, collections, layouts, and includes
- Respect Jekyll's directory conventions (`_posts/`, `_layouts/`, `_includes/`, etc.)

**FR-002: Configuration Parsing**
- Parse `_config.yml` identically to Jekyll
- Validate and apply all key settings
- Support collections, permalinks, plugins, and build options

**FR-003: Liquid Template Rendering**
- Full Liquid syntax support including Jekyll-specific tags and filters
- Handle includes, layouts, and template inheritance
- Support front matter variables in templates

**FR-004: CLI Commands**
- `jekyll-ts build`: Generate static site
- `jekyll-ts serve`: Development server with live reload

**FR-005: Development Server**
- Serve static files
- Watch for file changes
- Live-reload browser on changes

**FR-006: Plugin Support (v1)**
- `jekyll-seo-tag`
- `jekyll-sitemap`
- `jekyll-feed`
- Note: Ruby plugins are NOT supported; reimplementation in TypeScript required

**FR-007: TypeScript Implementation**
- Fully implemented in TypeScript
- Use Node.js as runtime environment

**FR-008: Zero-Configuration Migration**
- Users must NOT require changes to site directory or Gemfile
- Drop-in replacement for Jekyll

### Non-Functional Requirements

**NFR-001: Reliability Over Performance**
- Prioritize correctness and compatibility
- Performance optimizations are secondary

**NFR-002: Error Messages**
- Clear, user-friendly error messages
- Include file and line number references when applicable
- Help users understand what went wrong and how to fix it

**NFR-003: Validation**
- Validate `_config.yml` for common issues
- Validate front matter syntax
- Warn users about potential problems before build failures

**NFR-004: Leverage Existing Libraries**
- Use battle-tested open-source libraries where practical
- Don't reinvent the wheel for solved problems
- Examples: use existing YAML parsers, Liquid implementations, markdown processors

**NFR-005: Structured Logging**
- Implement structured logging throughout
- Support verbose/debug mode for diagnostics
- Make troubleshooting easier for users

## Key Entities and Data Models

### Site Configuration
Represents `_config.yml` and site-scoped settings:
- Collections definitions
- Permalink patterns
- Plugin configurations
- Build options (destination, source, etc.)
- Global variables accessible to templates

### Document
Represents individual site artifacts:
- **Front Matter**: YAML metadata at the top of files
- **Content**: Raw markdown or HTML content
- **Rendered Output**: Final HTML after Liquid processing
- **Metadata**: URL, date, categories, tags, etc.
- Types: Pages, Posts, Collection Documents

### DevServer Instance
Manages the development server:
- Static file serving
- File change watchers
- Live reload functionality
- WebSocket connections for browser updates

## Development Guidelines

### Code Style
- Use TypeScript strict mode
- Follow functional programming principles where appropriate
- Prefer immutability
- Use descriptive variable and function names
- Add JSDoc comments for public APIs

### Testing Strategy
- Unit tests for individual functions and classes
- Integration tests for end-to-end workflows
- Test against real Jekyll sites for compatibility
- Include edge cases in test coverage

### Error Handling
- Never crash without a helpful error message
- Catch and handle invalid Liquid syntax gracefully
- Validate front matter and provide clear feedback
- Handle missing files and directories gracefully

### Edge Cases to Consider
- Invalid or unsupported plugins in `_config.yml`
- Malformed Liquid syntax in templates
- Advanced front matter formats (arrays, nested objects)
- Circular dependencies in includes
- File encoding issues
- Symlinks and special files

## Assumptions and Constraints

### Not Supported (Initially)
- Ruby-based Jekyll plugins (must be reimplemented)
- Exotic Jekyll features or edge-case dependencies
- Pagination, tags, and categories (future enhancement)
- Third-party plugins beyond the first-party scope

### Design Constraints
- Must work without Ruby installation
- Cannot rely on Jekyll gems
- Must produce compatible output for comparison
- Focus on common use cases first

## Future Enhancements (Out of Scope for v1)
- Pagination support
- Tags and categories
- Third-party TypeScript/JavaScript plugin system
- Advanced dev server features (error overlays, dependency graphs)
- Performance optimizations
- Incremental builds

## File Organization Recommendations

```
src/
├── cli/          # CLI command implementations
├── core/         # Core engine (site, document, renderer)
├── plugins/      # Built-in plugins (SEO, sitemap, feed)
├── liquid/       # Liquid template processing
├── config/       # Configuration parsing and validation
├── server/       # Development server
└── utils/        # Shared utilities

tests/
├── unit/         # Unit tests
├── integration/  # Integration tests
└── fixtures/     # Test Jekyll sites
```

## When Writing Code

### Always Consider
1. Will this work with existing Jekyll sites without modification?
2. Does this match Jekyll's behavior exactly?
3. Are error messages clear and actionable?
4. Is this the simplest solution that works?
5. Have I leveraged existing libraries appropriately?

### Before Committing
1. Run linter and fix any issues
2. Run tests and ensure they pass
3. Test against a real Jekyll site if possible
4. Verify error messages are helpful
5. Check that logging is appropriate

## Success Criteria

The project is successful when:
1. A typical Jekyll blog can be built without modification
2. The output is identical to Jekyll's output
3. The development server provides a good DX
4. Error messages help users fix issues quickly
5. The codebase is maintainable and extensible

## Resources

- Jekyll Documentation: https://jekyllrb.com/docs/
- Liquid Template Language: https://shopify.github.io/liquid/
- Jekyll Source Code: https://github.com/jekyll/jekyll (for reference)
