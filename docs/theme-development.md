# Theme Development Guide

This guide explains how to create and use themes in Jekyll.js.

## What is a Theme?

A Jekyll.js theme is an npm package that provides:
- **Layouts** (`_layouts/`) - Template files for pages and posts
- **Includes** (`_includes/`) - Reusable template components
- **Sass stylesheets** (`_sass/`) - Stylesheet partials
- **Assets** (`assets/`) - CSS, JavaScript, images, fonts

Themes allow you to package and distribute site designs, making it easy for users to apply a consistent look and feel to their Jekyll.js sites.

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
3. **Add custom styles:** Create your own stylesheets in `assets/`

The theme's original files remain untouched, and your customizations are applied on top.

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
├── assets/
│   ├── css/
│   │   └── main.scss
│   ├── js/
│   │   └── main.js
│   └── images/
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
  "files": [
    "_layouts",
    "_includes",
    "_sass",
    "assets"
  ]
}
```

**Important:** Include the `files` field to ensure theme assets are published to npm.

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
- **Sass processing:** Currently planned, not yet implemented (v0.2.0).

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

**Last Updated:** 2025-12-04  
**Maintained by:** Jekyll.js Team  
**License:** MIT
