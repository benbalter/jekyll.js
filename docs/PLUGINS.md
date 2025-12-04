# Plugins

Jekyll.js supports a rich plugin ecosystem that allows you to extend your site's functionality. Plugins can add custom Liquid tags, filters, generators, converters, and lifecycle hooks.

## Plugin Types

Jekyll.js supports three types of plugins:

| Type | Interface | Purpose |
|------|-----------|---------|
| **Basic Plugin** | `Plugin` | Registers Liquid tags and filters |
| **Generator Plugin** | `GeneratorPlugin` | Creates additional content during site generation |
| **Converter Plugin** | `ConverterPlugin` | Transforms content from one format to another |

Plugins can implement multiple interfaces to provide combined functionality.

## Built-in Plugins

Jekyll.js includes several built-in plugins that are compatible with their Ruby Jekyll equivalents:

| Plugin | Description |
|--------|-------------|
| `jekyll-seo-tag` | SEO meta tags and JSON-LD structured data |
| `jekyll-sitemap` | XML sitemap generation |
| `jekyll-feed` | Atom feed generation |
| `jekyll-jemoji` | Emoji support (`:smile:` → 😄) |
| `jekyll-github-metadata` | GitHub repository metadata |
| `jekyll-mentions` | @mention links to GitHub users |
| `jekyll-redirect-from` | Redirect pages |
| `jekyll-avatar` | GitHub avatar helper |

### Enabling Built-in Plugins

To enable plugins, add them to your `_config.yml`:

```yaml
plugins:
  - jekyll-seo-tag
  - jekyll-sitemap
  - jekyll-feed
```

### Using Built-in Plugins

#### jekyll-seo-tag

Add SEO meta tags to your pages:

```liquid
{% seo %}
```

Place this in your layout's `<head>` section. It generates:
- `<title>` tag
- Meta description
- Open Graph tags
- Twitter Card tags
- JSON-LD structured data

#### jekyll-feed

Add a feed link to your pages:

```liquid
{% feed_meta %}
```

This generates a `<link>` tag pointing to your Atom feed.

#### jekyll-jemoji

Simply use GitHub-style emoji codes in your content:

```markdown
I :heart: Jekyll.js! :rocket:
```

---

## npm Plugins

Jekyll.js supports loading custom plugins from npm packages, similar to Jekyll.rb's gem-based plugin ecosystem.

### Installing npm Plugins

1. **Install the plugin package:**

   ```bash
   npm install my-jekyll-plugin
   ```

   Or for scoped packages:

   ```bash
   npm install @myorg/jekyll-plugin
   ```

2. **Add the plugin to your `_config.yml`:**

   ```yaml
   plugins:
     - jekyll-seo-tag           # Built-in plugin
     - my-jekyll-plugin         # npm plugin
     - @myorg/jekyll-plugin     # Scoped npm plugin
   ```

3. **Build your site:**

   ```bash
   jekyll-ts build
   ```

### Plugin Resolution

Jekyll.js looks for npm plugins in the following locations (in order):

1. `node_modules/` in your site's directory
2. `node_modules/` in the current working directory
3. Node.js module resolution paths

### Creating npm Plugins

To create a Jekyll.js plugin, publish an npm package that exports a Plugin object.

#### Plugin Interface

```typescript
interface Plugin {
  /** Plugin name (e.g., 'my-jekyll-plugin') */
  name: string;

  /** Register the plugin with the renderer and site */
  register(renderer: Renderer, site: Site): void;
}
```

#### Example: CommonJS Plugin

```javascript
// index.js
module.exports = {
  name: 'my-jekyll-plugin',
  register(renderer, site) {
    // Register a custom Liquid filter
    renderer.registerFilter('shout', (input) => {
      return String(input).toUpperCase() + '!';
    });
  }
};
```

#### Example: ES Module Plugin

```javascript
// index.js
export default {
  name: 'my-jekyll-plugin',
  register(renderer, site) {
    // Register a custom Liquid tag
    renderer.getLiquid().registerTag('hello', {
      parse() {},
      render() {
        return 'Hello from my plugin!';
      }
    });
  }
};
```

#### Example: Class-based Plugin

```javascript
// index.js
class MyPlugin {
  constructor() {
    this.name = 'my-jekyll-plugin';
  }

  register(renderer, site) {
    // Access site configuration
    const siteName = site.config.title || 'My Site';
    
    // Register a filter that uses site data
    renderer.registerFilter('site_greeting', () => {
      return `Welcome to ${siteName}!`;
    });
  }
}

module.exports = MyPlugin;
```

#### Example: TypeScript Plugin

```typescript
// index.ts
import { Plugin, Renderer, Site } from 'jekyll-ts';

export class MyPlugin implements Plugin {
  name = 'my-jekyll-plugin';

  register(renderer: Renderer, site: Site): void {
    renderer.registerFilter('reverse_words', (input: string) => {
      return input.split(' ').reverse().join(' ');
    });
  }
}

export default new MyPlugin();
```

### Plugin Package Structure

```
my-jekyll-plugin/
├── index.js          # Main entry point
├── package.json
└── README.md
```

**package.json:**

```json
{
  "name": "my-jekyll-plugin",
  "version": "1.0.0",
  "main": "index.js",
  "keywords": ["jekyll", "jekyll-plugin", "jekyll-ts"],
  "peerDependencies": {
    "jekyll-ts": "^0.1.0"
  }
}
```

### Export Patterns

Jekyll.js supports multiple export patterns for flexibility:

| Pattern | Example |
|---------|---------|
| CommonJS default | `module.exports = { name, register }` |
| CommonJS class | `module.exports = MyPlugin` |
| ES Module default | `export default { name, register }` |
| Named export `plugin` | `export const plugin = { name, register }` |
| Named export `Plugin` | `export class Plugin { ... }` |

### Available APIs

Within the `register` function, you have access to:

#### Renderer

```javascript
register(renderer, site) {
  // Register a Liquid filter
  renderer.registerFilter('my_filter', (input, arg1, arg2) => {
    return transformedValue;
  });

  // Register a Liquid tag
  renderer.registerTag('my_tag', {
    parse(token) {
      // Parse tag arguments
      this.args = token.args;
    },
    render(ctx) {
      // Return rendered content
      return 'output';
    }
  });

  // Access the underlying Liquid engine
  const liquid = renderer.getLiquid();
}
```

#### Site

```javascript
register(renderer, site) {
  // Access site configuration
  const config = site.config;
  
  // Access site data
  const source = site.source;
  const destination = site.destination;
}
```

---

## Generator Plugins

Generator plugins create additional content during site generation, such as sitemaps, feeds, archive pages, or tag pages.

### Generator Interface

```typescript
interface GeneratorPlugin {
  /** Generator name (e.g., 'my-sitemap-generator') */
  name: string;

  /** Priority determines order (lower runs first). Default: 50 */
  priority?: number;

  /** Generate content for the site */
  generate(site: Site, renderer: Renderer): GeneratorResult | Promise<GeneratorResult> | void;
}

interface GeneratorResult {
  /** Files to write to the destination directory */
  files?: Array<{
    path: string;    // Relative path (e.g., 'sitemap.xml')
    content: string; // File content
  }>;
  /** Documents to add to the site for rendering (future) */
  documents?: Array<GeneratedDocument>;
}
```

### Priority Constants

```typescript
import { GeneratorPriority } from 'jekyll-ts';

GeneratorPriority.HIGH    // 10 - Runs early
GeneratorPriority.NORMAL  // 50 - Default
GeneratorPriority.LOW     // 90 - Runs late
GeneratorPriority.LOWEST  // 100 - Runs last (e.g., sitemap)
```

### Example: Archive Generator

```javascript
// archive-generator.js
module.exports = {
  name: 'archive-generator',
  priority: 90, // Run late to have all posts available
  
  generate(site, renderer) {
    // Group posts by year
    const postsByYear = {};
    for (const post of site.posts) {
      const year = post.date.getFullYear();
      if (!postsByYear[year]) {
        postsByYear[year] = [];
      }
      postsByYear[year].push(post);
    }
    
    // Generate archive page
    let content = '# Archive\n\n';
    for (const [year, posts] of Object.entries(postsByYear).sort().reverse()) {
      content += `## ${year}\n\n`;
      for (const post of posts) {
        content += `- [${post.title}](${post.url})\n`;
      }
      content += '\n';
    }
    
    return {
      files: [
        { path: 'archive/index.html', content: `<html><body>${content}</body></html>` }
      ]
    };
  }
};
```

### Example: Custom Sitemap Generator

```typescript
// custom-sitemap.ts
import { GeneratorPlugin, Site, Renderer, GeneratorPriority } from 'jekyll-ts';

export class CustomSitemapPlugin implements GeneratorPlugin {
  name = 'custom-sitemap';
  priority = GeneratorPriority.LOWEST;
  
  generate(site: Site, renderer: Renderer) {
    const urls = site.pages
      .filter(p => p.published)
      .map(p => `<url><loc>${site.config.url}${p.url}</loc></url>`)
      .join('\n');
    
    return {
      files: [{
        path: 'custom-sitemap.xml',
        content: `<?xml version="1.0"?>\n<urlset>\n${urls}\n</urlset>`
      }]
    };
  }
}

export default new CustomSitemapPlugin();
```

---

## Converter Plugins

Converter plugins transform content from one format to another (e.g., Textile to HTML, AsciiDoc to HTML).

### Converter Interface

```typescript
interface ConverterPlugin {
  /** Converter name */
  name: string;
  
  /** Priority for matching (lower = checked first). Default: 50 */
  priority?: number;
  
  /** Check if this converter handles the file extension */
  matches(ext: string): boolean;
  
  /** Get output file extension */
  outputExt(ext: string): string;
  
  /** Convert content to output format */
  convert(content: string, document: Document, site: Site): string | Promise<string>;
}
```

### Priority Constants

```typescript
import { ConverterPriority } from 'jekyll-ts';

ConverterPriority.HIGH   // 10 - Checked first
ConverterPriority.NORMAL // 50 - Default
ConverterPriority.LOW    // 90 - Fallback converters
```

### Example: Custom Markdown Converter

```javascript
// custom-markdown.js
const marked = require('marked');

module.exports = {
  name: 'custom-markdown',
  priority: 10, // Override built-in markdown
  
  matches(ext) {
    return ['.md', '.markdown'].includes(ext.toLowerCase());
  },
  
  outputExt(ext) {
    return '.html';
  },
  
  convert(content, document, site) {
    // Use custom markdown processor with site-specific options
    return marked.parse(content, {
      gfm: true,
      breaks: site.config.kramdown?.hard_wrap ?? false
    });
  }
};
```

### Example: Textile Converter

```javascript
// textile-converter.js
const textile = require('textile-js');

module.exports = {
  name: 'textile-converter',
  
  matches(ext) {
    return ext === '.textile';
  },
  
  outputExt(ext) {
    return '.html';
  },
  
  convert(content, document, site) {
    return textile(content);
  }
};
```

---

## Plugin Hooks

Hooks allow plugins to tap into the site build lifecycle at specific points.

### Available Hooks

| Hook | Context | Description |
|------|---------|-------------|
| `site:after_init` | Site | After site initialization |
| `site:after_reset` | Site | After site is reset (for rebuilds) |
| `site:pre_render` | Site | Before rendering begins |
| `site:post_render` | Site | After all rendering is complete |
| `site:post_write` | Site | After all files are written |
| `pages:post_init` | Site | After pages are initialized |
| `posts:post_init` | Site | After posts are initialized |
| `documents:pre_render` | Document | Before a document is rendered |
| `documents:post_render` | Document | After a document is rendered |
| `documents:post_write` | Document | After a document is written |

### Registering Hooks

```javascript
import { Hooks, PluginHooks } from 'jekyll-ts';

// Method 1: Direct registration
Hooks.register('site', 'post_render', (context) => {
  console.log(`Rendered ${context.site.posts.length} posts`);
}, 'my-plugin', 50);

// Method 2: Using PluginHooks helper
const hooks = new PluginHooks('my-plugin');
hooks.onSitePostRender((context) => {
  console.log('Site rendering complete!');
});
```

### Hook Priorities

Hooks are executed in priority order (lower numbers run first):

```javascript
// Run early (priority 10)
hooks.onSitePreRender(callback, 10);

// Run at default time (priority 50)
hooks.onSitePreRender(callback);

// Run late (priority 90)
hooks.onSitePreRender(callback, 90);
```

### Hook Contexts

#### Site Hooks

```typescript
interface SiteHookContext {
  site: Site;
  renderer?: Renderer;
}
```

#### Document Hooks

```typescript
interface DocumentHookContext {
  document: Document;
  site: Site;
  renderer: Renderer;
  content?: string;    // Available in post_render
  outputPath?: string; // Available in post_write
}
```

### Example: Analytics Hook

```javascript
// analytics-plugin.js
const { PluginHooks } from 'jekyll-ts';

module.exports = {
  name: 'analytics-plugin',
  
  register(renderer, site) {
    const hooks = new PluginHooks('analytics-plugin');
    
    // Count documents after posts are loaded
    hooks.onPostsPostInit((ctx) => {
      console.log(`Found ${ctx.site.posts.length} posts`);
    });
    
    // Track rendering time
    let startTime;
    hooks.onSitePreRender(() => {
      startTime = Date.now();
    }, 10);
    
    hooks.onSitePostRender(() => {
      console.log(`Rendering took ${Date.now() - startTime}ms`);
    }, 90);
  }
};
```

### Example: Content Transformation Hook

```javascript
// minify-plugin.js
const { PluginHooks } = require('jekyll-ts');
const minifyHtml = require('html-minifier').minify;

module.exports = {
  name: 'minify-plugin',
  
  register(renderer, site) {
    const hooks = new PluginHooks('minify-plugin');
    
    // Minify HTML after each document is rendered
    hooks.onDocumentPostRender((ctx) => {
      if (ctx.document.extname === '.html') {
        ctx.content = minifyHtml(ctx.content, {
          collapseWhitespace: true
        });
      }
    });
  }
};
```

---

## Combining Plugin Types

A single plugin can implement multiple interfaces:

```typescript
import { Plugin, GeneratorPlugin, Renderer, Site, GeneratorResult } from 'jekyll-ts';

export class MyFullPlugin implements Plugin, GeneratorPlugin {
  name = 'my-full-plugin';
  priority = 50;
  
  // Plugin interface - register Liquid tags/filters
  register(renderer: Renderer, site: Site) {
    renderer.registerFilter('my_filter', (input) => input.toUpperCase());
  }
  
  // GeneratorPlugin interface - create additional files
  generate(site: Site, renderer: Renderer): GeneratorResult {
    return {
      files: [
        { path: 'generated.txt', content: 'Hello from generator!' }
      ]
    };
  }
}

export default new MyFullPlugin();
```

---

## Configuration

### Plugin Configuration Options

Some plugins accept configuration in `_config.yml`:

```yaml
# Enable plugins
plugins:
  - jekyll-feed
  - jekyll-sitemap

# Plugin-specific configuration
feed:
  path: /blog/feed.xml
  posts_limit: 20
```

### Safe Mode

When running in safe mode (`--safe` flag), custom plugins may be restricted:

```bash
jekyll-ts build --safe
```

> **Note**: Safe mode is not fully implemented yet. Custom plugins may still execute.

---

## Troubleshooting

### Plugin Not Found

If you see an error like "npm package 'my-plugin' not found":

1. Verify the package is installed:
   ```bash
   npm list my-plugin
   ```

2. Check that you're in the correct directory:
   ```bash
   pwd
   ls node_modules/
   ```

3. Ensure the plugin name in `_config.yml` matches the package name exactly.

### Plugin Not Loading

If a plugin is installed but not working:

1. Check that the plugin exports a valid `Plugin` object with `name` and `register` properties.

2. Enable verbose output to see plugin loading:
   ```bash
   jekyll-ts build --verbose
   ```

3. Verify the plugin is listed in your `_config.yml` under `plugins:`.

### Invalid Plugin Structure

If you see "does not export a valid Jekyll.js plugin":

- Ensure your plugin exports an object with:
  - `name` (string): The plugin identifier
  - `register` (function): The registration function

---

## Best Practices

### For Plugin Authors

1. **Use descriptive names**: Prefix with `jekyll-` or your organization scope.

2. **Document your plugin**: Include usage examples in README.md.

3. **Handle errors gracefully**: Don't crash the build on non-critical errors.

4. **Use peer dependencies**: Declare `jekyll-ts` as a peer dependency.

5. **Test with multiple sites**: Ensure compatibility with various configurations.

### For Plugin Users

1. **Pin versions**: Use specific versions in package.json for reproducible builds.

2. **Review plugins**: Check the source code of community plugins before use.

3. **Keep plugins updated**: Regularly update to get bug fixes and improvements.

---

## Migration from Ruby Jekyll

### Gem Plugins → npm Plugins

| Ruby Jekyll | Jekyll.js Equivalent |
|-------------|---------------------|
| `gem 'jekyll-seo-tag'` | Built-in (add to `plugins:` array) |
| `gem 'jekyll-sitemap'` | Built-in (add to `plugins:` array) |
| `gem 'jekyll-feed'` | Built-in (add to `plugins:` array) |
| `gem 'jekyll-jemoji'` | Built-in (add to `plugins:` array) |
| Custom Ruby plugin | Rewrite as npm package |

### Key Differences

1. **No Gemfile needed**: Plugins are managed via npm/package.json.

2. **JavaScript/TypeScript**: Plugins must be written in JavaScript or TypeScript, not Ruby.

3. **Different API**: The renderer and site APIs differ from Ruby Jekyll.

4. **Package management**: Use npm instead of Bundler.

---

## See Also

- [FEATURES.md](./FEATURES.md) - Complete feature status
- [PARITY.md](./PARITY.md) - Ruby Jekyll compatibility
- [README.md](../README.md) - Getting started guide
