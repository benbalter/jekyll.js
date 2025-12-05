import {
  loadConfig,
  getDefaultConfig,
  mergeWithDefaults,
  validateConfig,
  JekyllConfig,
} from '../Config';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';

describe('Config', () => {
  const testConfigDir = join(__dirname, '../../../../tmp/test-config');

  beforeEach(() => {
    // Clean up and create fresh test directory
    if (rmSync) {
      rmSync(testConfigDir, { recursive: true, force: true });
    }
    mkdirSync(testConfigDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    if (rmSync) {
      rmSync(testConfigDir, { recursive: true, force: true });
    }
  });

  describe('getDefaultConfig', () => {
    it('should return default configuration', () => {
      const config = getDefaultConfig(testConfigDir);

      expect(config.source).toBe(testConfigDir);
      expect(config.destination).toBe(join(testConfigDir, '_site'));
      expect(config.markdown).toBe('kramdown');
      expect(config.highlighter).toBe('rouge');
      expect(config.port).toBe(4000);
      expect(config.host).toBe('localhost');
      expect(config.baseurl).toBe('');
      expect(config.exclude).toContain('node_modules');
      expect(config.exclude).toContain('.jekyll-cache');
    });

    it('should include default exclude patterns', () => {
      const config = getDefaultConfig(testConfigDir);

      // Ruby Jekyll default excludes
      // See: https://github.com/jekyll/jekyll/blob/master/lib/jekyll/configuration.rb
      expect(config.exclude).toContain('.sass-cache');
      expect(config.exclude).toContain('.jekyll-cache');
      expect(config.exclude).toContain('gemfiles');
      expect(config.exclude).toContain('Gemfile');
      expect(config.exclude).toContain('Gemfile.lock');
      expect(config.exclude).toContain('node_modules');
      expect(config.exclude).toContain('vendor/bundle/');
      expect(config.exclude).toContain('vendor/cache/');
      expect(config.exclude).toContain('vendor/gems/');
      expect(config.exclude).toContain('vendor/ruby/');
    });

    it('should set default liquid options', () => {
      const config = getDefaultConfig(testConfigDir);

      expect(config.liquid).toBeDefined();
      expect(config.liquid?.error_mode).toBe('warn');
      expect(config.liquid?.strict_filters).toBe(false);
      expect(config.liquid?.strict_variables).toBe(false);
    });
  });

  describe('loadConfig', () => {
    it('should load and parse valid YAML configuration', () => {
      const configPath = join(testConfigDir, '_config.yml');
      const configContent = `
title: My Test Site
description: A test site for jekyll.js
url: https://example.com
baseurl: /blog

collections:
  recipes:
    output: true
  authors:
    output: false

exclude:
  - drafts
  - temp
`;
      writeFileSync(configPath, configContent);

      const config = loadConfig(configPath);

      expect(config.title).toBe('My Test Site');
      expect(config.description).toBe('A test site for jekyll.js');
      expect(config.url).toBe('https://example.com');
      expect(config.baseurl).toBe('/blog');
      expect(config.collections).toBeDefined();
      expect(config.collections?.recipes).toEqual({ output: true });
      expect(config.exclude).toContain('drafts');
      expect(config.exclude).toContain('node_modules'); // Default should be merged
    });

    it('should return defaults when config file does not exist', () => {
      const configPath = join(testConfigDir, 'nonexistent.yml');

      const config = loadConfig(configPath);

      expect(config.source).toBeDefined();
      expect(config.destination).toBeDefined();
      expect(config.markdown).toBe('kramdown');
    });

    it('should merge user config with defaults', () => {
      const configPath = join(testConfigDir, '_config.yml');
      const configContent = `
title: Custom Title
port: 3000
`;
      writeFileSync(configPath, configContent);

      const config = loadConfig(configPath);

      expect(config.title).toBe('Custom Title');
      expect(config.port).toBe(3000);
      expect(config.markdown).toBe('kramdown'); // Default should still be present
      expect(config.exclude).toContain('node_modules'); // Default should be present
    });

    it('should throw error for invalid YAML', () => {
      const configPath = join(testConfigDir, '_config.yml');
      const invalidYaml = `
title: Test
  invalid: indentation
description
`;
      writeFileSync(configPath, invalidYaml);

      expect(() => loadConfig(configPath)).toThrow();
    });

    it('should handle empty configuration file', () => {
      const configPath = join(testConfigDir, '_config.yml');
      writeFileSync(configPath, '');

      expect(() => loadConfig(configPath)).toThrow('empty or invalid');
    });

    it('should handle configuration with complex collections', () => {
      const configPath = join(testConfigDir, '_config.yml');
      const configContent = `
collections:
  recipes:
    output: true
    permalink: /recipes/:name/
    sort_by: title
  authors:
    output: false
`;
      writeFileSync(configPath, configContent);

      const config = loadConfig(configPath);

      expect(config.collections?.recipes.output).toBe(true);
      expect(config.collections?.recipes.permalink).toBe('/recipes/:name/');
      expect(config.collections?.authors.output).toBe(false);
    });

    it('should handle liquid configuration', () => {
      const configPath = join(testConfigDir, '_config.yml');
      const configContent = `
liquid:
  error_mode: strict
  strict_filters: true
  strict_variables: true
`;
      writeFileSync(configPath, configContent);

      const config = loadConfig(configPath);

      expect(config.liquid?.error_mode).toBe('strict');
      expect(config.liquid?.strict_filters).toBe(true);
      expect(config.liquid?.strict_variables).toBe(true);
    });

    it('should handle front matter defaults', () => {
      const configPath = join(testConfigDir, '_config.yml');
      const configContent = `
defaults:
  - scope:
      path: ""
      type: "posts"
    values:
      layout: "post"
      author: "John Doe"
  - scope:
      path: "projects"
    values:
      layout: "project"
`;
      writeFileSync(configPath, configContent);

      const config = loadConfig(configPath);

      expect(config.defaults).toHaveLength(2);
      expect(config.defaults?.[0]?.scope.type).toBe('posts');
      expect(config.defaults?.[0]?.values.layout).toBe('post');
      expect(config.defaults?.[1]?.scope.path).toBe('projects');
    });
  });

  describe('mergeWithDefaults', () => {
    it('should merge user config with defaults', () => {
      const userConfig: JekyllConfig = {
        title: 'My Site',
        port: 3000,
      };

      const merged = mergeWithDefaults(userConfig, testConfigDir);

      expect(merged.title).toBe('My Site');
      expect(merged.port).toBe(3000);
      expect(merged.markdown).toBe('kramdown'); // Default
      expect(merged.host).toBe('localhost'); // Default
    });

    it('should merge exclude arrays without duplicates', () => {
      const userConfig: JekyllConfig = {
        exclude: ['custom-exclude', 'node_modules'], // node_modules is also in defaults
      };

      const merged = mergeWithDefaults(userConfig, testConfigDir);

      // Should not have duplicates
      const nodeModulesCount = merged.exclude?.filter((item) => item === 'node_modules').length;
      expect(nodeModulesCount).toBe(1);
      expect(merged.exclude).toContain('custom-exclude');
    });

    it('should resolve source and destination paths', () => {
      const userConfig: JekyllConfig = {
        source: 'src',
        destination: 'dist',
      };

      const merged = mergeWithDefaults(userConfig, testConfigDir);

      expect(merged.source).toBe(join(testConfigDir, 'src'));
      expect(merged.destination).toBe(join(testConfigDir, 'dist'));
    });

    it('should preserve collections configuration', () => {
      const userConfig: JekyllConfig = {
        collections: {
          recipes: { output: true },
        },
      };

      const merged = mergeWithDefaults(userConfig, testConfigDir);

      expect(merged.collections?.recipes).toEqual({ output: true });
    });

    it('should automatically exclude destination directory by default', () => {
      const userConfig: JekyllConfig = {};

      const merged = mergeWithDefaults(userConfig, testConfigDir);

      // Default destination is _site, which should be automatically excluded
      expect(merged.exclude).toContain('_site');
    });

    it('should exclude custom destination directory inside source', () => {
      const userConfig: JekyllConfig = {
        destination: 'dist',
      };

      const merged = mergeWithDefaults(userConfig, testConfigDir);

      // Custom destination 'dist' is inside source, should be excluded
      expect(merged.exclude).toContain('dist');
    });

    it('should not duplicate destination in exclude list if already present', () => {
      const userConfig: JekyllConfig = {
        destination: 'dist',
        exclude: ['dist'],
      };

      const merged = mergeWithDefaults(userConfig, testConfigDir);

      // Should not have duplicates
      const distCount = merged.exclude?.filter((item) => item === 'dist').length;
      expect(distCount).toBe(1);
    });

    it('should not add destination to exclude if outside source', () => {
      const userConfig: JekyllConfig = {
        destination: '/tmp/output',
      };

      const merged = mergeWithDefaults(userConfig, testConfigDir);

      // Destination is outside source, should not be in exclude
      expect(merged.exclude).not.toContain('/tmp/output');
      expect(merged.exclude).not.toContain('tmp/output');
    });
  });

  describe('validateConfig', () => {
    it('should validate valid configuration', () => {
      const config: JekyllConfig = {
        title: 'Test Site',
        markdown: 'kramdown',
        highlighter: 'rouge',
        port: 4000,
      };

      const validation = validateConfig(config);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should warn about unsupported markdown processor', () => {
      const config: JekyllConfig = {
        markdown: 'redcarpet',
      };

      const validation = validateConfig(config);

      expect(validation.valid).toBe(true); // Warning, not error
      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings[0]).toContain('redcarpet');
      expect(validation.warnings[0]).toContain('not fully supported');
    });

    it('should warn about unsupported highlighter', () => {
      const config: JekyllConfig = {
        highlighter: 'pygments',
      };

      const validation = validateConfig(config);

      expect(validation.valid).toBe(true);
      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings[0]).toContain('pygments');
    });

    it('should warn about invalid plugin names', () => {
      // Use invalid npm package names that will trigger warnings
      const config: JekyllConfig = {
        plugins: ['..invalid', '_invalid-start', 'jekyll-seo-tag'],
      };

      const validation = validateConfig(config);

      expect(validation.valid).toBe(true);
      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings[0]).toContain('..invalid');
      expect(validation.warnings[0]).toContain('_invalid-start');
      expect(validation.warnings[0]).not.toContain('jekyll-seo-tag'); // Supported built-in
    });

    it('should accept valid npm package names as plugins', () => {
      // These look like valid npm packages, so they should be accepted
      const config: JekyllConfig = {
        plugins: ['jekyll-paginate', 'jekyll-gist', 'my-custom-plugin', '@myorg/jekyll-plugin'],
      };

      const validation = validateConfig(config);

      expect(validation.valid).toBe(true);
      // No warnings about unsupported plugins since they are valid npm names
      const pluginWarnings = validation.warnings.filter(
        (w) => w.includes('plugins') && w.includes('not supported')
      );
      expect(pluginWarnings.length).toBe(0);
    });

    it('should warn about LSI', () => {
      const config: JekyllConfig = {
        lsi: true,
      };

      const validation = validateConfig(config);

      expect(validation.valid).toBe(true);
      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings[0]).toContain('LSI');
    });

    it('should not warn about pagination when it is configured', () => {
      const config: JekyllConfig = {
        paginate: 10,
      };

      const validation = validateConfig(config);

      expect(validation.valid).toBe(true);
      // Pagination is now implemented, so there should be no warnings
      expect(validation.warnings.length).toBe(0);
    });

    it('should error on invalid port number', () => {
      const config: JekyllConfig = {
        port: 99999,
      };

      const validation = validateConfig(config);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors[0]).toContain('Invalid port');
    });

    it('should error on invalid liquid error mode', () => {
      const config: JekyllConfig = {
        liquid: {
          error_mode: 'invalid' as any,
        },
      };

      const validation = validateConfig(config);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors[0]).toContain('liquid.error_mode');
    });

    it('should warn when destination is inside source', () => {
      const config: JekyllConfig = {
        source: '/home/user/site',
        destination: '/home/user/site/_site',
        exclude: [],
      };

      const validation = validateConfig(config);

      expect(validation.valid).toBe(true);
      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings[0]).toContain('Destination directory is inside source');
    });

    it('should not warn when destination is excluded', () => {
      const config: JekyllConfig = {
        source: '/home/user/site',
        destination: '/home/user/site/_site',
        exclude: ['_site'],
      };

      const validation = validateConfig(config);

      // Should not have the destination warning
      const destWarning = validation.warnings.find((w) => w.includes('Destination directory'));
      expect(destWarning).toBeUndefined();
    });

    it('should warn about safe mode', () => {
      const config: JekyllConfig = {
        safe: true,
      };

      const validation = validateConfig(config);

      expect(validation.valid).toBe(true);
      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings[0]).toContain('Safe mode');
    });

    it('should accept supported plugins without warnings', () => {
      const config: JekyllConfig = {
        plugins: ['jekyll-seo-tag', 'jekyll-sitemap', 'jekyll-feed'],
      };

      const validation = validateConfig(config);

      expect(validation.valid).toBe(true);
      // Should not have plugin warnings
      const pluginWarning = validation.warnings.find((w) =>
        w.includes('plugins are not supported')
      );
      expect(pluginWarning).toBeUndefined();
    });

    it('should accept all built-in plugins without warnings', () => {
      // All built-in plugins including jemoji (not jekyll-jemoji)
      const config: JekyllConfig = {
        plugins: [
          'jekyll-seo-tag',
          'jekyll-sitemap',
          'jekyll-feed',
          'jemoji', // NOTE: the gem name is 'jemoji', not 'jekyll-jemoji'
          'jekyll-redirect-from',
          'jekyll-avatar',
          'jekyll-github-metadata',
          'jekyll-mentions',
        ],
      };

      const validation = validateConfig(config);

      expect(validation.valid).toBe(true);
      // Should not have plugin warnings
      const pluginWarning = validation.warnings.find(
        (w) => w.includes('plugins') && w.includes('not supported')
      );
      expect(pluginWarning).toBeUndefined();
    });

    it('should error on invalid encoding', () => {
      const config: JekyllConfig = {
        encoding: 'invalid-encoding' as BufferEncoding,
      };

      const validation = validateConfig(config);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors[0]).toContain('Invalid encoding');
    });

    it('should accept valid encoding options', () => {
      const config: JekyllConfig = {
        encoding: 'utf-8',
      };

      const validation = validateConfig(config);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should warn about invalid timezone format', () => {
      const config: JekyllConfig = {
        timezone: 'invalid timezone format',
      };

      const validation = validateConfig(config);

      expect(validation.valid).toBe(true);
      expect(validation.warnings.some((w) => w.includes('timezone'))).toBe(true);
    });

    it('should accept valid timezone formats', () => {
      const configs: JekyllConfig[] = [
        { timezone: 'America/New_York' },
        { timezone: 'UTC' },
        { timezone: 'Europe/London' },
      ];

      for (const config of configs) {
        const validation = validateConfig(config);
        expect(validation.valid).toBe(true);
        const timezoneWarning = validation.warnings.find((w) => w.includes('timezone'));
        expect(timezoneWarning).toBeUndefined();
      }
    });

    it('should warn about invalid markdown extension format', () => {
      const config: JekyllConfig = {
        markdown_ext: 'md,.invalid,markdown',
      };

      const validation = validateConfig(config);

      expect(validation.valid).toBe(true);
      expect(validation.warnings.some((w) => w.includes('markdown extensions'))).toBe(true);
    });
  });

  describe('multiple config files', () => {
    it('should load multiple config files separated by comma', () => {
      const configPath1 = join(testConfigDir, '_config.yml');
      const configPath2 = join(testConfigDir, '_config.prod.yml');

      writeFileSync(
        configPath1,
        `
title: Base Site
url: http://localhost:4000
port: 4000
`
      );
      writeFileSync(
        configPath2,
        `
url: https://example.com
port: 8080
`
      );

      const config = loadConfig(`${configPath1},${configPath2}`);

      expect(config.title).toBe('Base Site'); // From first config
      expect(config.url).toBe('https://example.com'); // Overridden by second config
      expect(config.port).toBe(8080); // Overridden by second config
    });

    it('should handle non-existent second config file', () => {
      const configPath1 = join(testConfigDir, '_config.yml');
      const configPath2 = join(testConfigDir, '_config.nonexistent.yml');

      writeFileSync(
        configPath1,
        `
title: My Site
`
      );

      const config = loadConfig(`${configPath1},${configPath2}`);

      expect(config.title).toBe('My Site');
    });
  });

  describe('environment variables in config', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should expand environment variables in config values', () => {
      process.env.TEST_SITE_URL = 'https://test.example.com';
      process.env.TEST_SITE_TITLE = 'My Test Site';

      const configPath = join(testConfigDir, '_config.yml');
      writeFileSync(
        configPath,
        `
url: \${TEST_SITE_URL}
title: \${TEST_SITE_TITLE}
`
      );

      const config = loadConfig(configPath);

      expect(config.url).toBe('https://test.example.com');
      expect(config.title).toBe('My Test Site');
    });

    it('should support default values in environment variables', () => {
      // Don't set the env variable to test default value
      delete process.env.TEST_MISSING_VAR;

      const configPath = join(testConfigDir, '_config.yml');
      writeFileSync(
        configPath,
        `
url: \${TEST_MISSING_VAR:-http://localhost:4000}
`
      );

      const config = loadConfig(configPath);

      expect(config.url).toBe('http://localhost:4000');
    });

    it('should handle nested environment variables', () => {
      process.env.TEST_NESTED_VALUE = 'nested-value';

      const configPath = join(testConfigDir, '_config.yml');
      writeFileSync(
        configPath,
        `
custom:
  nested: \${TEST_NESTED_VALUE}
`
      );

      const config = loadConfig(configPath);

      expect(config.custom?.nested).toBe('nested-value');
    });

    it('should handle environment variables in arrays', () => {
      process.env.TEST_EXCLUDE_PATH = 'temp';

      const configPath = join(testConfigDir, '_config.yml');
      writeFileSync(
        configPath,
        `
exclude:
  - drafts
  - \${TEST_EXCLUDE_PATH}
`
      );

      const config = loadConfig(configPath);

      expect(config.exclude).toContain('drafts');
      expect(config.exclude).toContain('temp');
    });

    it('should return empty string for missing env var without default', () => {
      delete process.env.TEST_UNDEFINED_VAR;

      const configPath = join(testConfigDir, '_config.yml');
      writeFileSync(
        configPath,
        `
title: prefix-\${TEST_UNDEFINED_VAR}-suffix
`
      );

      const config = loadConfig(configPath);

      expect(config.title).toBe('prefix--suffix');
    });

    it('should handle multiple env vars in a single value', () => {
      process.env.TEST_PROTOCOL = 'https';
      process.env.TEST_DOMAIN = 'example.com';
      process.env.TEST_PORT = '8080';

      const configPath = join(testConfigDir, '_config.yml');
      writeFileSync(
        configPath,
        `
url: \${TEST_PROTOCOL}://\${TEST_DOMAIN}:\${TEST_PORT}
`
      );

      const config = loadConfig(configPath);

      expect(config.url).toBe('https://example.com:8080');
    });

    it('should preserve invalid env var syntax unchanged', () => {
      const configPath = join(testConfigDir, '_config.yml');
      writeFileSync(
        configPath,
        `
title: "Empty var: \${} and \${:-default}"
`
      );

      const config = loadConfig(configPath);

      // Invalid syntax should be preserved unchanged
      expect(config.title).toBe('Empty var: ${} and ${:-default}');
    });
  });

  describe('getDefaultConfig with new options', () => {
    it('should include default encoding', () => {
      const config = getDefaultConfig(testConfigDir);
      expect(config.encoding).toBe('utf-8');
    });

    it('should include default markdown_ext', () => {
      const config = getDefaultConfig(testConfigDir);
      expect(config.markdown_ext).toBe('markdown,mkdown,mkdn,mkd,md');
    });
  });
});
