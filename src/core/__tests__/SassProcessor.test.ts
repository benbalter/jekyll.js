import { SassProcessor } from '../SassProcessor';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import * as os from 'os';

describe('SassProcessor', () => {
  // Use a truly isolated temp directory for each test run
  const testDir = join(os.tmpdir(), 'jekyll-ts-sass-test-' + Date.now() + '-' + Math.random().toString(36).slice(2));
  const sassDir = join(testDir, '_sass');

  beforeEach(() => {
    // Create test directories
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
  });
});
