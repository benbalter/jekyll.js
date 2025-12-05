import { SitemapPlugin } from '../sitemap';
import { Site } from '../../core/Site';
import { Renderer } from '../../core/Renderer';
import { Document, DocumentType } from '../../core/Document';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';

describe('SitemapPlugin', () => {
  const testSiteDir = join(__dirname, '../../../../../tmp/test-sitemap-site');
  let site: Site;
  let renderer: Renderer;
  let plugin: SitemapPlugin;

  beforeEach(() => {
    // Clean up and create fresh test site directory
    rmSync(testSiteDir, { recursive: true, force: true });
    mkdirSync(testSiteDir, { recursive: true });

    // Create test site with config
    const config = {
      title: 'Test Site',
      url: 'https://example.com',
      baseurl: '',
    };

    site = new Site(testSiteDir, config);
    renderer = new Renderer(site);
    plugin = new SitemapPlugin();

    // Register the plugin
    plugin.register(renderer, site);
  });

  afterEach(() => {
    rmSync(testSiteDir, { recursive: true, force: true });
  });

  it('should have the correct name', () => {
    expect(plugin.name).toBe('jekyll-sitemap');
  });

  it('should generate a valid sitemap XML structure', async () => {
    // Create a simple page
    const pageFile = join(testSiteDir, 'index.html');
    writeFileSync(pageFile, '---\ntitle: Home\n---\nContent');

    const page = new Document(pageFile, testSiteDir, DocumentType.PAGE);
    page.url = '/';
    site.pages.push(page);

    const sitemap = await plugin.generateSitemap(site);

    expect(sitemap).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(sitemap).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(sitemap).toContain('</urlset>');
  });

  it('should include pages in the sitemap', async () => {
    const pageFile = join(testSiteDir, 'about.html');
    writeFileSync(pageFile, '---\ntitle: About\n---\nContent');

    const page = new Document(pageFile, testSiteDir, DocumentType.PAGE);
    page.url = '/about.html';
    site.pages.push(page);

    const sitemap = await plugin.generateSitemap(site);

    expect(sitemap).toContain('<loc>https://example.com/about.html</loc>');
  });

  it('should include posts in the sitemap', async () => {
    const postFile = join(testSiteDir, '2024-01-01-test-post.md');
    writeFileSync(postFile, '---\ntitle: Test Post\n---\nContent');

    const post = new Document(postFile, testSiteDir, DocumentType.POST);
    post.url = '/2024/01/01/test-post.html';
    site.posts.push(post);

    const sitemap = await plugin.generateSitemap(site);

    expect(sitemap).toContain('<loc>https://example.com/2024/01/01/test-post.html</loc>');
  });

  it('should include lastmod date for posts', async () => {
    const postFile = join(testSiteDir, '2024-01-01-test-post.md');
    writeFileSync(postFile, '---\ntitle: Test Post\ndate: 2024-01-01\n---\nContent');

    const post = new Document(postFile, testSiteDir, DocumentType.POST);
    post.url = '/2024/01/01/test-post.html';
    site.posts.push(post);

    const sitemap = await plugin.generateSitemap(site);

    expect(sitemap).toContain('<lastmod>2024-01-01</lastmod>');
  });

  it('should include changefreq and priority', async () => {
    const pageFile = join(testSiteDir, 'index.html');
    writeFileSync(pageFile, '---\ntitle: Home\n---\nContent');

    const page = new Document(pageFile, testSiteDir, DocumentType.PAGE);
    page.url = '/';
    site.pages.push(page);

    const sitemap = await plugin.generateSitemap(site);

    expect(sitemap).toContain('<changefreq>');
    expect(sitemap).toContain('<priority>1.0</priority>'); // Homepage gets 1.0
  });

  it('should respect custom sitemap settings in front matter', async () => {
    const pageFile = join(testSiteDir, 'custom.html');
    writeFileSync(
      pageFile,
      '---\ntitle: Custom\nsitemap:\n  changefreq: daily\n  priority: 0.9\n---\nContent'
    );

    const page = new Document(pageFile, testSiteDir, DocumentType.PAGE);
    page.url = '/custom.html';
    site.pages.push(page);

    const sitemap = await plugin.generateSitemap(site);

    expect(sitemap).toContain('<changefreq>daily</changefreq>');
    expect(sitemap).toContain('<priority>0.9</priority>');
  });

  it('should exclude pages with sitemap: false', async () => {
    const pageFile = join(testSiteDir, 'excluded.html');
    writeFileSync(pageFile, '---\ntitle: Excluded\nsitemap: false\n---\nContent');

    const page = new Document(pageFile, testSiteDir, DocumentType.PAGE);
    page.url = '/excluded.html';
    site.pages.push(page);

    const sitemap = await plugin.generateSitemap(site);

    expect(sitemap).not.toContain('/excluded.html');
  });

  it('should escape XML special characters', async () => {
    const pageFile = join(testSiteDir, 'test.html');
    writeFileSync(pageFile, '---\ntitle: Test\n---\nContent');

    const page = new Document(pageFile, testSiteDir, DocumentType.PAGE);
    page.url = '/test?param=value&other=test';
    site.pages.push(page);

    const sitemap = await plugin.generateSitemap(site);

    expect(sitemap).toContain('&amp;');
    expect(sitemap).not.toContain('param=value&other');
  });

  it('should sort URLs consistently', async () => {
    // Create multiple pages
    const pages = ['zebra.html', 'apple.html', 'middle.html'];
    for (const page of pages) {
      const pageFile = join(testSiteDir, page);
      writeFileSync(pageFile, '---\ntitle: Test\n---\nContent');
      const doc = new Document(pageFile, testSiteDir, DocumentType.PAGE);
      doc.url = `/${page}`;
      site.pages.push(doc);
    }

    const sitemap = await plugin.generateSitemap(site);

    const appleIndex = sitemap.indexOf('/apple.html');
    const middleIndex = sitemap.indexOf('/middle.html');
    const zebraIndex = sitemap.indexOf('/zebra.html');

    expect(appleIndex).toBeLessThan(middleIndex);
    expect(middleIndex).toBeLessThan(zebraIndex);
  });
});
