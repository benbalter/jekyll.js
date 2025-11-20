# Configuration Module

This module handles loading, parsing, and validation of Jekyll `_config.yml` files.

## Features

- **YAML Parsing**: Uses `js-yaml` for parsing configuration files
- **Default Values**: Provides Jekyll-compatible defaults for all settings
- **Validation**: Validates configuration and provides helpful warnings/errors
- **Compatibility**: Strict compatibility with Jekyll 4.x configuration format

## Usage

### Loading Configuration

```typescript
import { loadConfig } from './config';

// Load from default location (_config.yml in current directory)
const config = loadConfig();

// Load from specific path
const config = loadConfig('/path/to/_config.yml');

// Load with verbose output
const config = loadConfig('_config.yml', true);
```

### Validating Configuration

```typescript
import { validateConfig, printValidation } from './config';

const config = loadConfig('_config.yml');
const validation = validateConfig(config);

// Print validation results
printValidation(validation, true);

if (!validation.valid) {
  console.error('Configuration has errors');
  process.exit(1);
}
```

### Getting Defaults

```typescript
import { getDefaultConfig } from './config';

const defaults = getDefaultConfig('/path/to/site');
```

### Merging with Defaults

```typescript
import { mergeWithDefaults } from './config';

const userConfig = {
  title: 'My Site',
  port: 3000,
};

const mergedConfig = mergeWithDefaults(userConfig, '/path/to/site');
// mergedConfig contains both user settings and defaults
```

## Configuration Interface

The `JekyllConfig` interface supports all Jekyll 4.x configuration options:

### Site Settings
- `title`, `description`, `url`, `baseurl`
- `email`

### Build Settings
- `source`, `destination`
- `collections_dir`, `plugins_dir`, `layouts_dir`, `data_dir`, `includes_dir`

### Content Rendering
- `markdown`, `highlighter`
- `incremental`

### Collections
- `collections`: Object defining collections and their options

### Processing
- `exclude`, `include`, `keep_files`
- `safe`, `future`, `unpublished`, `show_drafts`

### Serving
- `port`, `host`
- `livereload`, `livereload_port`
- `watch`, `force_polling`

### Liquid Options
- `liquid.error_mode`: 'warn' | 'strict' | 'lax'
- `liquid.strict_filters`
- `liquid.strict_variables`

### Other Options
- `permalink`: Permalink pattern
- `timezone`: Site timezone
- `plugins`: Array of plugin names
- `defaults`: Front matter defaults
- And more...

## Validation

The validation system checks for:

### Errors (Configuration is invalid)
- Invalid port number (must be 1-65535)
- Invalid liquid error mode
- Invalid timezone format

### Warnings (Configuration works but with limitations)
- Unsupported markdown processor
- Unsupported syntax highlighter
- Ruby plugins (must be reimplemented in TypeScript)
- Pagination (not yet implemented)
- LSI (not supported)
- Safe mode (not fully implemented)

## Default Values

The module provides Jekyll-compatible defaults:

```typescript
{
  source: '.',
  destination: '_site',
  markdown: 'kramdown',
  highlighter: 'rouge',
  port: 4000,
  host: 'localhost',
  baseurl: '',
  exclude: [
    '.sass-cache',
    '.jekyll-cache',
    'gemfiles',
    'Gemfile',
    'Gemfile.lock',
    'node_modules',
    'vendor/bundle/',
    'vendor/cache/',
    'vendor/gems/',
    'vendor/ruby/',
  ],
  // ... and many more
}
```

## Examples

### Example 1: Basic Site Configuration

```yaml
# _config.yml
title: My Awesome Blog
description: A blog about awesome things
url: https://example.com
baseurl: /blog

markdown: kramdown
highlighter: rouge

exclude:
  - drafts
  - temp
```

```typescript
const config = loadConfig('_config.yml');
const validation = validateConfig(config);
printValidation(validation);

console.log(config.title); // "My Awesome Blog"
console.log(config.port); // 4000 (default)
```

### Example 2: With Collections

```yaml
# _config.yml
title: Recipe Site

collections:
  recipes:
    output: true
    permalink: /recipes/:name/
  authors:
    output: false
```

```typescript
const config = loadConfig('_config.yml');
console.log(config.collections?.recipes.output); // true
```

### Example 3: Handling Warnings

```yaml
# _config.yml
title: My Site
markdown: redcarpet  # Not fully supported
plugins:
  - jekyll-paginate  # Not yet implemented
  - jekyll-seo-tag   # Supported!
```

```typescript
const config = loadConfig('_config.yml');
const validation = validateConfig(config);

// Will show warnings:
// - Markdown processor "redcarpet" is not fully supported
// - Plugin "jekyll-paginate" is not supported
printValidation(validation, true);

// But validation.valid is still true (warnings, not errors)
```

## Integration with CLI

The configuration module is integrated with CLI commands:

```typescript
import { loadConfig, validateConfig, printValidation } from '../../config';

const config = loadConfig(options.config, options.verbose);
const validation = validateConfig(config);
printValidation(validation, options.verbose);

if (!validation.valid) {
  throw new Error('Configuration validation failed');
}

// Use config...
```

## Supported Plugins

Currently supported plugins (v1):
- `jekyll-seo-tag`
- `jekyll-sitemap`
- `jekyll-feed`

Ruby plugins are not supported and must be reimplemented in TypeScript.

## Testing

Run the test suite:

```bash
npm test src/config
```

All configuration loading, validation, and merging functionality is covered by comprehensive unit tests.
