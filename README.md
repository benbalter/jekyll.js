# jekyll.js

A TypeScript reimplementation of Jekyll, the static site generator. This project aims to provide a Node.js-based alternative to the Ruby-based Jekyll that is fully compatible with existing Jekyll sites.

## Features

- 🚀 **CLI Tools**: Build, serve, and create Jekyll sites from the command line
- 📦 **Zero Dependencies on Ruby**: Pure TypeScript/Node.js implementation
- 🔄 **Jekyll Compatible**: Works with existing Jekyll sites without modification
- 🎨 **Liquid Templates**: Full support for Liquid templating
- ⚡ **Fast Development**: Live-reload development server

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
- `--verbose` - Print verbose output

**Watch Mode:**
When the `--watch` flag is enabled, jekyll-ts will monitor your source files for changes and automatically rebuild your site when files are modified, added, or deleted. This is useful for development workflows.

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

### Next Version (v0.2.0 - Phase 1)

- [x] Data files (`_data` directory)
- [x] Watch mode for builds
- [ ] SASS/SCSS processing
- [ ] Front matter defaults
- [ ] Additional Liquid filters

## Compatibility

This project aims to be compatible with Jekyll 4.x. While the goal is 100% compatibility, some features may not be available in early versions.

### Supported Features

- ✅ CLI commands (`new`, `build`, `serve`)
- ✅ Configuration parsing (`_config.yml`)
- ✅ Liquid templates with Jekyll-specific tags and filters
- ✅ Pages and posts
- ✅ Collections
- ✅ Layouts and includes
- ✅ Data files (`_data` directory) - YAML and JSON support
- ✅ Front matter (YAML)
- ✅ Markdown processing (using Remark with GFM support)
- ✅ Permalinks and URL generation
- ✅ Built-in plugins:
  - `jekyll-seo-tag` - SEO meta tags and JSON-LD
  - `jekyll-sitemap` - XML sitemap generation
  - `jekyll-feed` - Atom feed generation
- ✅ Draft and future post filtering
- ✅ Theme support (npm package-based themes)
- ✅ Watch mode for automatic rebuilds

### Planned Features

See [ROADMAP.md](./docs/ROADMAP.md) for complete timeline.

**High Priority** (v0.2.0):
- Data files (`_data` directory)
- Watch mode for builds (completed)
- SASS/SCSS processing
- Front matter defaults

**Medium Priority** (v0.3.0):
- Pagination
- Incremental builds
- Asset pipeline improvements

**Future** (v1.0.0+):
- Custom plugin system
- Advanced configuration options
- Performance optimizations
- Ecosystem building

> **Note**: Ruby-based Jekyll plugins are not directly supported and require TypeScript reimplementation. See the [Compatibility Plan](./docs/jekyll-compatibility-plan.md) for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details

## Acknowledgments

This project is inspired by and aims to be compatible with [Jekyll](https://jekyllrb.com/), created by Tom Preston-Werner and maintained by the Jekyll core team.
