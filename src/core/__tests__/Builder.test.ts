import { Builder } from '../Builder';
import { Site } from '../Site';
import { writeFileSync, mkdirSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';

describe('Builder', () => {
  const testDir = '/tmp/builder-test';
  const destDir = join(testDir, '_site');

  beforeEach(() => {
    // Create test directory structure
    mkdirSync(testDir, { recursive: true });
    mkdirSync(join(testDir, '_layouts'), { recursive: true });
    mkdirSync(join(testDir, '_posts'), { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('build', () => {
    it('should build a simple page', async () => {
      const layoutFile = join(testDir, '_layouts', 'default.html');
      writeFileSync(layoutFile, '<html><body>{{ content }}</body></html>');

      const pageFile = join(testDir, 'index.md');
      writeFileSync(
        pageFile,
        '---\ntitle: Home\nlayout: default\n---\nWelcome to my site'
      );

      const site = new Site(testDir, { destination: destDir });
      const builder = new Builder(site);

      await builder.build();

      const outputFile = join(destDir, 'index.html');
      expect(existsSync(outputFile)).toBe(true);

      const content = readFileSync(outputFile, 'utf-8');
      expect(content).toBe('<html><body>Welcome to my site</body></html>');
    });

    it('should build posts', async () => {
      const layoutFile = join(testDir, '_layouts', 'post.html');
      writeFileSync(layoutFile, '<article>{{ content }}</article>');

      const postFile = join(testDir, '_posts', '2024-01-15-test-post.md');
      writeFileSync(
        postFile,
        '---\ntitle: Test Post\nlayout: post\n---\nThis is a test post'
      );

      const site = new Site(testDir, { destination: destDir });
      const builder = new Builder(site);

      await builder.build();

      const outputFile = join(destDir, '2024', '01', '15', 'test-post.html');
      expect(existsSync(outputFile)).toBe(true);

      const content = readFileSync(outputFile, 'utf-8');
      expect(content).toBe('<article>This is a test post</article>');
    });

    it('should build collection documents', async () => {
      const collectionDir = join(testDir, '_recipes');
      mkdirSync(collectionDir, { recursive: true });

      const layoutFile = join(testDir, '_layouts', 'recipe.html');
      writeFileSync(layoutFile, '<div class="recipe">{{ content }}</div>');

      const recipeFile = join(collectionDir, 'chocolate-cake.md');
      writeFileSync(
        recipeFile,
        '---\ntitle: Chocolate Cake\nlayout: recipe\n---\nDelicious chocolate cake'
      );

      const site = new Site(testDir, {
        destination: destDir,
        collections: {
          recipes: { output: true },
        },
      });
      const builder = new Builder(site);

      await builder.build();

      const outputFile = join(destDir, 'recipes', 'chocolate-cake.html');
      expect(existsSync(outputFile)).toBe(true);

      const content = readFileSync(outputFile, 'utf-8');
      expect(content).toBe('<div class="recipe">Delicious chocolate cake</div>');
    });

    it('should not build draft posts by default', async () => {
      const postFile = join(testDir, '_posts', '2024-01-15-draft-post.md');
      writeFileSync(
        postFile,
        '---\ntitle: Draft Post\npublished: false\n---\nDraft content'
      );

      const site = new Site(testDir, { destination: destDir });
      const builder = new Builder(site, { drafts: false });

      await builder.build();

      const outputFile = join(destDir, '2024', '01', '15', 'draft-post.html');
      expect(existsSync(outputFile)).toBe(false);
    });

    it('should build draft posts when drafts option is true', async () => {
      const layoutFile = join(testDir, '_layouts', 'post.html');
      writeFileSync(layoutFile, '{{ content }}');

      const postFile = join(testDir, '_posts', '2024-01-15-draft-post.md');
      writeFileSync(
        postFile,
        '---\ntitle: Draft Post\ndraft: true\n---\nDraft content'
      );

      const site = new Site(testDir, { destination: destDir });
      const builder = new Builder(site, { drafts: true });

      await builder.build();

      const outputFile = join(destDir, '2024', '01', '15', 'draft-post.html');
      expect(existsSync(outputFile)).toBe(true);
    });

    it('should not build future posts by default', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      const dateStr = futureDate.toISOString().split('T')[0];
      if (!dateStr) throw new Error('Invalid date');

      const postFile = join(testDir, '_posts', `${dateStr}-future-post.md`);
      writeFileSync(
        postFile,
        '---\ntitle: Future Post\n---\nFuture content'
      );

      const site = new Site(testDir, { destination: destDir });
      const builder = new Builder(site, { future: false });

      await builder.build();

      const [year, month, day] = dateStr.split('-');
      const outputFile = join(destDir, year!, month!, day!, 'future-post.html');
      expect(existsSync(outputFile)).toBe(false);
    });

    it('should build future posts when future option is true', async () => {
      const layoutFile = join(testDir, '_layouts', 'post.html');
      writeFileSync(layoutFile, '{{ content }}');

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      const dateStr = futureDate.toISOString().split('T')[0];
      if (!dateStr) throw new Error('Invalid date');

      const postFile = join(testDir, '_posts', `${dateStr}-future-post.md`);
      writeFileSync(
        postFile,
        '---\ntitle: Future Post\n---\nFuture content'
      );

      const site = new Site(testDir, { destination: destDir });
      const builder = new Builder(site, { future: true });

      await builder.build();

      const [year, month, day] = dateStr.split('-');
      const outputFile = join(destDir, year!, month!, day!, 'future-post.html');
      expect(existsSync(outputFile)).toBe(true);
    });

    it('should copy static files', async () => {
      const cssFile = join(testDir, 'styles.css');
      writeFileSync(cssFile, 'body { margin: 0; }');

      const imgDir = join(testDir, 'images');
      mkdirSync(imgDir, { recursive: true });
      const imgFile = join(imgDir, 'logo.png');
      writeFileSync(imgFile, 'fake-image-data');

      const site = new Site(testDir, { destination: destDir });
      const builder = new Builder(site);

      await builder.build();

      expect(existsSync(join(destDir, 'styles.css'))).toBe(true);
      expect(existsSync(join(destDir, 'images', 'logo.png'))).toBe(true);
    });

    it('should create nested output directories', async () => {
      const pageDir = join(testDir, 'docs', 'guides');
      mkdirSync(pageDir, { recursive: true });

      const layoutFile = join(testDir, '_layouts', 'default.html');
      writeFileSync(layoutFile, '{{ content }}');

      const pageFile = join(pageDir, 'getting-started.md');
      writeFileSync(
        pageFile,
        '---\ntitle: Getting Started\nlayout: default\n---\nGuide content'
      );

      const site = new Site(testDir, { destination: destDir });
      const builder = new Builder(site);

      await builder.build();

      const outputFile = join(destDir, 'docs', 'guides', 'getting-started.html');
      expect(existsSync(outputFile)).toBe(true);
    });
  });

  describe('getStats', () => {
    it('should return build statistics', async () => {
      const layoutFile = join(testDir, '_layouts', 'default.html');
      writeFileSync(layoutFile, '{{ content }}');

      writeFileSync(join(testDir, 'index.md'), '---\nlayout: default\n---\nHome');
      writeFileSync(join(testDir, 'about.md'), '---\nlayout: default\n---\nAbout');

      const postFile1 = join(testDir, '_posts', '2024-01-15-post-1.md');
      writeFileSync(postFile1, '---\nlayout: default\n---\nPost 1');

      const postFile2 = join(testDir, '_posts', '2024-01-16-post-2.md');
      writeFileSync(postFile2, '---\nlayout: default\n---\nPost 2');

      const site = new Site(testDir, { destination: destDir });
      const builder = new Builder(site);

      await builder.build();

      const stats = builder.getStats();
      expect(stats.pages).toBe(2);
      expect(stats.posts).toBe(2);
      expect(stats.collections).toBe(0);
    });
  });
});
