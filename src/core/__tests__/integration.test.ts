import { Builder } from '../Builder';
import { createSiteFromConfig } from '../Site';
import { existsSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';

/**
 * Integration test that builds a complete fixture site
 * and validates the generated output.
 */
describe('Integration: Fixture Site Build', () => {
  const fixtureDir = join(__dirname, '../../../test-fixtures/basic-site');
  const configPath = join(fixtureDir, '_config.yml');
  const destDir = join(fixtureDir, '_site');

  // Build the site once before all tests
  beforeAll(async () => {
    // Clean up destination directory
    try {
      rmSync(destDir, { recursive: true, force: true });
    } catch (error) {
      // Directory may not exist, which is fine
    }

    // Verify fixture site exists
    expect(existsSync(fixtureDir)).toBe(true);
    expect(existsSync(configPath)).toBe(true);

    // Create site from config and build
    const site = createSiteFromConfig(configPath);
    expect(site).toBeDefined();
    expect(site.config.title).toBe('Basic Test Site');

    const builder = new Builder(site);
    await builder.build();

    // Verify destination directory was created
    expect(existsSync(destDir)).toBe(true);
  });

  afterAll(() => {
    // Clean up destination directory after all tests
    try {
      rmSync(destDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  it('should build the complete fixture site', () => {
    // Just verify the build was successful
    expect(existsSync(destDir)).toBe(true);
  });

  describe('Pages', () => {
    it('should render the homepage', () => {
      const indexPath = join(destDir, 'index.html');
      expect(existsSync(indexPath)).toBe(true);

      const content = readFileSync(indexPath, 'utf-8');

      // Check for page title
      expect(content).toContain('Home | Basic Test Site');

      // Check for layout structure
      expect(content).toContain('<!DOCTYPE html>');
      expect(content).toContain('<html lang="en">');

      // Check for includes
      expect(content).toContain('Basic Test Site');
      expect(content).toContain('A fixture site for integration testing');

      // Check for page content
      expect(content).toContain('Welcome to Basic Test Site');
      expect(content).toContain('This is a fixture site used for integration testing');
    });

    it('should render the about page with custom permalink', () => {
      const aboutPath = join(destDir, 'about/index.html');
      expect(existsSync(aboutPath)).toBe(true);

      const content = readFileSync(aboutPath, 'utf-8');

      // Check for page title
      expect(content).toContain('About | Basic Test Site');

      // Check for page content
      expect(content).toContain('About This Site');
      expect(content).toContain('Custom permalinks');
    });
  });

  describe('Posts', () => {
    it('should render posts with correct URL structure', () => {
      // First post with categories should be at /blog/updates/2024/01/01/first-post.html
      const firstPostPath = join(destDir, 'blog/updates/2024/01/01/first-post.html');
      expect(existsSync(firstPostPath)).toBe(true);

      const content = readFileSync(firstPostPath, 'utf-8');

      // Check for post title
      expect(content).toContain('First Post | Basic Test Site');

      // Check for post content
      expect(content).toContain('First Post');
      expect(content).toContain('This is the first test post');
    });

    it('should apply post layout with inheritance', () => {
      const firstPostPath = join(destDir, 'blog/updates/2024/01/01/first-post.html');
      const content = readFileSync(firstPostPath, 'utf-8');

      // Check for post layout elements
      expect(content).toContain('<div class="post">');
      expect(content).toContain('<div class="post-meta">');

      // Check for default layout elements (inherited)
      expect(content).toContain('<!DOCTYPE html>');
      expect(content).toContain('<header>');
      expect(content).toContain('<footer>');
    });

    it('should render post categories', () => {
      const firstPostPath = join(destDir, 'blog/updates/2024/01/01/first-post.html');
      const content = readFileSync(firstPostPath, 'utf-8');

      // Check for categories in the post meta
      expect(content).toContain('blog');
      expect(content).toContain('updates');
    });

    it('should render post tags', () => {
      const firstPostPath = join(destDir, 'blog/updates/2024/01/01/first-post.html');
      const content = readFileSync(firstPostPath, 'utf-8');

      // Check for tags
      expect(content).toContain('jekyll');
      expect(content).toContain('testing');
    });

    it('should render second post correctly', () => {
      const secondPostPath = join(destDir, 'blog/2024/01/15/second-post.html');
      expect(existsSync(secondPostPath)).toBe(true);

      const content = readFileSync(secondPostPath, 'utf-8');
      expect(content).toContain('Second Post');
      expect(content).toContain('multiple posts work correctly');
    });
  });

  describe('Collections', () => {
    it('should render collection documents', () => {
      // Collection items should be at /recipes/{slug}.html
      const cookiesPath = join(destDir, 'recipes/chocolate-chip-cookies.html');
      expect(existsSync(cookiesPath)).toBe(true);

      const content = readFileSync(cookiesPath, 'utf-8');
      expect(content).toContain('Chocolate Chip Cookies');
      expect(content).toContain('A delicious recipe');
    });

    it('should render multiple collection documents', () => {
      const cookiesPath = join(destDir, 'recipes/chocolate-chip-cookies.html');
      const piePath = join(destDir, 'recipes/apple-pie.html');

      expect(existsSync(cookiesPath)).toBe(true);
      expect(existsSync(piePath)).toBe(true);

      const pieContent = readFileSync(piePath, 'utf-8');
      expect(pieContent).toContain('Apple Pie');
      expect(pieContent).toContain('Another collection document');
    });
  });

  describe('Includes', () => {
    it('should render header include', () => {
      const indexPath = join(destDir, 'index.html');
      const content = readFileSync(indexPath, 'utf-8');

      // Check for header content
      expect(content).toContain('<header>');
      expect(content).toContain('<nav>');
      expect(content).toContain('Basic Test Site');
      expect(content).toContain('A fixture site for integration testing');
    });

    it('should render footer include', () => {
      const indexPath = join(destDir, 'index.html');
      const content = readFileSync(indexPath, 'utf-8');

      // Check for footer content
      expect(content).toContain('<footer>');
      expect(content).toContain('Built with Jekyll TS');
    });
  });

  describe('Static Files', () => {
    it('should copy static CSS files', () => {
      const cssPath = join(destDir, 'assets/css/style.css');
      expect(existsSync(cssPath)).toBe(true);

      const content = readFileSync(cssPath, 'utf-8');
      expect(content).toContain('font-family: Arial');
      expect(content).toContain('max-width: 800px');
    });
  });

  describe('Liquid Variables', () => {
    it('should render site variables from config', () => {
      const indexPath = join(destDir, 'index.html');
      const content = readFileSync(indexPath, 'utf-8');

      // Check for site.title
      expect(content).toContain('Basic Test Site');

      // Check for site.description
      expect(content).toContain('A fixture site for integration testing');
    });

    it('should render page variables', () => {
      const indexPath = join(destDir, 'index.html');
      const content = readFileSync(indexPath, 'utf-8');

      // Check that page.title is rendered
      expect(content).toContain('Home | Basic Test Site');
    });

    it('should render date filter in posts', () => {
      const firstPostPath = join(destDir, 'blog/updates/2024/01/01/first-post.html');
      const content = readFileSync(firstPostPath, 'utf-8');

      // Check for formatted date (should contain "January" and "2024")
      expect(content).toContain('January');
      expect(content).toContain('2024');
    });
  });

  describe('Build Completeness', () => {
    it('should build all expected files', async () => {
      const site = createSiteFromConfig(configPath);
      const builder = new Builder(site);
      await builder.build();

      // Pages
      expect(existsSync(join(destDir, 'index.html'))).toBe(true);
      expect(existsSync(join(destDir, 'about/index.html'))).toBe(true);

      // Posts
      expect(existsSync(join(destDir, 'blog/updates/2024/01/01/first-post.html'))).toBe(true);
      expect(existsSync(join(destDir, 'blog/2024/01/15/second-post.html'))).toBe(true);

      // Collections
      expect(existsSync(join(destDir, 'recipes/chocolate-chip-cookies.html'))).toBe(true);
      expect(existsSync(join(destDir, 'recipes/apple-pie.html'))).toBe(true);

      // Static files
      expect(existsSync(join(destDir, 'assets/css/style.css'))).toBe(true);

      // Layouts and includes should NOT be copied
      expect(existsSync(join(destDir, '_layouts'))).toBe(false);
      expect(existsSync(join(destDir, '_includes'))).toBe(false);
    });

    it('should not include README in output', async () => {
      const site = createSiteFromConfig(configPath);
      const builder = new Builder(site);

      await builder.build();

      expect(existsSync(join(destDir, 'README.html'))).toBe(false);
      expect(existsSync(join(destDir, 'README.md'))).toBe(false);
    });
  });
});
