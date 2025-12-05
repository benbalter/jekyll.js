# Liquid Template Rendering

The Renderer class provides Jekyll-compatible Liquid template rendering for jekyll.js. It wraps the [liquidjs](https://liquidjs.com/) library and adds Jekyll-specific filters, tags, and functionality.

## Basic Usage

```typescript
import { Site, Renderer, Document } from 'jekyll-ts';

// Create a site and renderer
const site = new Site('./my-site');
await site.read();

const renderer = new Renderer(site);

// Render a simple template
const output = await renderer.render('Hello {{ name }}!', { name: 'World' });
// Output: "Hello World!"

// Render a document with layout
const doc = site.pages[0];
const html = await renderer.renderDocument(doc);
```

## Configuration

The Renderer accepts optional configuration:

```typescript
const renderer = new Renderer(site, {
  root: '/path/to/templates',        // Root directory for templates
  layoutsDir: '/path/to/layouts',    // Layout directory
  includesDir: '/path/to/includes',  // Includes directory
  strictVariables: false,             // Throw on undefined variables
  strictFilters: false,               // Throw on undefined filters
});
```

## Jekyll Filters

The Renderer includes the following Jekyll-compatible filters:

### Date Filters

All date filters use the `date-fns` library for reliable date formatting:

- `date_to_xmlschema` - Format as ISO 8601 (e.g., `2024-01-15T12:00:00.000Z`)
- `date_to_rfc822` - Format as RFC 822 (e.g., `Mon, 15 Jan 2024 12:00:00 GMT`)
- `date_to_string` - Short format (e.g., `15 Jan 2024`)
- `date_to_long_string` - Long format (e.g., `15 January 2024`)

Example:
```liquid
{{ page.date | date_to_string }}
```

### URL Filters

- `relative_url` - Prepend baseurl (e.g., `/about` → `/blog/about`)
- `absolute_url` - Prepend full site URL (e.g., `/about` → `https://example.com/blog/about`)

Example:
```liquid
<link rel="stylesheet" href="{{ '/assets/style.css' | relative_url }}">
```

### Array Filters

- `where` - Filter array by property value
- `where_exp` - Filter array by expression (simplified implementation)
- `group_by` - Group array elements by property
- `group_by_exp` - Group by expression (simplified implementation)
- `array_to_sentence_string` - Convert array to sentence

Example:
```liquid
{% assign published = site.posts | where: "published", true %}
{% assign groups = site.posts | group_by: "category" %}
{{ tags | array_to_sentence_string }}
```

### String Filters

- `xml_escape` - Escape XML special characters
- `cgi_escape` - URL encode
- `uri_escape` - URI encode
- `slugify` - Convert to URL-friendly slug (using `slugify` library)
- `smartify` - Convert to smart quotes and dashes
- `number_of_words` - Count words
- `markdownify` - Convert markdown to HTML (using `markdown-it` library)
- `jsonify` - Convert to JSON
- `inspect` - Debug output (formatted JSON)

Example:
```liquid
{{ post.title | slugify }}
{{ content | xml_escape }}
{{ data | jsonify }}
```

## Jekyll Tags

The Renderer includes the following Jekyll-compatible tags:

### Include Tag

Use the built-in `include` tag to include partials from the `_includes` directory:

```liquid
{% include header.html %}
{% include footer.html title="My Footer" %}
```

### Include Relative Tag

Include a file relative to the current file (not from `_includes`):

```liquid
{% include_relative ../shared/sidebar.html %}
{% include_relative ./fragments/metadata.md %}
```

This is useful for including files that are organized alongside your content rather than in the `_includes` directory.

### Raw Tag

Disable Liquid processing for a block of content (built into liquidjs):

```liquid
{% raw %}
{{ This will not be processed }}
{% if true %}This will not be evaluated{% endif %}
{% endraw %}
```

### Highlight Tag

Wrap code in syntax highlighting markup:

```liquid
{% highlight javascript %}
const hello = 'world';
{% endhighlight %}
```

### Link Tag

Link to any page, post, collection document, or static file by its path relative to the site source:

```liquid
{% link about.md %}
{% link _posts/2024-01-15-my-post.md %}
{% link assets/images/logo.png %}
{% link _projects/my-project.md %}
```

The `link` tag will resolve the path to the document's URL. It throws an error if the file doesn't exist, helping you catch broken links during the build.

### Post URL Tag

Generate post URLs using the post identifier (date-slug format without extension):

```liquid
{% post_url 2024-01-15-my-post %}
```

For posts in subdirectories within `_posts/`:

```liquid
{% post_url tutorials/2024-02-20-getting-started %}
```

The `post_url` tag will resolve to the post's full permalink URL based on your site's permalink configuration.

## Extending the Renderer

### Custom Filters

Register custom filters for your plugins:

```typescript
renderer.registerFilter('reverse', (str: string) => {
  return str.split('').reverse().join('');
});
```

Use in templates:
```liquid
{{ "hello" | reverse }}
```

### Custom Tags

Register custom tags:

```typescript
renderer.registerTag('mytag', {
  parse(token: any) {
    this.args = token.args;
  },
  render: function(ctx: any) {
    return `Custom output: ${this.args}`;
  }
});
```

Use in templates:
```liquid
{% mytag argument %}
```

### Advanced Usage

Get direct access to the liquidjs instance for advanced customization:

```typescript
const liquid = renderer.getLiquid();

// Use liquidjs API directly
liquid.registerFilter('custom', ...);
liquid.registerTag('custom', ...);
```

## Document Rendering

The Renderer can render full documents with layouts:

```typescript
// Document with layout
const doc = new Document(filePath, sourcePath, DocumentType.PAGE);
const html = await renderer.renderDocument(doc);
```

The renderer:
1. Renders the document content with Liquid
2. Wraps content in the specified layout (if any)
3. Recursively applies parent layouts
4. Provides `page` and `site` context to templates

## Context Variables

Templates have access to:

- `page` - Current page/document data
  - `page.title` - Document title
  - `page.date` - Document date
  - `page.url` - Document URL
  - `page.content` - Rendered content
  - `page.categories` - Document categories
  - `page.tags` - Document tags
  - All front matter variables

- `site` - Site configuration and data
  - `site.config` - Site configuration
  - `site.pages` - All pages
  - `site.posts` - All posts
  - `site.collections` - All collections

Example:
```liquid
<h1>{{ page.title }}</h1>
<time>{{ page.date | date_to_string }}</time>

<p>Site: {{ site.config.title }}</p>
<p>Total posts: {{ site.posts.size }}</p>
```

## Plugin Development

Plugins can extend the Renderer by accessing it through the Site:

```typescript
export class MyPlugin {
  apply(site: Site, renderer: Renderer): void {
    // Add custom filter
    renderer.registerFilter('my_filter', (input: string) => {
      return input.toUpperCase();
    });

    // Add custom tag
    renderer.registerTag('my_tag', {
      parse(token: any) {
        // Parse tag arguments
      },
      render: function(ctx: any) {
        // Render tag output
        return 'output';
      }
    });
  }
}
```

## Compatibility

The Renderer aims for compatibility with Jekyll 4.x Liquid templates. Most common filters and tags are supported, but some advanced features may have simplified implementations or be planned for future releases.

### Fully Supported
- All date filters
- URL filters (relative_url, absolute_url)
- Array filters (where, where_exp, group_by, group_by_exp)
- String manipulation filters (including `markdownify` using `markdown-it`)
- Include tag
- Include relative tag
- Raw tag (via liquidjs)
- Highlight tag
- Link tag (pages, posts, collections, static files)
- Post URL tag (with subdirectory support)
- Layout rendering

### Planned
- More Jekyll tags (e.g., `gist`, `figure`)
- Additional filters as needed

> **Note**: Pagination is fully supported. See the paginator object documentation in [PARITY.md](./PARITY.md).

## Performance

The Renderer uses liquidjs caching in production mode (when `NODE_ENV=production`). This significantly improves rendering performance by caching parsed templates.

## Error Handling

By default, the Renderer operates in lenient mode:
- Undefined variables render as empty strings
- Undefined filters raise errors
- Missing layouts are silently ignored

For strict mode, configure the renderer:

```typescript
const renderer = new Renderer(site, {
  strictVariables: true,  // Throw on undefined variables
  strictFilters: true,    // Throw on undefined filters
});
```

## Best Practices

1. **Register filters/tags early** - Register custom filters and tags before rendering documents
2. **Use strict mode in development** - Catch template errors early
3. **Cache renderer instances** - Reuse renderer instances across multiple renders
4. **Leverage site context** - Access site data through the `site` variable in templates
5. **Test custom filters** - Write tests for custom filters and tags

## Examples

See the test file `src/core/__tests__/Renderer.test.ts` for comprehensive examples of using the Renderer.
