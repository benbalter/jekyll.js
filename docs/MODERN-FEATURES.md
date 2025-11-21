# Modern JavaScript Features in Jekyll.js

This document describes the modern JavaScript packages and features added to Jekyll.js to enhance functionality while maintaining backward compatibility with Jekyll (Ruby).

## Overview

Jekyll.js leverages modern JavaScript packages to provide enhanced functionality:

1. **Syntax Highlighting with Shiki** - Modern, fast, VSCode-powered syntax highlighting
2. **Image Optimization with Sharp** - High-performance image processing and optimization
3. **Configuration Validation with Zod** - Runtime type validation with TypeScript-first schemas

All features are **opt-in** and do not affect existing Jekyll sites unless explicitly enabled in configuration.

## Syntax Highlighting with Shiki

Shiki is a modern syntax highlighter powered by the same engine as VS Code (TextMate grammars).

### Features

- Accurate, beautiful syntax highlighting
- 100+ languages supported out of the box
- Multiple themes available
- Zero runtime dependencies (pre-generated HTML)
- Perfect color accuracy

### Usage

```typescript
import { highlightCode, initHighlighter } from 'jekyll-ts/plugins/syntax-highlighting';

// Initialize once (optional - will auto-initialize on first use)
await initHighlighter({
  theme: 'github-light',
});

// Highlight code
const html = await highlightCode(
  'const x = 1;',
  'javascript'
);
```

### Configuration

Enable in `_config.yml`:

```yaml
modern:
  syntaxHighlighting:
    enabled: true
    theme: github-light
    showLineNumbers: true
```

### Available Themes

- `github-light` (default)
- `github-dark`
- `monokai`
- `nord`
- `one-dark-pro`
- `solarized-light`
- `solarized-dark`
- `dracula`
- `material-theme`
- `vitesse-light`
- `vitesse-dark`

### Supported Languages

Over 100 languages including:
- JavaScript, TypeScript
- Python, Ruby, Go, Rust
- Java, C, C++, C#
- HTML, CSS, SCSS
- JSON, YAML, Markdown
- Bash, Shell, SQL
- And many more...

## Image Optimization with Sharp

Sharp is a high-performance Node.js image processing library.

### Features

- Resize, crop, and transform images
- Convert between formats (JPEG, PNG, WebP, AVIF)
- Optimize file sizes
- Generate responsive images
- Extract metadata

### Usage

```typescript
import { optimizeImage } from 'jekyll-ts/plugins/image-optimization';

// Optimize an image
const result = await optimizeImage('input.jpg', 'output.jpg', {
  quality: 80,
  width: 1200,
  generateWebP: true,
  generateAVIF: true,
  responsiveSizes: [400, 800, 1200],
});

console.log(`Reduced size by ${result.reduction}%`);
```

### Configuration

Enable in `_config.yml`:

```yaml
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

### Supported Formats

- JPEG (input and output)
- PNG (input and output)
- WebP (input and output)
- AVIF (input and output)
- GIF (input and output)
- TIFF (input and output)

### Benefits

- **Smaller files**: Reduce image sizes by 30-70%
- **Modern formats**: Automatic WebP/AVIF generation
- **Responsive images**: Generate multiple sizes automatically
- **Fast processing**: Uses native libraries for speed

## Configuration Validation with Zod

Zod provides TypeScript-first schema validation for runtime type checking.

### Features

- Runtime type validation
- Type inference from schemas
- Detailed error messages
- Composable schemas

### Usage

```typescript
import { validateJekyllConfig, mergeAndValidateConfig } from 'jekyll-ts/config/validation';

// Validate a configuration
const result = validateJekyllConfig(config);

if (result.success) {
  // result.data is typed and validated
  console.log(result.data.title);
} else {
  // result.errors contains detailed validation errors
  console.error(result.errorMessage);
}
```

### Benefits

- **Type safety**: Catch configuration errors at runtime
- **Better errors**: Clear, actionable error messages
- **IntelliSense**: Full TypeScript autocomplete support
- **Validation**: Ensure config values are valid (e.g., port numbers in range)

## Backward Compatibility

All modern features:

- ✅ Are **opt-in** via configuration
- ✅ Do **not** affect existing Jekyll sites
- ✅ Maintain **default behavior** matching Jekyll (Ruby)
- ✅ Work **alongside** existing features
- ✅ Are **fully tested** and documented

Existing Jekyll sites continue to work without modification.

## Performance

Modern packages are chosen for both functionality and performance:

- **Shiki**: Pre-generates HTML, zero runtime overhead
- **Sharp**: Native libraries, 4-5x faster than JavaScript alternatives
- **Zod**: Minimal runtime overhead, tree-shakeable

## Dependencies

The following modern packages are included:

```json
{
  "shiki": "^1.22.0",    // Syntax highlighting
  "sharp": "^0.33.5",    // Image optimization
  "zod": "^3.24.1"       // Schema validation
}
```

All packages are:
- Well-maintained with active development
- Used by thousands of projects
- Battle-tested in production
- TypeScript-first with excellent type definitions

## Examples

### Example 1: Syntax Highlighting in a Plugin

```typescript
import { highlightCode } from 'jekyll-ts/plugins/syntax-highlighting';

async function renderCodeBlock(code: string, language: string) {
  return await highlightCode(code, language, {
    theme: 'github-dark',
  });
}
```

### Example 2: Image Optimization in Build Process

```typescript
import { optimizeImage } from 'jekyll-ts/plugins/image-optimization';
import { glob } from 'glob';

async function optimizeAllImages() {
  const images = await glob('assets/images/*.{jpg,png}');
  
  for (const imagePath of images) {
    await optimizeImage(imagePath, imagePath, {
      quality: 85,
      generateWebP: true,
    });
  }
}
```

### Example 3: Config Validation

```typescript
import { validateJekyllConfig } from 'jekyll-ts/config/validation';

const config = {
  title: 'My Site',
  port: 4000,
  modern: {
    syntaxHighlighting: {
      enabled: true,
    },
  },
};

const result = validateJekyllConfig(config);
if (!result.success) {
  console.error('Invalid config:', result.errorMessage);
  process.exit(1);
}
```

## Future Enhancements

Potential future additions:

- PDF generation with modern libraries
- Advanced markdown features (math, diagrams)
- Asset bundling and minification
- Modern image formats (JXL)
- Service worker generation
- Progressive web app features

## Resources

- **Shiki**: https://shiki.matsu.io/
- **Sharp**: https://sharp.pixelplumbing.com/
- **Zod**: https://zod.dev/

## Contributing

To add new modern features:

1. Choose well-maintained, popular packages
2. Ensure TypeScript support
3. Make features opt-in via configuration
4. Maintain backward compatibility
5. Add comprehensive tests
6. Document usage and benefits

## Support

For questions or issues related to modern features:

- Open an issue on GitHub
- Include your configuration
- Provide reproduction steps
- Check documentation first

## License

All modern features are part of Jekyll.js and follow the same MIT license.
