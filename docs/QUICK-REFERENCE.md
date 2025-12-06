# Jekyll.js Quick Reference

Quick reference card for developers working on Jekyll.js compatibility features.

---

## 📚 Documentation Index

| Document | Purpose |
|----------|---------|
| [README.md](../README.md) | Getting started, installation, basic usage |
| [FEATURES.md](./FEATURES.md) | Feature status at a glance |
| [ROADMAP.md](./ROADMAP.md) | Development timeline and versions |
| [Jekyll Compatibility Plan](./jekyll-compatibility-plan.md) | Detailed feature specifications |
| [Liquid Rendering](./liquid-rendering.md) | Template engine documentation |

---

## 🎯 Current Implementation Status

### ✅ Completed Features (v0.1.0)

All of the following features are fully implemented:

1. **Data Files (`_data` directory)** ✅
   - YAML and JSON formats supported
   - Nested directory structures
   - `site.data` in templates
   - Watch for changes

2. **Watch Mode for Builds** ✅
   - File change detection via chokidar
   - Automatic rebuilds
   - Configuration reload
   - Error handling

3. **SASS/SCSS Processing** ✅
   - Compile `.scss` and `.sass` files
   - Import from `_sass/` directory
   - Configuration options (style, sass_dir)
   - Integration with watch mode

4. **Front Matter Defaults** ✅
   - Path and type-based defaults
   - Scope matching
   - Front matter merging

5. **Liquid Filters** ✅ (60+ implemented)
   - All array filters (sort, uniq, sample, push, pop, shift, unshift, find, find_exp)
   - Type conversion (to_integer)
   - Math filters (abs, plus, minus, times, divided_by, modulo, round, ceil, floor)
   - Modern filters (reading_time, toc, heading_anchors, external_links, auto_excerpt)

6. **Pagination** ✅
   - Basic post pagination
   - Custom pagination paths
   - Paginator object with all properties

7. **Theme Support** ✅
   - npm package-based themes
   - File override mechanism
   - Layout and include merging

8. **Incremental Builds** ✅
   - CacheManager for tracking
   - Build cache in `.jekyll-cache/`
   - Config change detection

---

## 🎯 Priority Features for v0.4.0+

### 1. Multiple Configuration Files 🔴
**Complexity**: Low | **Impact**: Medium

Support loading multiple config files (comma-separated).

**Example**:
```bash
jekyll-ts build --config _config.yml,_config.dev.yml
```

---

### 2. CSV/TSV Data Files 🔴
**Complexity**: Low | **Impact**: Low

Add support for CSV and TSV formats in `_data/` directory.

---

### 3. i18n/Localization 🔴
**Complexity**: High | **Impact**: Medium

Multi-language support for sites.

---

## 📁 Repository Structure

```
jekyll.js/
├── src/
│   ├── cli/           # Command-line interface
│   │   ├── commands/  # Individual commands (build, serve, new)
│   │   └── index.ts   # CLI entry point
│   ├── core/          # Core build engine
│   │   ├── Builder.ts      # Build orchestration
│   │   ├── CacheManager.ts # Incremental build cache
│   │   ├── Document.ts     # Document representation
│   │   ├── Paginator.ts    # Pagination support
│   │   ├── Renderer.ts     # Liquid rendering (60+ filters)
│   │   ├── SassProcessor.ts# SASS/SCSS compilation
│   │   ├── Site.ts         # Site management
│   │   ├── StaticFile.ts   # Static file handling
│   │   ├── ThemeManager.ts # Theme loading and resolution
│   │   └── markdown.ts     # Markdown processing
│   ├── config/        # Configuration
│   │   └── Config.ts     # _config.yml parser
│   ├── plugins/       # Built-in plugins
│   │   ├── avatar.ts           # jekyll-avatar
│   │   ├── converter.ts        # Converter plugin interface
│   │   ├── feed.ts             # jekyll-feed
│   │   ├── generator.ts        # Generator plugin interface
│   │   ├── github-metadata.ts  # jekyll-github-metadata
│   │   ├── hooks.ts            # Plugin hooks system
│   │   ├── html-minifier.ts    # HTML minification
│   │   ├── image-optimization.ts # Sharp-based optimization
│   │   ├── jemoji.ts           # jekyll-jemoji
│   │   ├── mentions.ts         # jekyll-mentions
│   │   ├── npm-plugin-loader.ts # npm plugin loading
│   │   ├── redirect-from.ts    # jekyll-redirect-from
│   │   ├── resource-hints.ts   # Resource hints (preload/prefetch)
│   │   ├── seo-tag.ts          # jekyll-seo-tag
│   │   ├── sitemap.ts          # jekyll-sitemap
│   │   └── syntax-highlighting.ts # Shiki-based highlighting
│   ├── server/        # Development server
│   │   └── DevServer.ts
│   ├── themes/        # Theme templates
│   └── utils/         # Utilities
│       ├── errors.ts
│       ├── logger.ts      # Winston-based logging
│       ├── parallel-fs.ts # Parallel file operations
│       ├── timer.ts
│       └── watcher.ts     # File watching (chokidar)
├── docs/              # Documentation
├── test-fixtures/     # Test Jekyll sites
└── dist/              # Compiled output
```

---

## 🧪 Testing Strategy

### Running Tests

```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Specific file
npm test -- src/core/__tests__/Site.test.ts

# With coverage
npm test -- --coverage
```

### Test Structure

```typescript
// Example test structure
describe('Feature', () => {
  describe('Subfeature', () => {
    it('should do something', () => {
      // Arrange
      const input = setupInput();
      
      // Act
      const result = featureFunction(input);
      
      // Assert
      expect(result).toBe(expected);
    });
  });
});
```

### Testing Guidelines

1. **Unit Tests**: Test individual functions and classes
2. **Integration Tests**: Test full workflows (build, render)
3. **Fixture Tests**: Test with real Jekyll sites in `test-fixtures/`
4. **Edge Cases**: Test error conditions and boundaries

---

## 🔧 Development Commands

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Watch mode (rebuild on change)
npm run dev

# Run linter
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Run tests
npm test

# Run benchmarks
npm run benchmark
```

### Build System

Jekyll.js uses **esbuild** for fast TypeScript bundling:

- **Performance**: ~1.2s build time (vs ~10s+ with tsc alone)
- **Tree shaking**: Automatically removes unused code
- **Source maps**: For debugging bundled code
- **Two outputs**:
  - `dist/cli.js` - Executable CLI with shebang
  - `dist/index.js` - Library entry point for npm
- **External dependencies**: Native modules (sharp, chokidar, ws) remain external
- **Type declarations**: Generated separately via TypeScript compiler

The build process:
1. Bundles all source files using esbuild
2. Generates TypeScript declaration files (.d.ts)
3. Copies theme files to dist directory

For development, use `npm run dev` to automatically rebuild on file changes.

---

## 📝 Code Style

### TypeScript Guidelines

```typescript
// Use explicit types
function processFile(path: string): Document {
  // ...
}

// Use interfaces for objects
interface BuildOptions {
  verbose: boolean;
  drafts: boolean;
}

// Avoid 'any' - use unknown or specific types
function parseData(data: unknown): ParsedData {
  // ...
}

// Use async/await for promises
async function buildSite(): Promise<void> {
  await site.read();
  await builder.build();
}
```

### Naming Conventions

- **Classes**: `PascalCase` (e.g., `Site`, `Document`)
- **Functions**: `camelCase` (e.g., `readPosts`, `renderDocument`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `DEFAULT_PORT`)
- **Interfaces**: `PascalCase` with 'I' prefix optional (e.g., `JekyllConfig`)
- **Private members**: Prefix with underscore `_methodName`

### File Organization

- One class per file
- Group related functions in modules
- Export from index.ts files
- Keep test files alongside source (`__tests__/` directory)

---

## 🐛 Debugging Tips

### Enable Verbose Logging

```bash
jekyll-ts build --verbose
```

### Debug in VS Code

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Build",
  "program": "${workspaceFolder}/dist/cli/index.js",
  "args": ["build", "--verbose"],
  "cwd": "${workspaceFolder}/test-fixtures/basic-site"
}
```

### Common Issues

**Build fails silently:**
- Check file paths (must be absolute)
- Verify front matter YAML is valid
- Enable `--verbose` for details

**Tests fail:**
- Run `npm install` to ensure dependencies
- Run `npm run build` to compile TypeScript
- Check test fixtures are valid

**Linting errors:**
- Run `npm run lint:fix` for auto-fixes
- Check ESLint configuration in `.eslintrc.js`

---

## 🔗 Useful Links

### Jekyll Resources
- [Jekyll Documentation](https://jekyllrb.com/docs/)
- [Jekyll Configuration](https://jekyllrb.com/docs/configuration/)
- [Liquid Template Language](https://shopify.github.io/liquid/)
- [Jekyll GitHub](https://github.com/jekyll/jekyll)

### Dependencies
- [liquidjs](https://liquidjs.com/) - Liquid template engine
- [remark](https://remark.js.org/) - Markdown processor
- [chokidar](https://github.com/paulmillr/chokidar) - File watcher
- [js-yaml](https://github.com/nodeca/js-yaml) - YAML parser

### TypeScript
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)

---

## 📋 Pull Request Checklist

Before submitting a PR, ensure:

- [ ] Code compiles: `npm run build`
- [ ] Tests pass: `npm test`
- [ ] Linting passes: `npm run lint`
- [ ] New features have tests
- [ ] Documentation is updated
- [ ] Commit messages are clear
- [ ] PR description explains changes
- [ ] Breaking changes are noted

---

## 🎨 Feature Implementation Template

Use this template when implementing new features:

```typescript
// 1. Update interfaces (if needed)
// src/config/Config.ts or relevant interface file

// 2. Implement core functionality
// src/core/Feature.ts

/**
 * Description of feature
 */
export class Feature {
  constructor(private site: Site) {}
  
  /**
   * Main method
   */
  public async process(): Promise<void> {
    // Implementation
  }
}

// 3. Integrate with existing code
// src/core/Builder.ts or relevant integration point

// 4. Add tests
// src/core/__tests__/Feature.test.ts

describe('Feature', () => {
  it('should work as expected', async () => {
    // Test implementation
  });
});

// 5. Update documentation
// README.md, docs/FEATURES.md, etc.
```

---

## 💡 Tips for Contributors

### Getting Started
1. Read [Jekyll Compatibility Plan](./jekyll-compatibility-plan.md)
2. Check [ROADMAP.md](./ROADMAP.md) for priorities
3. Look for "good first issue" labels
4. Comment on issue to claim it

### Writing Good Code
- Follow existing patterns in the codebase
- Write tests first (TDD approach)
- Keep functions small and focused
- Document public APIs with JSDoc
- Handle errors gracefully

### Testing Best Practices
- Test one thing per test
- Use descriptive test names
- Test both success and failure cases
- Use fixtures for integration tests
- Aim for 80%+ coverage

### Documentation
- Update README for user-facing changes
- Update FEATURES.md status
- Add examples where helpful
- Keep docs in sync with code

---

## 📞 Getting Help

- **Questions**: [GitHub Discussions](https://github.com/benbalter/jekyll.js/discussions)
- **Bugs**: [GitHub Issues](https://github.com/benbalter/jekyll.js/issues)
- **PRs**: [Pull Requests](https://github.com/benbalter/jekyll.js/pulls)

---

**Last Updated**: 2025-12-05  
**Maintained by**: @benbalter
