# Migration Guide: Ruby Jekyll to Jekyll.js

This guide helps you migrate an existing Jekyll site from Ruby Jekyll to Jekyll.js, including how to opt into modern enhancements.

---

## Table of Contents

- [Before You Start](#before-you-start)
- [Quick Start Migration](#quick-start-migration)
- [Step-by-Step Migration](#step-by-step-migration)
- [Opting Into Modern Features](#opting-into-modern-features)
- [Common Migration Scenarios](#common-migration-scenarios)
- [Configuration Changes](#configuration-changes)
- [Plugin Migration](#plugin-migration)
- [Theme Migration](#theme-migration)
- [Troubleshooting](#troubleshooting)
- [Testing Your Migration](#testing-your-migration)
- [Getting Help](#getting-help)

---

## Before You Start

### Requirements

- **Node.js 18+** (Node.js 22+ recommended for full features)
- **npm** (comes with Node.js)
- No Ruby installation required!

### What Works Without Changes

Most Jekyll sites work immediately with Jekyll.js:

✅ **Zero modifications needed:**
- Basic blogs with posts and pages
- Portfolio sites with collections
- Documentation sites with layouts and includes
- Sites using data files (`_data` directory with YAML/JSON)
- Sites using front matter defaults
- Sites using pagination
- Sites using SASS/SCSS
- Sites using common plugins (SEO, sitemap, feed, jemoji, mentions, redirect-from, avatar)

### What May Need Changes

🟡 **Minor adjustments required:**
- Sites using gem-based themes → Convert to npm-based themes
- Sites using CSV/TSV data files → Convert to YAML/JSON
- Sites with Ruby-specific Liquid filters → Check compatibility

🔴 **Not supported:**
- Ruby plugins → Require TypeScript reimplementation
- i18n/localization (planned for v1.0.0+)

---

## Quick Start Migration

For most sites, migration is three simple steps:

```bash
# 1. Install Jekyll.js globally
npm install -g jekyll-ts

# 2. Navigate to your Jekyll site
cd your-jekyll-site

# 3. Build with Jekyll.js
jekyll-ts build --verbose
```

If this works, congratulations! Your site is migrated.

If you encounter issues, continue with the detailed migration guide below.

---

## Step-by-Step Migration

### Step 1: Install Jekyll.js

**Option A: Global installation**
```bash
npm install -g jekyll-ts
```

**Option B: Use without installing (npx)**
```bash
npx jekyll-ts build
```

**Option C: Add to your project**
```bash
npm init -y  # If no package.json exists
npm install jekyll-ts
```

### Step 2: Test Your Site

Run a verbose build to identify any issues:

```bash
jekyll-ts build --verbose
```

Review the output for:
- Missing plugins
- Template errors
- Configuration warnings

### Step 3: Address Any Issues

Common issues and solutions:

| Issue | Solution |
|-------|----------|
| Missing plugin | Check if it's built-in or find npm alternative |
| Theme not found | Convert to npm-based theme or extract theme files |
| Liquid error | Check filter/tag compatibility |
| Data file not loading | Ensure YAML/JSON format (not CSV/TSV) |

### Step 4: Start Development Server

```bash
jekyll-ts serve
```

Visit `http://localhost:4000` to preview your site.

### Step 5: Compare Output (Optional)

If you want to verify the output matches Ruby Jekyll:

```bash
# Build with Ruby Jekyll
jekyll build -d _site_ruby

# Build with Jekyll.js  
jekyll-ts build -d _site_ts

# Compare outputs
diff -r _site_ruby _site_ts
```

Minor whitespace differences are normal and don't affect the rendered site.

---

## Opting Into Modern Features

Jekyll.js includes several optional modern enhancements that are disabled by default for backwards compatibility. Enable them in your `_config.yml`:

### Syntax Highlighting with Shiki

Replace Rouge with VSCode-powered syntax highlighting:

```yaml
# _config.yml
modern:
  syntaxHighlighting:
    enabled: true
    theme: github-light    # or github-dark, monokai, nord, etc.
    showLineNumbers: true
```

**Benefits:**
- 100+ languages supported
- VSCode-accurate highlighting
- Multiple themes available
- Zero runtime dependencies

**Available themes:** `github-light`, `github-dark`, `monokai`, `nord`, `one-dark-pro`, `solarized-light`, `solarized-dark`, `dracula`, `vitesse-light`, `vitesse-dark`

### Image Optimization with Sharp

Automatically optimize images during builds:

```yaml
# _config.yml
modern:
  imageOptimization:
    enabled: true
    quality: 80
    generateWebP: true
    generateAVIF: true
    responsiveSizes:
      - 400
      - 800
      - 1200
```

**Benefits:**
- 30-70% smaller image files
- Automatic WebP/AVIF generation
- Responsive image variants
- Native performance (4-5x faster than JS alternatives)

### HTML Minification

Reduce HTML file sizes:

```yaml
# _config.yml
modern:
  htmlMinification:
    enabled: true
    removeComments: true
    collapseWhitespace: true
    minifyCSS: true
    minifyJS: true
```

**Benefits:**
- 10-30% smaller HTML files
- Faster page loads
- Better cache efficiency

### Resource Hints (Preload/Prefetch)

Optimize resource loading:

```yaml
# _config.yml
modern:
  resourceHints:
    enabled: true
    preloadStyles: true
    preloadFonts: true
    preconnectOrigins:
      - https://fonts.googleapis.com
      - https://fonts.gstatic.com
```

**Benefits:**
- Faster perceived page loads
- Better Core Web Vitals scores
- Automatic detection of critical resources

### Enable All Modern Features

For a fully optimized site:

```yaml
# _config.yml
modern:
  syntaxHighlighting:
    enabled: true
    theme: github-dark
  imageOptimization:
    enabled: true
    quality: 80
    generateWebP: true
  htmlMinification:
    enabled: true
    removeComments: true
    collapseWhitespace: true
  resourceHints:
    enabled: true
    preloadStyles: true
    preloadFonts: true
```

---

## Common Migration Scenarios

### Scenario 1: Basic Blog

**Before (Ruby Jekyll):**
```
my-blog/
├── _config.yml
├── _posts/
│   └── 2024-01-01-hello.md
├── _layouts/
│   └── default.html
└── index.html
```

**Migration:** No changes needed! Just run:
```bash
jekyll-ts build
```

### Scenario 2: Site with Data Files

**Before (Ruby Jekyll):**
```yaml
# _data/navigation.yml
- title: Home
  url: /
- title: About
  url: /about/
```

**Migration:** YAML and JSON data files work identically:
```bash
jekyll-ts build
```

**Note:** If using CSV/TSV files, convert to YAML or JSON:
```bash
# Convert CSV to YAML (manual process)
# Create _data/file.yml with the same data structure
```

### Scenario 3: Site with Gem Theme

**Before (Ruby Jekyll):**
```yaml
# _config.yml
theme: minima
```

**Migration options:**

**Option A: Use npm-based theme**
```bash
# Install npm theme
npm install jekyll-theme-minimal

# Update _config.yml
theme: jekyll-theme-minimal
```

**Option B: Extract theme files**
```bash
# Copy theme files to your site
bundle info minima --path  # Find theme location
cp -r /path/to/theme/_layouts ./
cp -r /path/to/theme/_includes ./
cp -r /path/to/theme/_sass ./

# Remove theme from _config.yml
# theme: minima  # Comment out or remove
```

### Scenario 4: Site with Plugins

**Before (Ruby Jekyll):**
```yaml
# _config.yml
plugins:
  - jekyll-seo-tag
  - jekyll-sitemap
  - jekyll-feed
```

**Migration:** These plugins are built into Jekyll.js!
```yaml
# _config.yml - same configuration works
plugins:
  - jekyll-seo-tag
  - jekyll-sitemap
  - jekyll-feed
```

**Built-in plugins:**
- `jekyll-seo-tag`
- `jekyll-sitemap`
- `jekyll-feed`
- `jekyll-jemoji`
- `jekyll-mentions`
- `jekyll-redirect-from`
- `jekyll-avatar`
- `jekyll-github-metadata`

### Scenario 5: Site with SASS/SCSS

**Before (Ruby Jekyll):**
```yaml
# _config.yml
sass:
  sass_dir: _sass
  style: compressed
```

**Migration:** Same configuration works:
```bash
jekyll-ts build
```

### Scenario 6: Site with Collections

**Before (Ruby Jekyll):**
```yaml
# _config.yml
collections:
  projects:
    output: true
    permalink: /projects/:name/
```

**Migration:** Same configuration works:
```bash
jekyll-ts build
```

### Scenario 7: Site with Pagination

**Before (Ruby Jekyll):**
```yaml
# _config.yml
plugins:
  - jekyll-paginate

paginate: 10
paginate_path: /blog/page:num/
```

**Migration:** Pagination is built-in:
```yaml
# _config.yml
paginate: 10
paginate_path: /blog/page:num/
```

---

## Configuration Changes

### No Changes Required

These configurations work identically:

```yaml
# Site settings
title: My Site
description: Site description
url: https://example.com
baseurl: /blog

# Build settings
source: .
destination: _site
exclude:
  - Gemfile
  - node_modules

# Content settings
permalink: /:categories/:title/
future: false
drafts: false

# Collections
collections:
  projects:
    output: true

# Front matter defaults
defaults:
  - scope:
      path: ""
      type: posts
    values:
      layout: post

# SASS
sass:
  sass_dir: _sass
  style: compressed

# Pagination
paginate: 10
paginate_path: /page:num/
```

### Configuration Differences

| Ruby Jekyll | Jekyll.js | Notes |
|-------------|-----------|-------|
| `gem "theme"` in Gemfile | `theme: name` in config | Themes from npm |
| Ruby plugin gems | Built-in or npm plugins | No Ruby required |
| `timezone: America/New_York` | Not yet supported | Planned for v0.4.0 |
| CSV/TSV data files | Use YAML/JSON | Convert manually |

### New Configuration Options

Jekyll.js adds new options:

```yaml
# Modern features (all optional, disabled by default)
modern:
  syntaxHighlighting:
    enabled: true
    theme: github-light
  imageOptimization:
    enabled: true
    quality: 80
  htmlMinification:
    enabled: true
  resourceHints:
    enabled: true
```

---

## Plugin Migration

### Built-in Plugins (No Changes)

These plugins are reimplemented in Jekyll.js and work identically:

| Plugin | Status | Usage |
|--------|--------|-------|
| `jekyll-seo-tag` | ✅ Built-in | `{% seo %}` tag |
| `jekyll-sitemap` | ✅ Built-in | Auto-generates `/sitemap.xml` |
| `jekyll-feed` | ✅ Built-in | Auto-generates `/feed.xml` |
| `jekyll-jemoji` | ✅ Built-in | `:emoji:` syntax |
| `jekyll-mentions` | ✅ Built-in | `@username` links |
| `jekyll-redirect-from` | ✅ Built-in | `redirect_from` front matter |
| `jekyll-avatar` | ✅ Built-in | `{% avatar username %}` |
| `jekyll-github-metadata` | ✅ Built-in | `site.github` object |

### npm Plugins

Install third-party plugins from npm:

```bash
npm install my-jekyll-plugin
```

```yaml
# _config.yml
plugins:
  - jekyll-seo-tag      # Built-in
  - my-jekyll-plugin    # From npm
```

### Ruby Plugins (Not Supported)

Ruby plugins cannot run in Node.js. Options:

1. **Check if reimplemented** - Many popular plugins are built into Jekyll.js
2. **Find npm alternative** - Search npm for similar functionality
3. **Request implementation** - Open a GitHub issue for popular plugins
4. **Reimplement in TypeScript** - For custom plugins, rewrite in TypeScript

See [PLUGINS.md](./PLUGINS.md) for plugin development guide.

---

## Theme Migration

### From Gem Themes to npm Themes

**Option 1: Find npm equivalent**
```bash
npm install jekyll-theme-name
```

```yaml
# _config.yml
theme: jekyll-theme-name
```

**Option 2: Extract and customize**

1. Find your current theme location:
   ```bash
   bundle info minima --path
   ```

2. Copy theme files to your site:
   ```bash
   cp -r /path/to/theme/_layouts ./
   cp -r /path/to/theme/_includes ./
   cp -r /path/to/theme/_sass ./
   cp -r /path/to/theme/assets ./
   ```

3. Remove theme from `_config.yml`:
   ```yaml
   # theme: minima  # Remove or comment out
   ```

### Theme Override Mechanism

Site files always take precedence over theme files:

```
Site file              Overrides    Theme file
_layouts/default.html  →           theme/_layouts/default.html
_includes/header.html  →           theme/_includes/header.html
_sass/custom.scss      →           theme/_sass/custom.scss
```

See [theme-development.md](./theme-development.md) for creating themes.

---

## Troubleshooting

### Common Errors and Solutions

#### "Plugin not found"

```
Error: Plugin 'jekyll-some-plugin' not found
```

**Solution:** Check if it's built-in or install from npm:
```bash
npm install jekyll-some-plugin
```

#### "Template rendering failed"

```
Error: Liquid error: undefined filter
```

**Solution:** Check if the filter is supported. Most Jekyll filters are implemented. See [FEATURES.md](./FEATURES.md) for complete list.

#### "Theme not found"

```
Error: Theme 'minima' not found
```

**Solution:** Themes must be npm packages:
```bash
npm install jekyll-theme-minimal
```
Or extract theme files directly into your site.

#### "Data file not loading"

```
Error: Unable to load _data/file.csv
```

**Solution:** Convert CSV/TSV to YAML or JSON:
```yaml
# _data/file.yml
- name: Item 1
  value: 100
- name: Item 2
  value: 200
```

#### "Build is slow"

**Solution:** Enable incremental builds:
```bash
jekyll-ts build --incremental
```

Or for development:
```bash
jekyll-ts serve  # Includes watch mode
```

### Debugging Tips

1. **Use verbose mode:**
   ```bash
   jekyll-ts build --verbose
   ```

2. **Check configuration:**
   ```bash
   cat _config.yml
   ```

3. **Verify file structure:**
   ```bash
   ls -la _layouts/ _includes/ _posts/
   ```

4. **Test incrementally:**
   - Start with a minimal site
   - Add features one at a time
   - Identify what causes issues

---

## Testing Your Migration

### Manual Testing Checklist

- [ ] Homepage loads correctly
- [ ] All pages render without errors
- [ ] Navigation works
- [ ] Posts display correctly with dates
- [ ] Collections render properly
- [ ] SASS/SCSS compiles
- [ ] Images display
- [ ] Links work (internal and external)
- [ ] SEO tags present (if using jekyll-seo-tag)
- [ ] Feed generates (if using jekyll-feed)
- [ ] Sitemap generates (if using jekyll-sitemap)

### Automated Comparison

Compare output between Ruby Jekyll and Jekyll.js:

```bash
# Create comparison script
#!/bin/bash

# Build with Ruby Jekyll
jekyll build -d _site_ruby

# Build with Jekyll.js
jekyll-ts build -d _site_ts

# Compare (ignore whitespace)
diff -rq --ignore-all-space _site_ruby _site_ts
```

### Performance Comparison

```bash
# Time Ruby Jekyll build
time jekyll build

# Time Jekyll.js build
time jekyll-ts build
```

---

## Getting Help

### Resources

- 📖 **Documentation**: [docs/README.md](./README.md)
- 📋 **Feature Status**: [docs/FEATURES.md](./FEATURES.md)
- 🔄 **Compatibility**: [docs/PARITY.md](./PARITY.md)
- 🔌 **Plugins**: [docs/PLUGINS.md](./PLUGINS.md)
- 🎨 **Themes**: [docs/theme-development.md](./theme-development.md)

### Community

- **Questions**: [GitHub Discussions](https://github.com/benbalter/jekyll.js/discussions)
- **Bug Reports**: [GitHub Issues](https://github.com/benbalter/jekyll.js/issues)
- **Feature Requests**: [GitHub Issues](https://github.com/benbalter/jekyll.js/issues)

### Reporting Migration Issues

When reporting issues, include:

1. Your `_config.yml` (sensitive data removed)
2. The error message
3. Steps to reproduce
4. Ruby Jekyll version you're migrating from
5. Jekyll.js version

---

## Summary

### Migration Checklist

- [ ] Install Jekyll.js: `npm install -g jekyll-ts`
- [ ] Test build: `jekyll-ts build --verbose`
- [ ] Address any plugin issues
- [ ] Convert gem themes to npm or extract files
- [ ] Convert CSV/TSV data files to YAML/JSON
- [ ] Test site in browser: `jekyll-ts serve`
- [ ] (Optional) Enable modern features in `_config.yml`
- [ ] (Optional) Compare output with Ruby Jekyll

### Quick Reference

| Task | Command |
|------|---------|
| Build site | `jekyll-ts build` |
| Serve locally | `jekyll-ts serve` |
| Watch for changes | `jekyll-ts build --watch` |
| Incremental build | `jekyll-ts build --incremental` |
| Verbose output | `jekyll-ts build --verbose` |
| Include drafts | `jekyll-ts build --drafts` |
| Custom config | `jekyll-ts build --config _config.dev.yml` |

---

**Last Updated**: 2025-12-04  
**Jekyll.js Version**: 0.1.0  
**Maintained by**: @benbalter
