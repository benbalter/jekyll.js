import { SassProcessor } from '../SassProcessor';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import * as os from 'os';

describe('SassProcessor', () => {
  // Use a truly isolated temp directory for each test
  let testDir: string;
  let sassDir: string;

  beforeEach(() => {
    // Create unique test directories for each test
    testDir = join(
      os.tmpdir(),
      'jekyll-ts-sass-test-' + Date.now() + '-' + Math.random().toString(36).slice(2)
    );
    sassDir = join(testDir, '_sass');
    mkdirSync(testDir, { recursive: true });
    mkdirSync(sassDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('constructor', () => {
    it('should create a SassProcessor with default configuration', () => {
      const processor = new SassProcessor({
        source: testDir,
        config: {},
      });

      expect(processor).toBeDefined();
      expect(processor.getSassDir()).toBe(join(testDir, '_sass'));
    });

    it('should respect custom sass_dir configuration', () => {
      const processor = new SassProcessor({
        source: testDir,
        config: {
          sass: {
            sass_dir: 'custom_sass',
          },
        },
      });

      expect(processor.getSassDir()).toBe(join(testDir, 'custom_sass'));
    });

    it('should respect load_paths configuration', () => {
      const processor = new SassProcessor({
        source: testDir,
        config: {
          sass: {
            load_paths: ['vendor/scss', 'node_modules/bootstrap/scss'],
          },
        },
      });

      const loadPaths = processor.getLoadPaths();
      expect(loadPaths).toContain(join(testDir, '_sass'));
      expect(loadPaths).toContain(join(testDir, 'vendor/scss'));
      expect(loadPaths).toContain(join(testDir, 'node_modules/bootstrap/scss'));
    });

    it('should default to empty load_paths when not configured', () => {
      const processor = new SassProcessor({
        source: testDir,
        config: {},
      });

      const loadPaths = processor.getLoadPaths();
      // Should only have the default _sass directory
      expect(loadPaths).toHaveLength(1);
      expect(loadPaths).toContain(join(testDir, '_sass'));
    });
  });

  describe('isSassFile', () => {
    let processor: SassProcessor;

    beforeEach(() => {
      processor = new SassProcessor({
        source: testDir,
        config: {},
      });
    });

    it('should return true for .scss files', () => {
      expect(processor.isSassFile('style.scss')).toBe(true);
      expect(processor.isSassFile('/path/to/style.scss')).toBe(true);
    });

    it('should return true for .sass files', () => {
      expect(processor.isSassFile('style.sass')).toBe(true);
      expect(processor.isSassFile('/path/to/style.sass')).toBe(true);
    });

    it('should return false for other file types', () => {
      expect(processor.isSassFile('style.css')).toBe(false);
      expect(processor.isSassFile('style.md')).toBe(false);
      expect(processor.isSassFile('style.html')).toBe(false);
    });
  });

  describe('process', () => {
    let processor: SassProcessor;

    beforeEach(() => {
      processor = new SassProcessor({
        source: testDir,
        config: {},
      });
    });

    it('should compile basic SCSS', () => {
      const scss = `
$color: #333;
body { color: $color; }
      `;
      const testFile = join(testDir, 'test.scss');
      writeFileSync(testFile, scss);

      const css = processor.process(testFile, scss);

      expect(css).toContain('body');
      expect(css).toContain('color: #333');
    });

    it('should compile SCSS with imports from _sass directory', () => {
      // Create a partial in _sass
      const partialContent = '$primary: #007bff;';
      writeFileSync(join(sassDir, '_variables.scss'), partialContent);

      // Create main SCSS file
      const mainScss = `
@import "variables";
.button { background: $primary; }
      `;
      const testFile = join(testDir, 'main.scss');
      writeFileSync(testFile, mainScss);

      const css = processor.process(testFile, mainScss);

      expect(css).toContain('.button');
      expect(css).toContain('background: #007bff');
    });

    it('should handle nested selectors', () => {
      const scss = `
.parent {
  color: red;
  .child {
    color: blue;
  }
}
      `;
      const testFile = join(testDir, 'test.scss');
      writeFileSync(testFile, scss);

      const css = processor.process(testFile, scss);

      expect(css).toContain('.parent');
      expect(css).toContain('.parent .child');
    });

    it('should respect style configuration - expanded', () => {
      const processor = new SassProcessor({
        source: testDir,
        config: {
          sass: {
            style: 'expanded',
          },
        },
      });

      const scss = '.test { color: red; }';
      const testFile = join(testDir, 'test.scss');
      writeFileSync(testFile, scss);

      const css = processor.process(testFile, scss);

      // Expanded style should have more whitespace
      expect(css).toContain('.test {');
      expect(css).toContain('color: red;');
    });

    it('should respect style configuration - compressed', () => {
      const processor = new SassProcessor({
        source: testDir,
        config: {
          sass: {
            style: 'compressed',
          },
        },
      });

      const scss = '.test { color: red; }';
      const testFile = join(testDir, 'test.scss');
      writeFileSync(testFile, scss);

      const css = processor.process(testFile, scss);

      // Compressed style should be minified
      expect(css).toContain('.test{color:red}');
    });

    it('should compile indented SASS syntax', () => {
      const processor = new SassProcessor({
        source: testDir,
        config: {},
      });

      const sass = `
$color: #333
body
  color: $color
      `;
      const testFile = join(testDir, 'test.sass');
      writeFileSync(testFile, sass);

      const css = processor.process(testFile, sass);

      expect(css).toContain('body');
      expect(css).toContain('color: #333');
    });

    it('should throw error for invalid SCSS', () => {
      const invalidScss = 'body { color: ; }'; // Missing value
      const testFile = join(testDir, 'invalid.scss');
      writeFileSync(testFile, invalidScss);

      expect(() => {
        processor.process(testFile, invalidScss);
      }).toThrow();
    });
  });

  describe('import resolution', () => {
    let processor: SassProcessor;

    beforeEach(() => {
      processor = new SassProcessor({
        source: testDir,
        config: {},
      });
    });

    it('should import partials with underscore prefix', () => {
      // Create _partial.scss
      writeFileSync(join(sassDir, '_partial.scss'), '$var: red;');

      const scss = `
@import "partial";
.test { color: $var; }
      `;
      const testFile = join(testDir, 'main.scss');
      writeFileSync(testFile, scss);

      const css = processor.process(testFile, scss);

      expect(css).toContain('.test');
      expect(css).toContain('color: red');
    });

    it('should import files without .scss extension', () => {
      writeFileSync(join(sassDir, '_base.scss'), 'body { margin: 0; }');

      const scss = '@import "base";';
      const testFile = join(testDir, 'main.scss');
      writeFileSync(testFile, scss);

      const css = processor.process(testFile, scss);

      expect(css).toContain('body');
      expect(css).toContain('margin: 0');
    });

    it('should handle .sass partials', () => {
      const sassContent = `
$color: blue
.test
  color: $color
      `;
      writeFileSync(join(sassDir, '_vars.sass'), sassContent);

      const scss = '@import "vars";';
      const testFile = join(testDir, 'main.scss');
      writeFileSync(testFile, scss);

      const css = processor.process(testFile, scss);

      expect(css).toContain('.test');
      expect(css).toContain('color: blue');
    });

    it('should import from custom load_paths', () => {
      // Create a vendor directory with a partial
      const vendorDir = join(testDir, 'vendor', 'scss');
      mkdirSync(vendorDir, { recursive: true });
      writeFileSync(join(vendorDir, '_vendor-vars.scss'), '$vendor-color: #ff0000;');

      const processor = new SassProcessor({
        source: testDir,
        config: {
          sass: {
            load_paths: ['vendor/scss'],
          },
        },
      });

      const scss = `
@import "vendor-vars";
.vendor-styled { color: $vendor-color; }
      `;
      const testFile = join(testDir, 'main.scss');
      writeFileSync(testFile, scss);

      const css = processor.process(testFile, scss);

      expect(css).toContain('.vendor-styled');
      expect(css).toContain('color: #ff0000');
    });
  });

  describe('sourcemap configuration', () => {
    it('should compile SCSS with sourcemap: always (default)', () => {
      const processor = new SassProcessor({
        source: testDir,
        config: {},
      });

      const scss = '.test { color: blue; }';
      const testFile = join(testDir, 'sourcemap-always.scss');
      writeFileSync(testFile, scss);

      const css = processor.process(testFile, scss);

      // Verify CSS is generated correctly
      expect(css).toContain('.test');
      expect(css).toContain('color: blue');
    });

    it('should compile SCSS with sourcemap: never configuration', () => {
      const processor = new SassProcessor({
        source: testDir,
        config: {
          sass: {
            sourcemap: 'never',
          },
        },
      });

      const scss = '.test { color: red; }';
      const testFile = join(testDir, 'sourcemap-never.scss');
      writeFileSync(testFile, scss);

      const css = processor.process(testFile, scss);

      expect(css).toContain('.test');
      expect(css).toContain('color: red');
    });

    it('should compile SCSS with sourcemap: development in dev environment', () => {
      const processor = new SassProcessor({
        source: testDir,
        config: {
          sass: {
            sourcemap: 'development',
          },
        },
        environment: 'development',
      });

      const scss = '.dev-test { color: green; }';
      const testFile = join(testDir, 'sourcemap-dev.scss');
      writeFileSync(testFile, scss);

      const css = processor.process(testFile, scss);

      expect(css).toContain('.dev-test');
      expect(css).toContain('color: green');
    });

    it('should compile SCSS with sourcemap: development in production environment', () => {
      const processor = new SassProcessor({
        source: testDir,
        config: {
          sass: {
            sourcemap: 'development',
          },
        },
        environment: 'production',
      });

      const scss = '.prod-test { color: yellow; }';
      const testFile = join(testDir, 'sourcemap-prod.scss');
      writeFileSync(testFile, scss);

      const css = processor.process(testFile, scss);

      expect(css).toContain('.prod-test');
      expect(css).toContain('color: yellow');
    });

    it('should compile SCSS with legacy source_comments option for backward compatibility', () => {
      const processor = new SassProcessor({
        source: testDir,
        config: {
          sass: {
            source_comments: true,
          },
        },
      });

      const scss = '.legacy-test { color: purple; }';
      const testFile = join(testDir, 'sourcemap-legacy.scss');
      writeFileSync(testFile, scss);

      const css = processor.process(testFile, scss);

      expect(css).toContain('.legacy-test');
      expect(css).toContain('color: purple');
    });
  });
});
