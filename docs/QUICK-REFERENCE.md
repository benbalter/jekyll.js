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

## 🎯 Priority Features for v0.2.0

### 1. Data Files (`_data` directory) 🔴
**Complexity**: Medium | **Impact**: High

Load YAML, JSON, CSV, TSV from `_data/` as `site.data`.

**Files to modify:**
- `src/core/Site.ts` - Add `readDataFiles()` method
- `src/core/Renderer.ts` - Expose `site.data` in templates
- Add tests in `src/core/__tests__/`

**Key Requirements:**
- Support nested directories
- Parse multiple formats
- Watch for changes

---

### 2. Watch Mode for Builds 🔴
**Complexity**: Medium | **Impact**: High

Enable `--watch` flag to rebuild on file changes.

**Files to modify:**
- `src/cli/commands/build.ts` - Implement file watching
- Use `chokidar` (already in dependencies)

**Key Requirements:**
- Watch source files
- Debounce rebuilds
- Handle errors gracefully
- Clear console feedback

---

### 3. SASS/SCSS Processing 🔴
**Complexity**: Medium | **Impact**: High

Compile `.scss`/`.sass` files with front matter.

**Files to modify:**
- `src/core/Builder.ts` - Add SASS compilation step
- Add new `src/core/sass.ts` module
- Add `sass` dependency to `package.json`

**Key Requirements:**
- Process files with front matter
- Import from `_sass/` directory
- Support compression options
- Integrate with watch mode

---

### 4. Front Matter Defaults 🔴
**Complexity**: Medium | **Impact**: Medium

Apply default front matter based on path/type.

**Files to modify:**
- `src/core/Document.ts` - Apply defaults on construction
- `src/core/Site.ts` - Pass defaults to documents
- `src/config/Config.ts` - Already has interface

**Key Requirements:**
- Match files by path pattern
- Filter by document type
- Merge with file front matter (file wins)

---

### 5. Additional Liquid Filters 🟡
**Complexity**: Low | **Impact**: Medium

Add missing array and utility filters.

**Files to modify:**
- `src/core/Renderer.ts` - Register new filters

**Filters to add:**
- `sort`, `sort_natural`
- `uniq`, `sample`
- `push`, `pop`, `shift`, `unshift`
- `find`, `find_exp`
- `to_integer`, `to_float`
- `abs`, `plus`, `minus`, `times`, `divided_by`

---

## 📁 Repository Structure

```
jekyll.js/
├── src/
│   ├── cli/           # Command-line interface
│   │   ├── commands/  # Individual commands (build, serve, new)
│   │   └── index.ts   # CLI entry point
│   ├── core/          # Core build engine
│   │   ├── Builder.ts    # Build orchestration
│   │   ├── Document.ts   # Document representation
│   │   ├── Renderer.ts   # Liquid rendering
│   │   ├── Site.ts       # Site management
│   │   └── markdown.ts   # Markdown processing
│   ├── config/        # Configuration
│   │   └── Config.ts     # _config.yml parser
│   ├── plugins/       # Built-in plugins
│   │   ├── seo-tag.ts
│   │   ├── sitemap.ts
│   │   └── feed.ts
│   ├── server/        # Development server
│   │   └── DevServer.ts
│   └── utils/         # Utilities
│       ├── errors.ts
│       └── logger.ts
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

**Last Updated**: 2025-11-21  
**Maintained by**: @benbalter
