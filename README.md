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
- `-w, --watch` - Watch for changes and rebuild
- `--verbose` - Print verbose output

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

1. Install Ruby (version 3.0 or higher recommended)
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
│   │   ├── commands/ # Individual command handlers
│   │   └── index.ts  # Main CLI entry point
│   ├── core/         # Core build engine (coming soon)
│   ├── utils/        # Utility functions
│   └── index.ts      # Library entry point
├── dist/             # Compiled JavaScript output
└── tests/            # Test files
```

## Roadmap

- [x] Project scaffolding and CLI commands
- [ ] Configuration parsing (`_config.yml`)
- [ ] Liquid template rendering
- [ ] Page and post processing
- [ ] Collections support
- [ ] Development server with live reload
- [ ] Plugin system
- [ ] Built-in plugins (SEO, sitemap, feed)

## Compatibility

This project aims to be compatible with Jekyll 4.x. While the goal is 100% compatibility, some features may not be available in early versions.

### Supported Features

- ✅ CLI commands (`new`, `build`, `serve`)
- 🚧 Configuration parsing (planned)
- 🚧 Liquid templates (planned)
- 🚧 Pages and posts (planned)

### Not Yet Supported

- Ruby-based Jekyll plugins (will require TypeScript reimplementation)
- Some advanced Jekyll features

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details

## Acknowledgments

This project is inspired by and aims to be compatible with [Jekyll](https://jekyllrb.com/), created by Tom Preston-Werner and maintained by the Jekyll core team.
