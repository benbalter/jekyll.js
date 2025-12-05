# Theme Development Guide

This guide explains how to create and use themes in Jekyll.js.

## What is a Theme?

A Jekyll.js theme is an npm package that provides:
- **Layouts** (`_layouts/`) - Template files for pages and posts
- **Includes** (`_includes/`) - Reusable template components
- **Sass stylesheets** (`_sass/`) - Stylesheet partials
- **Assets** (`assets/`) - CSS, JavaScript, images, fonts
- **Data files** (`_data/`) - Default data for templates
- **Configuration** (`_config.yml`) - Theme default settings
- **Metadata** (`package.json`) - Theme information (name, version, author)

Themes allow you to package and distribute site designs, making it easy for users to apply a consistent look and feel to their Jekyll.js sites.

This npm-based theme system is similar to Jekyll.rb's gem-based themes, but uses the standard JavaScript package ecosystem for installation and management.

## Using a Theme

### Install from npm

```bash
npm install jekyll-theme-minimal
```

### Configure Your Site

Add the theme to your `_config.yml`:

```yaml
theme: jekyll-theme-minimal
```

### Build Your Site

```bash
jekyll-ts build
```

That's it! Your site will now use the theme's layouts, includes, and assets.

### Overriding Theme Files

Site files always take precedence over theme files. To customize a theme:

1. **Override a layout:** Create `_layouts/default.html` in your site
2. **Override an include:** Create `_includes/header.html` in your site
3. **Override data files:** Create `_data/navigation.yml` in your site
4. **Add custom styles:** Create your own stylesheets in `assets/`

The theme's original files remain untouched, and your customizations are applied on top.

### Theme Data Files

Themes can provide default data in their `_data/` directory. This data is automatically merged with your site's data, with **site data taking precedence** over theme data.

For example, if a theme provides `_data/navigation.yml`:

```yaml
# Theme's _data/navigation.yml
main:
  - title: Home
    url: /
  - title: About
    url: /about/
```

You can override specific values in your site's `_data/navigation.yml`:

```yaml
# Site's _data/navigation.yml (overrides theme)
main:
  - title: Home
    url: /
  - title: Blog
    url: /blog/
```

### Theme Configuration Defaults

Themes can include a `_config.yml` file with default configuration values. These defaults are available to your templates but **do not automatically merge** with your site's configuration.

Access theme defaults in your site using the theme manager API or reference them in templates:

```yaml
# Theme's _config.yml
author:
  name: Theme Default Author
  bio: A default biography
social:
  twitter: theme_twitter
defaults:
  - scope:
      path: ""
      type: "posts"
    values:
      layout: post
      comments: true
```

### Accessing Theme Metadata

Theme metadata from `package.json` is available via the `ThemeManager` API:

```typescript
import { Site } from 'jekyll-ts';

const site = new Site('/path/to/site', config);
const metadata = site.themeManager.getThemeMetadata();

console.log(metadata?.name);        // 'jekyll-theme-minimal'
console.log(metadata?.version);     // '1.0.0'
console.log(metadata?.author);      // 'Your Name'
console.log(metadata?.description); // 'A minimal theme for Jekyll.js'
```

## Creating a Theme

### Directory Structure

Create a new npm package with the following structure:

```
jekyll-theme-name/
├── _layouts/
│   ├── default.html
│   ├── page.html
│   └── post.html
├── _includes/
│   ├── header.html
│   ├── footer.html
│   └── navigation.html
├── _sass/
│   ├── _variables.scss
│   ├── _base.scss
│   └── _layout.scss
├── _data/                  # Theme data files (new)
│   ├── navigation.yml
│   └── social.yml
├── assets/
│   ├── css/
│   │   └── main.scss
│   ├── js/
│   │   └── main.js
│   └── images/
├── _config.yml             # Theme defaults (new)
├── package.json
├── README.md
└── LICENSE
```

### package.json

Create a `package.json` file for your theme:

```json
{
  "name": "jekyll-theme-minimal",
  "version": "1.0.0",
  "description": "A minimal theme for Jekyll.js",
  "main": "index.js",
  "keywords": [
    "jekyll",
    "theme",
    "static-site"
  ],
  "author": "Your Name",
  "license": "MIT",
  "homepage": "https://github.com/yourusername/jekyll-theme-minimal",
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/jekyll-theme-minimal.git"
  },
  "files": [
    "_layouts",
    "_includes",
    "_sass",
    "_data",
    "assets",
    "_config.yml"
  ]
}
```

**Important:** Include the `files` field to ensure theme assets are published to npm. The metadata fields (`description`, `author`, `license`, `homepage`, `repository`, `keywords`) are readable via the `ThemeMetadata` API.

### Theme Configuration File

Create `_config.yml` for theme defaults:

```yaml
# Theme default configuration
# These values are available via themeManager.getThemeDefaults()

author:
  name: Default Author
  email: author@example.com

social:
  twitter: null
  github: null

# Default front matter for posts
defaults:
  - scope:
      path: ""
      type: "posts"
    values:
      layout: post
      comments: true
      share: true
```

### Theme Data Files

Create `_data/navigation.yml` for default navigation:

```yaml
main:
  - title: Home
    url: /
  - title: About
    url: /about/
  - title: Blog
    url: /blog/

footer:
  - title: Privacy
    url: /privacy/
  - title: Terms
    url: /terms/
```

### Example Layout

Create `_layouts/default.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{{ page.title | default: site.title }}</title>
  <link rel="stylesheet" href="{{ '/assets/css/main.css' | relative_url }}">
</head>
<body>
  {% include header.html %}
  
  <main class="content">
    {{ content }}
  </main>
  
  {% include footer.html %}
  
  <script src="{{ '/assets/js/main.js' | relative_url }}"></script>
</body>
</html>
```

### Example Include

Create `_includes/header.html`:

```html
<header class="site-header">
  <div class="container">
    <h1 class="site-title">
      <a href="{{ '/' | relative_url }}">{{ site.title }}</a>
    </h1>
    <nav class="site-nav">
      {% for item in site.data.navigation %}
        <a href="{{ item.link | relative_url }}">{{ item.name }}</a>
      {% endfor %}
    </nav>
  </div>
</header>
```

### Styles

Create `assets/css/main.scss`:

```scss
---
# Only the main Sass file needs front matter (the dashes are enough)
---

@import "variables";
@import "base";
@import "layout";
```

Create `_sass/_variables.scss`:

```scss
// Colors
$primary-color: #0066cc;
$text-color: #333;
$background-color: #fff;

// Spacing
$spacing-unit: 1rem;

// Typography
$base-font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
$base-font-size: 16px;
$base-line-height: 1.6;
```

## Testing Your Theme

### Create a Test Site

```bash
mkdir test-site
cd test-site
jekyll-ts new . --blank
```

### Link Your Theme Locally

In your theme directory:

```bash
npm link
```

In your test site directory:

```bash
npm link jekyll-theme-name
```

### Configure Test Site

Edit `_config.yml`:

```yaml
title: Test Site
theme: jekyll-theme-name
```

### Build and Test

```bash
jekyll-ts build
jekyll-ts serve
```

Visit `http://localhost:4000` to see your theme in action.

## Publishing Your Theme

### 1. Prepare for Publishing

- Write a comprehensive README.md
- Add a LICENSE file
- Include screenshots in your README
- Test with multiple sites
- Document all configuration options

### 2. Publish to npm

```bash
npm publish
```

### 3. Announce Your Theme

- Share on Twitter/social media
- Add to the Jekyll.js themes directory (coming soon)
- Create a demo site

## Theme Best Practices

### Configuration

Allow users to configure your theme via `_config.yml`:

```yaml
theme_settings:
  color_scheme: dark
  show_author: true
  enable_comments: false
```

Access these settings in your templates:

```liquid
{% if site.theme_settings.show_author %}
  <p class="author">By {{ page.author }}</p>
{% endif %}
```

### Responsive Design

Ensure your theme works on all devices:

```scss
// Mobile-first approach
.container {
  width: 100%;
  padding: 1rem;
  
  @media (min-width: 768px) {
    max-width: 720px;
    margin: 0 auto;
  }
  
  @media (min-width: 1024px) {
    max-width: 960px;
  }
}
```

### Accessibility

- Use semantic HTML (`<header>`, `<nav>`, `<main>`, `<footer>`)
- Include alt text for images
- Ensure sufficient color contrast
- Make navigation keyboard-accessible
- Use ARIA labels where appropriate

### Performance

- Minimize CSS and JavaScript
- Optimize images
- Use lazy loading for images
- Avoid excessive external dependencies

### Documentation

Include comprehensive documentation:

1. **Installation instructions**
2. **Configuration options**
3. **Customization guide**
4. **Troubleshooting tips**
5. **Examples and demos**

## Example Themes

Coming soon! Check back for official Jekyll.js themes:

- `jekyll-theme-minimal` - A clean, minimal theme
- `jekyll-theme-blog` - A full-featured blog theme
- `jekyll-theme-docs` - A documentation theme

## Theme Migration

### From Ruby Jekyll Themes

To migrate a Ruby Jekyll theme to Jekyll.js:

1. **Remove Gemfile dependencies** - Jekyll.js doesn't use Ruby gems
2. **Update asset paths** - Ensure paths work with Jekyll.js
3. **Test all features** - Verify layouts, includes, and Liquid tags work
4. **Update documentation** - Mention Jekyll.js compatibility

### Compatibility Notes

Most Jekyll themes should work with minimal changes. Key differences:

- **Plugins:** Ruby plugins won't work. Use TypeScript/JavaScript equivalents.
- **Asset pipeline:** Some advanced asset processing may differ.
- **Data files:** Theme `_data/` directories are supported and merged with site data.
- **Configuration:** Theme `_config.yml` provides defaults accessible via `getThemeDefaults()`.

## ThemeManager API Reference

The `ThemeManager` class provides programmatic access to theme features.

### Methods

#### `hasTheme(): boolean`
Returns `true` if a theme is configured for the site.

#### `getTheme(): ThemeConfig | null`
Returns the full theme configuration object, or `null` if no theme is configured.

#### `getThemeMetadata(): ThemeMetadata | null`
Returns theme metadata from `package.json`:

```typescript
interface ThemeMetadata {
  name: string;           // Package name
  version: string;        // Package version
  description?: string;   // Package description
  author?: string | { name: string; email?: string; url?: string };
  license?: string;       // License type
  homepage?: string;      // Homepage URL
  repository?: string | { type: string; url: string };
  keywords?: string[];    // Package keywords
}
```

#### `getThemeDefaults(): JekyllConfig | null`
Returns the theme's default configuration from `_config.yml`.

#### `getThemeDataDirectory(): string | null`
Returns the path to the theme's `_data/` directory, or `null` if it doesn't exist.

#### `getDataDirectories(): string[]`
Returns all data directories (site first, then theme).

#### `getThemeStaticFiles(siteSource: string): Array<{ sourcePath: string; relativePath: string }>`
Returns a list of theme asset files that should be copied to the build output (excluding files overridden by the site).

#### `resolveDataFile(dataPath: string): string | null`
Resolves a data file path, checking the site first, then the theme.

#### `resolveLayout(layoutName: string): string | null`
Resolves a layout file, checking the site first, then the theme.

#### `resolveInclude(includePath: string): string | null`
Resolves an include file, checking the site first, then the theme.

### Example Usage

```typescript
import { Site } from 'jekyll-ts';

// Create a site with theme
const site = new Site('/path/to/site', {
  theme: 'jekyll-theme-minimal'
});

const themeManager = site.themeManager;

// Check if theme is loaded
if (themeManager.hasTheme()) {
  // Get theme info
  const theme = themeManager.getTheme();
  console.log('Theme root:', theme?.root);
  
  // Get metadata from package.json
  const metadata = themeManager.getThemeMetadata();
  console.log('Theme:', metadata?.name, 'v' + metadata?.version);
  
  // Get default config from theme's _config.yml
  const defaults = themeManager.getThemeDefaults();
  console.log('Default author:', defaults?.author);
  
  // Get theme data directory
  const dataDir = themeManager.getThemeDataDirectory();
  if (dataDir) {
    console.log('Theme data at:', dataDir);
  }
}
```

## Getting Help

- **GitHub Issues:** Report bugs or request features
- **Discussions:** Ask questions and share themes
- **Documentation:** Read the full Jekyll.js docs

## Contributing

We welcome theme contributions! To add your theme to the official directory:

1. Ensure it follows best practices
2. Include comprehensive documentation
3. Test with multiple Jekyll.js versions
4. Submit a pull request to the themes directory

---

**Last Updated:** 2025-12-05  
**Maintained by:** Jekyll.js Team  
**License:** MIT
