import { Site, SiteConfig, createSiteFromConfig } from '../Site';
import { DocumentType } from '../Document';
import { FileSystemError } from '../../utils/errors';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';

describe('Site', () => {
  const testSiteDir = join(__dirname, '../../../../tmp/test-site');

  beforeEach(() => {
    // Clean up and create fresh test site directory
    if (rmSync) {
      rmSync(testSiteDir, { recursive: true, force: true });
    }
    mkdirSync(testSiteDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    if (rmSync) {
      rmSync(testSiteDir, { recursive: true, force: true });
    }
  });

  describe('constructor', () => {
    it('should create a site with default configuration', () => {
      const site = new Site(testSiteDir);

      expect(site.source).toBe(testSiteDir);
      expect(site.destination).toBe(join(testSiteDir, '_site'));
      expect(site.config.exclude).toContain('_site');
      expect(site.config.exclude).toContain('node_modules');
    });

    it('should accept custom configuration', () => {
      const config: SiteConfig = {
        title: 'My Site',
        destination: join(testSiteDir, 'dist'),
        exclude: ['custom-exclude'],
      };

      const site = new Site(testSiteDir, config);

      expect(site.config.title).toBe('My Site');
      expect(site.destination).toBe(join(testSiteDir, 'dist'));
      expect(site.config.exclude).toContain('custom-exclude');
      expect(site.config.exclude).toContain('dist'); // Auto-excluded because it's the destination
    });

    it('should throw FileSystemError when source directory does not exist', () => {
      const nonExistentDir = join(testSiteDir, 'nonexistent');

      expect(() => new Site(nonExistentDir)).toThrow(FileSystemError);
      expect(() => new Site(nonExistentDir)).toThrow(/Source directory does not exist/);
    });
  });

  describe('createSiteFromConfig', () => {
    it('should create a site from a configuration file', () => {
      const configPath = join(testSiteDir, '_config.yml');
      const configContent = `
title: Test Site from Config
description: A test site
collections:
  recipes:
    output: true
`;
      writeFileSync(configPath, configContent);

      const site = createSiteFromConfig(configPath);

      expect(site.config.title).toBe('Test Site from Config');
      expect(site.config.description).toBe('A test site');
      expect(site.config.collections?.recipes).toBeDefined();
    });

    it('should use defaults when config file does not exist', () => {
      const configPath = join(testSiteDir, 'nonexistent.yml');

      const site = createSiteFromConfig(configPath);

      expect(site.source).toBeDefined();
      expect(site.config.markdown).toBe('kramdown');
    });
  });

  describe('read method', () => {
    it('should read pages from the site directory', async () => {
      // Create test pages
      writeFileSync(join(testSiteDir, 'index.md'), '---\ntitle: Home\n---\nHome page');
      writeFileSync(join(testSiteDir, 'about.md'), '---\ntitle: About\n---\nAbout page');

      const site = new Site(testSiteDir);
      await site.read();

      expect(site.pages).toHaveLength(2);
      expect(site.pages[0]?.type).toBe(DocumentType.PAGE);
      expect(site.pages.some((p) => p.basename === 'index')).toBe(true);
      expect(site.pages.some((p) => p.basename === 'about')).toBe(true);
    });

    it('should read posts from _posts directory', async () => {
      // Create _posts directory and test posts
      const postsDir = join(testSiteDir, '_posts');
      mkdirSync(postsDir);

      writeFileSync(
        join(postsDir, '2023-01-01-first-post.md'),
        '---\ntitle: First Post\n---\nContent'
      );
      writeFileSync(
        join(postsDir, '2023-01-15-second-post.md'),
        '---\ntitle: Second Post\n---\nContent'
      );

      const site = new Site(testSiteDir);
      await site.read();

      expect(site.posts).toHaveLength(2);
      expect(site.posts[0]?.type).toBe(DocumentType.POST);
      // Posts should be sorted by date (newest first)
      expect(site.posts[0]?.basename).toBe('2023-01-15-second-post');
      expect(site.posts[1]?.basename).toBe('2023-01-01-first-post');
    });

    it('should read layouts from _layouts directory', async () => {
      // Create _layouts directory and test layouts
      const layoutsDir = join(testSiteDir, '_layouts');
      mkdirSync(layoutsDir);

      writeFileSync(join(layoutsDir, 'default.html'), '<html>{{ content }}</html>');
      writeFileSync(join(layoutsDir, 'post.html'), '<article>{{ content }}</article>');

      const site = new Site(testSiteDir);
      await site.read();

      expect(site.layouts.size).toBe(2);
      expect(site.layouts.has('default')).toBe(true);
      expect(site.layouts.has('post')).toBe(true);
      expect(site.layouts.get('default')?.type).toBe(DocumentType.LAYOUT);
    });

    it('should read includes from _includes directory', async () => {
      // Create _includes directory and test includes
      const includesDir = join(testSiteDir, '_includes');
      mkdirSync(includesDir);

      writeFileSync(join(includesDir, 'header.html'), '<header>Header</header>');
      writeFileSync(join(includesDir, 'footer.html'), '<footer>Footer</footer>');

      const site = new Site(testSiteDir);
      await site.read();

      expect(site.includes.size).toBe(2);
      expect(site.includes.has('header.html')).toBe(true);
      expect(site.includes.has('footer.html')).toBe(true);
      expect(site.includes.get('header.html')?.type).toBe(DocumentType.INCLUDE);
    });

    it('should read collections when configured', async () => {
      // Create collection directory
      const recipesDir = join(testSiteDir, '_recipes');
      mkdirSync(recipesDir);

      writeFileSync(
        join(recipesDir, 'chocolate-chip.md'),
        '---\ntitle: Chocolate Chip Cookies\n---\nRecipe'
      );
      writeFileSync(join(recipesDir, 'apple-pie.md'), '---\ntitle: Apple Pie\n---\nRecipe');

      const config: SiteConfig = {
        collections: {
          recipes: {
            output: true,
          },
        },
      };

      const site = new Site(testSiteDir, config);
      await site.read();

      expect(site.collections.size).toBe(1);
      expect(site.collections.has('recipes')).toBe(true);

      const recipes = site.collections.get('recipes');
      expect(recipes).toHaveLength(2);
      expect(recipes?.[0]?.type).toBe(DocumentType.COLLECTION);
      expect(recipes?.[0]?.collection).toBe('recipes');
    });

    it('should not include files from excluded directories', async () => {
      // Create some pages and an excluded directory
      writeFileSync(join(testSiteDir, 'index.md'), '---\ntitle: Home\n---\nHome');

      const nodeModulesDir = join(testSiteDir, 'node_modules');
      mkdirSync(nodeModulesDir);
      writeFileSync(join(nodeModulesDir, 'test.md'), 'Should not be included');

      const site = new Site(testSiteDir);
      await site.read();

      expect(site.pages).toHaveLength(1);
      expect(site.pages[0]?.basename).toBe('index');
    });

    it('should handle nested includes', async () => {
      // Create nested includes directory structure
      const includesDir = join(testSiteDir, '_includes');
      const socialDir = join(includesDir, 'social');
      mkdirSync(socialDir, { recursive: true });

      writeFileSync(join(socialDir, 'twitter.html'), '<a>Twitter</a>');

      const site = new Site(testSiteDir);
      await site.read();

      expect(site.includes.size).toBe(1);
      expect(site.includes.has('social/twitter.html')).toBe(true);
    });

    it('should read data files from _data directory', async () => {
      // Create _data directory and test data files
      const dataDir = join(testSiteDir, '_data');
      mkdirSync(dataDir);

      // YAML data file
      writeFileSync(join(dataDir, 'members.yml'), 'name: Alice\nrole: Developer');

      // JSON data file
      writeFileSync(join(dataDir, 'settings.json'), '{"theme": "dark", "lang": "en"}');

      const site = new Site(testSiteDir);
      await site.read();

      expect(site.data).toBeDefined();
      expect(site.data.members).toEqual({ name: 'Alice', role: 'Developer' });
      expect(site.data.settings).toEqual({ theme: 'dark', lang: 'en' });
    });

    it('should read nested data files', async () => {
      // Create nested _data directory structure
      const dataDir = join(testSiteDir, '_data');
      const teamDir = join(dataDir, 'team');
      mkdirSync(teamDir, { recursive: true });

      writeFileSync(join(teamDir, 'developers.yml'), 'lead: Alice\nmembers:\n  - Bob\n  - Carol');

      const site = new Site(testSiteDir);
      await site.read();

      expect(site.data.team).toBeDefined();
      expect(site.data.team.developers).toBeDefined();
      expect(site.data.team.developers.lead).toBe('Alice');
      expect(site.data.team.developers.members).toEqual(['Bob', 'Carol']);
    });

    it('should read CSV data files', async () => {
      // Create _data directory and test CSV file
      const dataDir = join(testSiteDir, '_data');
      mkdirSync(dataDir);

      // CSV data file with header row
      writeFileSync(
        join(dataDir, 'members.csv'),
        'name,github,role\nEric Mill,konklone,Developer\nParker Moore,parkr,Maintainer'
      );

      const site = new Site(testSiteDir);
      await site.read();

      expect(site.data).toBeDefined();
      expect(site.data.members).toBeDefined();
      expect(Array.isArray(site.data.members)).toBe(true);
      expect(site.data.members).toHaveLength(2);
      expect(site.data.members[0]).toEqual({
        name: 'Eric Mill',
        github: 'konklone',
        role: 'Developer',
      });
      expect(site.data.members[1]).toEqual({
        name: 'Parker Moore',
        github: 'parkr',
        role: 'Maintainer',
      });
    });

    it('should read TSV data files', async () => {
      // Create _data directory and test TSV file
      const dataDir = join(testSiteDir, '_data');
      mkdirSync(dataDir);

      // TSV data file with header row (using actual tabs)
      writeFileSync(
        join(dataDir, 'products.tsv'),
        'id\tname\tprice\n1\tWidget\t9.99\n2\tGadget\t19.99'
      );

      const site = new Site(testSiteDir);
      await site.read();

      expect(site.data).toBeDefined();
      expect(site.data.products).toBeDefined();
      expect(Array.isArray(site.data.products)).toBe(true);
      expect(site.data.products).toHaveLength(2);
      expect(site.data.products[0]).toEqual({
        id: '1',
        name: 'Widget',
        price: '9.99',
      });
      expect(site.data.products[1]).toEqual({
        id: '2',
        name: 'Gadget',
        price: '19.99',
      });
    });

    it('should handle CSV files with quoted fields', async () => {
      const dataDir = join(testSiteDir, '_data');
      mkdirSync(dataDir);

      // CSV with quoted fields containing commas and embedded quotes
      writeFileSync(
        join(dataDir, 'quotes.csv'),
        'name,description,quote\nProduct A,"A product with, commas",Simple\nProduct B,Plain,"He said ""Hello"""\n'
      );

      const site = new Site(testSiteDir);
      await site.read();

      expect(site.data.quotes).toBeDefined();
      expect(site.data.quotes).toHaveLength(2);
      expect(site.data.quotes[0]).toEqual({
        name: 'Product A',
        description: 'A product with, commas',
        quote: 'Simple',
      });
      expect(site.data.quotes[1]).toEqual({
        name: 'Product B',
        description: 'Plain',
        quote: 'He said "Hello"',
      });
    });

    it('should handle CSV files with missing values', async () => {
      const dataDir = join(testSiteDir, '_data');
      mkdirSync(dataDir);

      // CSV with missing values
      writeFileSync(
        join(dataDir, 'sparse.csv'),
        'name,email,phone\nAlice,alice@example.com,\nBob,,555-1234'
      );

      const site = new Site(testSiteDir);
      await site.read();

      expect(site.data.sparse).toBeDefined();
      expect(site.data.sparse).toHaveLength(2);
      expect(site.data.sparse[0]).toEqual({
        name: 'Alice',
        email: 'alice@example.com',
        phone: '',
      });
      expect(site.data.sparse[1]).toEqual({
        name: 'Bob',
        email: '',
        phone: '555-1234',
      });
    });

    it('should handle empty CSV files gracefully', async () => {
      const dataDir = join(testSiteDir, '_data');
      mkdirSync(dataDir);

      // Empty CSV file
      writeFileSync(join(dataDir, 'empty.csv'), '');

      const site = new Site(testSiteDir);
      await site.read();

      // Empty CSV should result in an empty array
      expect(site.data.empty).toBeDefined();
      expect(site.data.empty).toEqual([]);
    });

    it('should handle CSV files with only headers', async () => {
      const dataDir = join(testSiteDir, '_data');
      mkdirSync(dataDir);

      // CSV with only header row
      writeFileSync(join(dataDir, 'headers_only.csv'), 'name,email,phone\n');

      const site = new Site(testSiteDir);
      await site.read();

      // Should be an empty array (headers but no data)
      expect(site.data.headers_only).toBeDefined();
      expect(site.data.headers_only).toEqual([]);
    });

    it('should handle CSV files with newlines in quoted fields', async () => {
      const dataDir = join(testSiteDir, '_data');
      mkdirSync(dataDir);

      // CSV with newlines inside quoted fields
      writeFileSync(
        join(dataDir, 'multiline.csv'),
        'name,description\nProduct,"A long\ndescription\nwith newlines"'
      );

      const site = new Site(testSiteDir);
      await site.read();

      expect(site.data.multiline).toBeDefined();
      expect(site.data.multiline).toHaveLength(1);
      expect(site.data.multiline[0].name).toBe('Product');
      expect(site.data.multiline[0].description).toBe('A long\ndescription\nwith newlines');
    });

    it('should handle CSV rows with extra columns', async () => {
      const dataDir = join(testSiteDir, '_data');
      mkdirSync(dataDir);

      // CSV with more columns than headers
      writeFileSync(
        join(dataDir, 'extra_columns.csv'),
        'name,email\nAlice,alice@example.com,extra1,extra2'
      );

      const site = new Site(testSiteDir);
      await site.read();

      expect(site.data.extra_columns).toBeDefined();
      expect(site.data.extra_columns).toHaveLength(1);
      // Extra columns should be ignored (only header columns are used)
      expect(site.data.extra_columns[0]).toEqual({
        name: 'Alice',
        email: 'alice@example.com',
      });
    });

    it('should handle CSV files with empty column headers', async () => {
      const dataDir = join(testSiteDir, '_data');
      mkdirSync(dataDir);

      // CSV with empty column header
      writeFileSync(
        join(dataDir, 'empty_headers.csv'),
        'name,,email\nAlice,value,alice@example.com'
      );

      const site = new Site(testSiteDir);
      await site.read();

      expect(site.data.empty_headers).toBeDefined();
      expect(site.data.empty_headers).toHaveLength(1);
      // Empty headers should get placeholder names
      expect(site.data.empty_headers[0]).toEqual({
        name: 'Alice',
        column_2: 'value',
        email: 'alice@example.com',
      });
    });

    it('should handle CSV fields with quotes in middle of unquoted field', async () => {
      const dataDir = join(testSiteDir, '_data');
      mkdirSync(dataDir);

      // CSV with quote in middle of unquoted field (should be treated as literal)
      writeFileSync(join(dataDir, 'mid_quotes.csv'), 'name,description\nAlice,abc"def');

      const site = new Site(testSiteDir);
      await site.read();

      expect(site.data.mid_quotes).toBeDefined();
      expect(site.data.mid_quotes).toHaveLength(1);
      expect(site.data.mid_quotes[0]).toEqual({
        name: 'Alice',
        description: 'abc"def',
      });
    });

    it('should preserve whitespace in CSV fields (Jekyll.rb compatibility)', async () => {
      const dataDir = join(testSiteDir, '_data');
      mkdirSync(dataDir);

      // CSV with whitespace - Jekyll.rb preserves it
      writeFileSync(join(dataDir, 'whitespace.csv'), 'name, value\nAlice, Bob ');

      const site = new Site(testSiteDir);
      await site.read();

      expect(site.data.whitespace).toBeDefined();
      expect(site.data.whitespace).toHaveLength(1);
      // Whitespace should be preserved per Jekyll.rb behavior
      expect(site.data.whitespace[0]).toEqual({
        name: 'Alice',
        ' value': ' Bob ',
      });
    });

    it('should handle invalid data files gracefully', async () => {
      const dataDir = join(testSiteDir, '_data');
      mkdirSync(dataDir);

      // Invalid YAML
      writeFileSync(join(dataDir, 'invalid.yml'), '{ invalid yaml content [');

      // Valid JSON for comparison
      writeFileSync(join(dataDir, 'valid.json'), '{"key": "value"}');

      const site = new Site(testSiteDir);

      // Should not throw, just warn
      await expect(site.read()).resolves.not.toThrow();

      // Valid data should still be loaded
      expect(site.data.valid).toEqual({ key: 'value' });
      // Invalid data should not be loaded
      expect(site.data.invalid).toBeUndefined();
    });

    it('should support custom data_dir configuration', async () => {
      // Create custom data directory
      const customDataDir = join(testSiteDir, 'custom_data');
      mkdirSync(customDataDir);

      writeFileSync(join(customDataDir, 'info.yml'), 'name: Custom');

      const config: SiteConfig = {
        data_dir: 'custom_data',
      };

      const site = new Site(testSiteDir, config);
      await site.read();

      expect(site.data.info).toEqual({ name: 'Custom' });
    });

    it('should preserve plugin-added data after read()', async () => {
      // Create _data directory with a file
      const dataDir = join(testSiteDir, '_data');
      mkdirSync(dataDir);
      writeFileSync(join(dataDir, 'settings.yml'), 'theme: dark');

      const site = new Site(testSiteDir);

      // Simulate plugin adding data before site.read() (like GitHubMetadataPlugin does)
      site.data.github = {
        repository_name: 'test-repo',
        owner: { login: 'testuser' },
      };
      site.data.custom_plugin = {
        some_value: 42,
      };

      await site.read();

      // Plugin-added data should be preserved
      expect(site.data.github).toBeDefined();
      expect(site.data.github.repository_name).toBe('test-repo');
      expect(site.data.github.owner.login).toBe('testuser');
      expect(site.data.custom_plugin).toBeDefined();
      expect(site.data.custom_plugin.some_value).toBe(42);

      // File-based data should also be loaded
      expect(site.data.settings).toEqual({ theme: 'dark' });
    });

    it('should allow file data to be overridden by plugin data', async () => {
      // Create _data directory with github.yml (simulating a file that conflicts with plugin)
      const dataDir = join(testSiteDir, '_data');
      mkdirSync(dataDir);
      writeFileSync(
        join(dataDir, 'github.yml'),
        'repository_name: from-file\nowner:\n  login: file-user'
      );

      const site = new Site(testSiteDir);

      // Plugin adds data with same key before site.read()
      site.data.github = {
        repository_name: 'from-plugin',
        owner: { login: 'plugin-user' },
      };

      await site.read();

      // Plugin data should take precedence over file data
      expect(site.data.github.repository_name).toBe('from-plugin');
      expect(site.data.github.owner.login).toBe('plugin-user');
    });
  });

  describe('getLayout method', () => {
    it('should retrieve a layout by name', async () => {
      const layoutsDir = join(testSiteDir, '_layouts');
      mkdirSync(layoutsDir);
      writeFileSync(join(layoutsDir, 'post.html'), '<article>{{ content }}</article>');

      const site = new Site(testSiteDir);
      await site.read();

      const layout = site.getLayout('post');
      expect(layout).toBeDefined();
      expect(layout?.basename).toBe('post');
    });

    it('should return undefined for non-existent layout', async () => {
      const site = new Site(testSiteDir);
      await site.read();

      const layout = site.getLayout('nonexistent');
      expect(layout).toBeUndefined();
    });
  });

  describe('getInclude method', () => {
    it('should retrieve an include by path', async () => {
      const includesDir = join(testSiteDir, '_includes');
      mkdirSync(includesDir);
      writeFileSync(join(includesDir, 'header.html'), '<header>Header</header>');

      const site = new Site(testSiteDir);
      await site.read();

      const include = site.getInclude('header.html');
      expect(include).toBeDefined();
      expect(include?.basename).toBe('header');
    });

    it('should return undefined for non-existent include', async () => {
      const site = new Site(testSiteDir);
      await site.read();

      const include = site.getInclude('nonexistent.html');
      expect(include).toBeUndefined();
    });
  });

  describe('getCollection method', () => {
    it('should retrieve documents from a collection', async () => {
      const recipesDir = join(testSiteDir, '_recipes');
      mkdirSync(recipesDir);
      writeFileSync(join(recipesDir, 'cookies.md'), '---\ntitle: Cookies\n---\nRecipe');

      const config: SiteConfig = {
        collections: { recipes: {} },
      };

      const site = new Site(testSiteDir, config);
      await site.read();

      const recipes = site.getCollection('recipes');
      expect(recipes).toHaveLength(1);
      expect(recipes[0]?.basename).toBe('cookies');
    });

    it('should return empty array for non-existent collection', async () => {
      const site = new Site(testSiteDir);
      await site.read();

      const collection = site.getCollection('nonexistent');
      expect(collection).toEqual([]);
    });
  });

  describe('getAllDocuments method', () => {
    it('should return all documents from the site', async () => {
      // Create various documents
      writeFileSync(join(testSiteDir, 'index.md'), '---\ntitle: Home\n---\nHome');

      const postsDir = join(testSiteDir, '_posts');
      mkdirSync(postsDir);
      writeFileSync(join(postsDir, '2023-01-01-post.md'), '---\ntitle: Post\n---\nPost');

      const layoutsDir = join(testSiteDir, '_layouts');
      mkdirSync(layoutsDir);
      writeFileSync(join(layoutsDir, 'default.html'), '<html>{{ content }}</html>');

      const site = new Site(testSiteDir);
      await site.read();

      const allDocs = site.getAllDocuments();
      expect(allDocs.length).toBeGreaterThanOrEqual(3);
      expect(allDocs.some((d) => d.type === DocumentType.PAGE)).toBe(true);
      expect(allDocs.some((d) => d.type === DocumentType.POST)).toBe(true);
      expect(allDocs.some((d) => d.type === DocumentType.LAYOUT)).toBe(true);
    });
  });

  describe('toJSON method', () => {
    it('should return JSON representation of the site', async () => {
      writeFileSync(join(testSiteDir, 'index.md'), '---\ntitle: Home\n---\nHome');

      const site = new Site(testSiteDir, { title: 'Test Site' });
      await site.read();

      const json = site.toJSON();
      expect(json.config.title).toBe('Test Site');
      expect(json.source).toBe(testSiteDir);
      expect(json.pages).toHaveLength(1);
      expect(Array.isArray(json.pages)).toBe(true);
    });

    it('should include data in JSON representation', async () => {
      const dataDir = join(testSiteDir, '_data');
      mkdirSync(dataDir);
      writeFileSync(join(dataDir, 'info.json'), '{"version": "1.0"}');

      const site = new Site(testSiteDir);
      await site.read();

      const json = site.toJSON();
      expect(json.data).toBeDefined();
      expect(json.data.info).toEqual({ version: '1.0' });
    });

    it('should include static_files in JSON representation', async () => {
      const assetsDir = join(testSiteDir, 'assets');
      mkdirSync(assetsDir);
      writeFileSync(join(assetsDir, 'style.css'), 'body { margin: 0; }');

      const site = new Site(testSiteDir);
      await site.read();

      const json = site.toJSON();
      expect(json.static_files).toBeDefined();
      expect(Array.isArray(json.static_files)).toBe(true);
      expect(json.static_files.length).toBeGreaterThan(0);
      expect(json.static_files[0].name).toBe('style.css');
    });
  });

  describe('static_files reading', () => {
    it('should read static files from site directory', async () => {
      // Create static files
      const assetsDir = join(testSiteDir, 'assets');
      mkdirSync(assetsDir);
      writeFileSync(join(assetsDir, 'style.css'), 'body { margin: 0; }');
      writeFileSync(join(assetsDir, 'script.js'), 'console.log("hello");');

      const site = new Site(testSiteDir);
      await site.read();

      expect(site.static_files.length).toBe(2);
      const names = site.static_files.map((sf) => sf.name);
      expect(names).toContain('style.css');
      expect(names).toContain('script.js');
    });

    it('should include correct metadata for static files', async () => {
      writeFileSync(join(testSiteDir, 'favicon.ico'), 'fake-icon-data');

      const site = new Site(testSiteDir);
      await site.read();

      const favicon = site.static_files.find((sf) => sf.name === 'favicon.ico');
      expect(favicon).toBeDefined();
      expect(favicon?.basename).toBe('favicon');
      expect(favicon?.extname).toBe('.ico');
      expect(favicon?.modified_time).toBeDefined();
      expect(favicon?.modified_time.getTime()).toBeGreaterThan(0);
      expect(favicon?.size).toBeGreaterThan(0);
    });

    it('should handle nested static files', async () => {
      const nestedDir = join(testSiteDir, 'assets/images/icons');
      mkdirSync(nestedDir, { recursive: true });
      writeFileSync(join(nestedDir, 'icon.png'), 'fake-icon-data');

      const site = new Site(testSiteDir);
      await site.read();

      const icon = site.static_files.find((sf) => sf.name === 'icon.png');
      expect(icon).toBeDefined();
      expect(icon?.relativePath).toBe('assets/images/icons/icon.png');
      expect(icon?.url).toBe('/assets/images/icons/icon.png');
    });

    it('should not include files from excluded directories', async () => {
      const nodeModulesDir = join(testSiteDir, 'node_modules');
      mkdirSync(nodeModulesDir);
      writeFileSync(join(nodeModulesDir, 'package.json'), '{}');

      writeFileSync(join(testSiteDir, 'app.js'), 'console.log("hello");');

      const site = new Site(testSiteDir);
      await site.read();

      // Only app.js should be in static_files, not node_modules contents
      expect(site.static_files.length).toBe(1);
      expect(site.static_files[0]?.name).toBe('app.js');
    });

    it('should not include files from underscore-prefixed directories', async () => {
      const postsDir = join(testSiteDir, '_posts');
      mkdirSync(postsDir);
      writeFileSync(join(postsDir, '2024-01-01-post.md'), '---\ntitle: Post\n---\nContent');

      writeFileSync(join(testSiteDir, 'style.css'), 'body { margin: 0; }');

      const site = new Site(testSiteDir);
      await site.read();

      // Only style.css should be in static_files
      const staticFileNames = site.static_files.map((sf) => sf.name);
      expect(staticFileNames).toContain('style.css');
      expect(staticFileNames).not.toContain('2024-01-01-post.md');
    });

    it('should treat files with front matter as pages not static files', async () => {
      // Create a .txt file with front matter - should be treated as a page
      writeFileSync(join(testSiteDir, 'robots.txt'), '---\nlayout: null\n---\nUser-agent: *');

      // Create a .xml file with front matter - should be treated as a page
      writeFileSync(join(testSiteDir, 'feed.xml'), '---\nlayout: null\n---\n<?xml version="1.0"?>');

      // Create a .txt file without front matter - should be a static file
      writeFileSync(join(testSiteDir, 'plain.txt'), 'Plain text without front matter');

      // Create a .css file without front matter - should be a static file
      writeFileSync(join(testSiteDir, 'style.css'), 'body { margin: 0; }');

      const site = new Site(testSiteDir);
      await site.read();

      // Files with front matter should be pages
      const pageNames = site.pages.map((p) => p.basename + p.extname);
      expect(pageNames).toContain('robots.txt');
      expect(pageNames).toContain('feed.xml');

      // Files without front matter should be static files
      const staticFileNames = site.static_files.map((sf) => sf.name);
      expect(staticFileNames).toContain('plain.txt');
      expect(staticFileNames).toContain('style.css');

      // Files with front matter should NOT be static files
      expect(staticFileNames).not.toContain('robots.txt');
      expect(staticFileNames).not.toContain('feed.xml');
    });

    it('should not treat files with incomplete front matter as pages', async () => {
      // Create a file that starts with --- but has no closing ---
      writeFileSync(
        join(testSiteDir, 'incomplete.txt'),
        '---\nThis starts with dashes but has no closing marker'
      );

      // Create a file that starts with --- in content (not front matter)
      writeFileSync(
        join(testSiteDir, 'dashes.txt'),
        '---Something that looks like but is not front matter'
      );

      // Create a proper front matter file for comparison
      writeFileSync(join(testSiteDir, 'proper.txt'), '---\nlayout: null\n---\nProper front matter');

      const site = new Site(testSiteDir);
      await site.read();

      // Only proper front matter file should be a page
      const pageNames = site.pages.map((p) => p.basename + p.extname);
      expect(pageNames).toContain('proper.txt');
      expect(pageNames).not.toContain('incomplete.txt');
      expect(pageNames).not.toContain('dashes.txt');

      // Incomplete front matter files should be static files
      const staticFileNames = site.static_files.map((sf) => sf.name);
      expect(staticFileNames).toContain('incomplete.txt');
      expect(staticFileNames).toContain('dashes.txt');
      expect(staticFileNames).not.toContain('proper.txt');
    });

    it('should recognize custom markdown extensions from markdown_ext config', async () => {
      // Create a post with a custom extension
      const postsDir = join(testSiteDir, '_posts');
      mkdirSync(postsDir);
      writeFileSync(join(postsDir, '2024-01-01-post.mdown'), '---\ntitle: Post\n---\nContent');

      // Default markdown_ext includes 'mdown'
      const site = new Site(testSiteDir, { markdown_ext: 'md,markdown,mdown' });
      await site.read();

      // Post should be recognized
      expect(site.posts).toHaveLength(1);
      expect(site.posts[0]?.data.title).toBe('Post');
    });

    it('should recognize custom markdown extensions from default markdown_ext', async () => {
      // Create a post with mkd extension (part of default markdown_ext)
      const postsDir = join(testSiteDir, '_posts');
      mkdirSync(postsDir);
      writeFileSync(join(postsDir, '2024-01-01-post.mkd'), '---\ntitle: MKD Post\n---\nContent');

      // Default markdown_ext is 'markdown,mkdown,mkdn,mkd,md'
      const site = new Site(testSiteDir);
      await site.read();

      // Post should be recognized
      expect(site.posts).toHaveLength(1);
      expect(site.posts[0]?.data.title).toBe('MKD Post');
    });

    it('should not recognize extensions not in markdown_ext config', async () => {
      // Create a post with a custom extension not in the config
      const postsDir = join(testSiteDir, '_posts');
      mkdirSync(postsDir);
      writeFileSync(join(postsDir, '2024-01-01-post.custom'), '---\ntitle: Custom\n---\nContent');

      // Custom extension not in markdown_ext
      const site = new Site(testSiteDir, { markdown_ext: 'md,markdown' });
      await site.read();

      // Post should NOT be recognized
      expect(site.posts).toHaveLength(0);
    });
  });
});
