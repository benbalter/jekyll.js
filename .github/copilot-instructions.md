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

## Setup & Development Workflow

### Initial Setup
1. Clone the repository
2. Install dependencies: `npm install`
3. Build the project: `npm run build`

### Development Commands
- **Build**: `npm run build` - Compile TypeScript to JavaScript
- **Watch**: `npm run dev` - Build in watch mode for development
- **Lint**: `npm run lint` - Run ESLint on source files
- **Lint Fix**: `npm run lint:fix` - Auto-fix linting issues where possible
- **Format**: `npm run format` - Format all TypeScript files with Prettier
- **Format Fix**: `npm run format:fix` - Auto-fix formatting issues (alias for format)
- **Format Check**: `npm run format:check` - Check if files are formatted correctly
- **Test**: `npm test` - Run all tests with Jest
- **Test Watch**: `npm run test:watch` - Run tests in watch mode

### Requirements
- Node.js >= 18.0.0
- npm (comes with Node.js)
- No Ruby installation required

## Contribution Guidelines

### Code Quality Standards
1. **Linting**: All code must pass ESLint checks (`npm run lint`)
   - Fix warnings about `any` types where possible
   - Use strict TypeScript types
2. **Formatting**: All code must be formatted with Prettier (`npm run format:fix`)
   - Always run `npm run format:fix` before committing
   - Check formatting with `npm run format:check`
3. **Testing**: All tests must pass (`npm test`)
   - Write tests for new features
   - Update tests when modifying existing functionality
4. **Building**: Code must compile without errors (`npm run build`)
5. **Type Safety**: Use TypeScript strict mode, avoid `any` types when possible

### Code Style
- Follow existing code patterns in the repository
- Use TypeScript strict mode
- Add JSDoc comments for public APIs
- Use descriptive variable and function names
- Prefer functional programming patterns where appropriate
- Use async/await for asynchronous operations

### Documentation
- Update relevant documentation when changing behavior
- Include code comments for complex logic
- Keep README.md up to date with new features
- Update `.github/copilot-instructions.md` if project patterns change

### Commit Messages
- Use clear, descriptive commit messages
- Reference issue numbers where applicable
- Keep commits focused on a single logical change

## Acceptance Criteria for Pull Requests

Every PR should meet these criteria:

1. **Functionality**
   - ✅ Addresses the stated issue or requirement
   - ✅ Works with existing Jekyll sites without modification
   - ✅ Maintains compatibility with Jekyll's expected behavior

2. **Code Quality**
   - ✅ Passes all linting checks (`npm run lint`)
   - ✅ Code is formatted with Prettier (`npm run format`)
   - ✅ All tests pass (`npm test`)
   - ✅ Builds successfully (`npm run build`)
   - ✅ No new TypeScript errors introduced
   - ✅ Follows existing code style and patterns

3. **Testing**
   - ✅ New features include unit tests
   - ✅ Bug fixes include regression tests
   - ✅ Tests follow existing test patterns in the repository
   - ✅ Test coverage is maintained or improved

4. **Documentation**
   - ✅ User-facing changes are documented in README.md
   - ✅ Complex logic has explanatory comments
   - ✅ API changes are reflected in JSDoc comments
   - ✅ Breaking changes are clearly noted

5. **Security & Performance**
   - ✅ No security vulnerabilities introduced
   - ✅ Performance regressions avoided
   - ✅ Error handling is appropriate and clear

## How Copilot Should Work

### General Approach
- **Minimal Changes**: Make the smallest possible changes to accomplish the goal
- **Compatibility First**: Prioritize Jekyll compatibility over clever optimizations
- **Clear Communication**: Explain what you're doing and why
- **Incremental Progress**: Work in small, verifiable steps
- **Test Early**: Run tests frequently during development

### Before Making Changes
1. Understand the existing code structure
2. Run tests to understand current state: `npm test`
3. Run linting to see baseline: `npm run lint`
4. Review related files and tests
5. Plan minimal changes needed

### While Coding
1. Make focused, surgical changes
2. Follow existing patterns in the codebase
3. Write or update tests alongside code changes
4. Run `npm run lint`, `npm run format:fix`, and `npm test` frequently
5. Build with `npm run build` to catch TypeScript errors

### Before Submitting
1. Run full test suite: `npm test`
2. Run linter: `npm run lint`
3. Format code: `npm run format:fix`
4. Build the project: `npm run build`
5. Verify changes work as expected
6. Review your changes for unnecessary modifications
7. Update documentation if needed

### Debugging Failed Tests or Builds
- Read error messages carefully
- Check file paths and imports
- Verify TypeScript types are correct
- Look at existing test patterns for guidance
- Run individual test files to isolate issues

## Resources

- Jekyll Documentation: https://jekyllrb.com/docs/
- Liquid Template Language: https://shopify.github.io/liquid/
- Jekyll Source Code: https://github.com/jekyll/jekyll (for reference)
- TypeScript Documentation: https://www.typescriptlang.org/docs/
- Jest Testing Framework: https://jestjs.io/docs/getting-started
