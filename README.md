# jekyll.js

A TypeScript reimplementation of Jekyll, the static site generator. This project aims to provide a Node.js-based alternative to the Ruby-based Jekyll that is fully compatible with existing Jekyll sites.

## Features

- 🚀 **CLI Tools**: Build, serve, and create Jekyll sites from the command line
- 📦 **Zero Dependencies on Ruby**: Pure TypeScript/Node.js implementation
- 🔄 **Jekyll Compatible**: Works with existing Jekyll sites without modification
- 🎨 **Liquid Templates**: Full support for Liquid templating
- ⚡ **Fast Development**: Live-reload development server
- ✨ **Modern Features**: Optional modern JavaScript enhancements (syntax highlighting, image optimization, validation)

## Installation

```bash
npm install -g jekyll-ts
```

Or use npx to run without installing:

```bash
npx jekyll-ts <command>
```

## Usage

### Create a New Site

Create a new Jekyll site at the specified path:

```bash
jekyll-ts new my-site
cd my-site
```

Create a blank site without default theme:

```bash
jekyll-ts new my-site --blank
```

### Build Your Site

Build your site from source to destination:

```bash
jekyll-ts build
```

With custom options:

```bash
jekyll-ts build --source ./src --destination ./public --verbose
```

Available options:
- `-s, --source <path>` - Source directory (default: `.`)
- `-d, --destination <path>` - Destination directory (default: `./_site`)
- `--config <file>` - Custom configuration file (default: `_config.yml`)
- `--drafts` - Process and render draft posts
- `--future` - Publish posts with a future date
- `-w, --watch` - Watch for changes and rebuild automatically
- `-I, --incremental` - Enable incremental build (only rebuild changed files)
- `--verbose` - Print verbose output

**Watch Mode:**
When the `--watch` flag is enabled, jekyll-ts will monitor your source files for changes and automatically rebuild your site when files are modified, added, or deleted. This is useful for development workflows.

**Incremental Builds:**
When the `--incremental` flag is enabled, jekyll-ts will only rebuild files that have changed since the last build, significantly improving build performance for large sites. The build cache is stored in `.jekyll-cache/` directory.

```bash
jekyll-ts build --incremental
```

> **Limitations of Incremental Builds**
>
> Incremental builds speed up development, but have important limitations:
> 
> 1. **Configuration changes require a clean build**: Changes to `_config.yml` automatically trigger a full rebuild.
> 2. **Data file changes may not trigger rebuilds**: Changes to files in `_data/` may not automatically rebuild affected pages. Run a clean build if you update data files.
> 3. **Include file changes are not tracked**: Edits to files in `_includes/` may not trigger rebuilds for pages that use them.
> 4. **Layout inheritance chains may not be fully tracked**: Changes to parent layouts may not rebuild all dependent pages.
> 5. **Static files are always copied**: Files in `assets/` or other static directories are copied on every build.
> 
> **When in doubt, run a clean build:** Use `jekyll-ts build` without `--incremental` to ensure your site is fully rebuilt.

```bash
jekyll-ts build --watch
```

### Serve Your Site Locally

Build your site and start a development server:

```bash
jekyll-ts serve
```

With custom options:

```bash
jekyll-ts serve --port 3000 --host 0.0.0.0
```

Available options:
- `-s, --source <path>` - Source directory (default: `.`)
- `-d, --destination <path>` - Destination directory (default: `./_site`)
- `--config <file>` - Custom configuration file (default: `_config.yml`)
- `-P, --port <port>` - Port to listen on (default: `4000`)
- `-H, --host <host>` - Host to bind to (default: `localhost`)
- `--livereload` - Use LiveReload to automatically refresh browsers (default: true)
- `--no-livereload` - Disable LiveReload
- `--drafts` - Process and render draft posts
- `--future` - Publish posts with a future date
- `--verbose` - Print verbose output

### Using Themes

Jekyll.js supports npm-based themes that provide layouts, includes, and assets. To use a theme:

1. Install the theme package:

```bash
npm install jekyll-theme-minimal
```

2. Add the theme to your `_config.yml`:

```yaml
theme: jekyll-theme-minimal
```

3. Build your site:

```bash
jekyll-ts build
```

**Theme File Override:**
- Site files always take precedence over theme files
- Create `_layouts/default.html` in your site to override the theme's default layout
- Create `_includes/header.html` to override the theme's header include

**Theme Structure:**
A theme package should have the following structure:

```
jekyll-theme-name/
├── _layouts/       # Layout files
├── _includes/      # Include files
├── _sass/          # Sass partials
├── assets/         # CSS, JS, images
└── package.json
```

### Using Plugins

Jekyll.js includes several built-in plugins and supports loading custom plugins from npm packages.

**Built-in Plugins:**
- `jekyll-seo-tag` - SEO meta tags
- `jekyll-sitemap` - XML sitemap generation  
- `jekyll-feed` - Atom feed generation
- `jekyll-jemoji` - Emoji support
- `jekyll-mentions` - @mention links
- `jekyll-redirect-from` - Redirect pages
- `jekyll-avatar` - GitHub avatar helper
- `jekyll-github-metadata` - GitHub repository metadata

**Enable plugins in `_config.yml`:**

```yaml
plugins:
  - jekyll-seo-tag
  - jekyll-sitemap
  - jekyll-feed
```

**Using npm Plugins:**

Install and use custom plugins from npm:

```bash
npm install my-jekyll-plugin
```

```yaml
plugins:
  - jekyll-seo-tag           # Built-in
  - my-jekyll-plugin         # npm plugin
  - @myorg/jekyll-plugin     # Scoped npm plugin
```

> 📖 See [PLUGINS.md](./docs/PLUGINS.md) for detailed plugin documentation and how to create custom plugins.

## Development

### Setup

Clone the repository and install dependencies:

```bash
git clone https://github.com/benbalter/jekyll.js.git
cd jekyll.js
npm install
```

### Build

Build the TypeScript source:

```bash
npm run build
```

### Test

Run the test suite:

```bash
npm test
```

### Benchmark

Run benchmark tests comparing Jekyll TS performance:

```bash
npm run benchmark
```

This runs a full integration benchmark test that:
- Builds the test fixture site using Jekyll TS via CLI
- Compares build times against Ruby Jekyll (if installed)
- Runs multiple iterations to measure consistency
- Outputs detailed performance metrics

If Ruby Jekyll is not installed, the benchmark will only measure Jekyll TS performance.

#### Setting up Ruby Jekyll for benchmarking

To enable side-by-side comparison with Ruby Jekyll:

1. Install Ruby (version 3.2 or higher recommended)
2. Install dependencies:
   ```bash
   bundle install
   ```
3. Run the benchmark:
   ```bash
   npm run benchmark
   ```

The Gemfile includes Jekyll 4.3 and required dependencies for running the benchmark comparison.

### Lint

Lint the source code:

```bash
npm run lint
npm run lint:fix  # Auto-fix issues
```

## Project Structure

```
jekyll.js/
├── src/
│   ├── cli/          # CLI command implementations
│   │   ├── commands/ # Individual command handlers (new, build, serve)
│   │   └── index.ts  # Main CLI entry point
│   ├── core/         # Core build engine
│   │   ├── Builder.ts   # Site build orchestration
│   │   ├── Document.ts  # Document representation
│   │   ├── Renderer.ts  # Liquid template rendering
│   │   ├── Site.ts      # Site management
│   │   └── markdown.ts  # Markdown processing
│   ├── config/       # Configuration parsing
│   │   └── Config.ts # _config.yml parser and validator
│   ├── plugins/      # Built-in plugins
│   │   ├── seo-tag.ts  # SEO meta tags
│   │   ├── sitemap.ts  # Sitemap generation
│   │   └── feed.ts     # RSS/Atom feed
│   ├── utils/        # Utility functions
│   └── index.ts      # Library entry point
├── dist/             # Compiled JavaScript output
└── test-fixtures/    # Test Jekyll sites
```

## Roadmap

> 📋 For detailed feature roadmap and implementation plans, see:
> - [**ROADMAP.md**](./docs/ROADMAP.md) - Development timeline and release schedule
> - [**Jekyll Compatibility Plan**](./docs/jekyll-compatibility-plan.md) - Comprehensive feature specifications

### Current Status (v0.1.0)

- [x] Project scaffolding and CLI commands
- [x] Configuration parsing (`_config.yml`)
- [x] Liquid template rendering
- [x] Page and post processing
- [x] Collections support
- [x] Data files support (`_data` directory)
- [x] Markdown processing (using Remark)
- [x] Plugin system
- [x] Built-in plugins (SEO, sitemap, feed)
- [x] Development server with live reload
- [x] Theme support (npm package-based)
- [x] Incremental builds

### Next Version (v0.2.0 - Phase 1)

- [x] Data files (`_data` directory)
- [x] Watch mode for builds
- [x] Front matter defaults
- [ ] SASS/SCSS processing
- [ ] Additional Liquid filters

## Compatibility

This project aims to be compatible with Jekyll 4.x. While the goal is 100% compatibility, some features may not be available in early versions.

> 📖 **Parity & Improvements**: See [**PARITY.md**](./docs/PARITY.md) for a complete guide to features with full parity with Ruby Jekyll and backwards-compatible improvements.
>
> 📖 **Modern Features**: Jekyll.js includes optional modern JavaScript enhancements. See [**MODERN-FEATURES.md**](./docs/MODERN-FEATURES.md) for details on syntax highlighting, image optimization, and advanced validation.

### Features with Full Parity

These features work identically to Ruby Jekyll - no changes needed for existing sites:

- ✅ CLI commands (`new`, `build`, `serve`)
- ✅ Configuration parsing (`_config.yml`)
- ✅ Liquid templates with 50+ Jekyll-specific filters and tags
- ✅ Pages, posts, drafts, and future posts
- ✅ Collections with custom permalinks
- ✅ Layouts and includes with parameter support
- ✅ Data files (`_data` directory) - YAML and JSON support
- ✅ Front matter (YAML) and front matter defaults
- ✅ Markdown processing (using Remark with GFM support)
- ✅ Permalinks and URL generation
- ✅ Built-in plugins:
  - `jekyll-seo-tag` - SEO meta tags and JSON-LD
  - `jekyll-sitemap` - XML sitemap generation
  - `jekyll-feed` - Atom feed generation
- ✅ Theme support (npm package-based themes)
- ✅ Watch mode and incremental builds
- ✅ Development server with live reload

### Backwards-Compatible Improvements

Jekyll.js includes optional modern enhancements (disabled by default):

- 🆕 **Shiki syntax highlighting** - VSCode-powered, 100+ languages
- 🆕 **Sharp image optimization** - WebP/AVIF generation, 30-70% size reduction
- 🆕 **Zod configuration validation** - Clear error messages for invalid config
- 🆕 **npm-based themes** - Standard JavaScript package management
- 🆕 **Enhanced error messages** - File/line references and suggestions

Enable modern features in `_config.yml`:
```yaml
modern:
  syntaxHighlighting:
    enabled: true
  imageOptimization:
    enabled: true
```

### Planned Features

See [ROADMAP.md](./docs/ROADMAP.md) for complete timeline.

**High Priority** (v0.2.0):
- Data files (`_data` directory) - completed
- Watch mode for builds - completed
- Front matter defaults - completed
- SASS/SCSS processing

**Medium Priority** (v0.3.0):
- Pagination
- Asset pipeline improvements

**Future** (v1.0.0+):
- Advanced configuration options
- Performance optimizations
- Ecosystem building

> **Note**: Ruby-based Jekyll plugins are not directly supported and require TypeScript reimplementation. See the [Compatibility Plan](./docs/jekyll-compatibility-plan.md) for details.
>
> 📖 **Plugin Documentation**: See [PLUGINS.md](./docs/PLUGINS.md) for detailed documentation on using and creating plugins.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details

## Acknowledgments

This project is inspired by and aims to be compatible with [Jekyll](https://jekyllrb.com/), created by Tom Preston-Werner and maintained by the Jekyll core team.
