import { RedirectFromPlugin } from '../redirect-from';
import { Site } from '../../core/Site';
import { Renderer } from '../../core/Renderer';
import { Document, DocumentType } from '../../core/Document';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('RedirectFromPlugin', () => {
  const testSiteDir = join(tmpdir(), 'jekyll-test-redirect-site');
  let site: Site;
  let renderer: Renderer;
  let plugin: RedirectFromPlugin;

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
    plugin = new RedirectFromPlugin();

    // Register the plugin
    plugin.register(renderer, site);
  });

  afterEach(() => {
    rmSync(testSiteDir, { recursive: true, force: true });
  });

  it('should have the correct name', () => {
    expect(plugin.name).toBe('jekyll-redirect-from');
  });

  it('should generate redirects from redirect_from front matter', () => {
    // Create a page with redirect_from
    const pageFile = join(testSiteDir, 'new-page.html');
    writeFileSync(
      pageFile,
      '---\ntitle: New Page\nredirect_from:\n  - /old-page/\n  - /another-old-page/\n---\nContent'
    );

    const page = new Document(pageFile, testSiteDir, DocumentType.PAGE);
    page.url = '/new-page/';
    site.pages.push(page);

    const redirects = plugin.generateRedirects(site);

    expect(redirects).toHaveLength(2);
    expect(redirects[0]!.from).toBe('/old-page/');
    expect(redirects[0]!.to).toBe('/new-page/');
    expect(redirects[1]!.from).toBe('/another-old-page/');
    expect(redirects[1]!.to).toBe('/new-page/');
  });

  it('should handle single redirect_from value', () => {
    const pageFile = join(testSiteDir, 'new-page.html');
    writeFileSync(
      pageFile,
      '---\ntitle: New Page\nredirect_from: /old-page/\n---\nContent'
    );

    const page = new Document(pageFile, testSiteDir, DocumentType.PAGE);
    page.url = '/new-page/';
    site.pages.push(page);

    const redirects = plugin.generateRedirects(site);

    expect(redirects).toHaveLength(1);
    expect(redirects[0]!.from).toBe('/old-page/');
    expect(redirects[0]!.to).toBe('/new-page/');
  });

  it('should generate redirects from redirect_to front matter', () => {
    const pageFile = join(testSiteDir, 'old-page.html');
    writeFileSync(
      pageFile,
      '---\ntitle: Old Page\nredirect_to: /new-page/\n---\nContent'
    );

    const page = new Document(pageFile, testSiteDir, DocumentType.PAGE);
    page.url = '/old-page/';
    site.pages.push(page);

    const redirects = plugin.generateRedirects(site);

    expect(redirects).toHaveLength(1);
    expect(redirects[0]!.from).toBe('/old-page/');
    expect(redirects[0]!.to).toBe('/new-page/');
  });

  it('should handle absolute URLs in redirect_to', () => {
    const pageFile = join(testSiteDir, 'old-page.html');
    writeFileSync(
      pageFile,
      '---\ntitle: Old Page\nredirect_to: https://external.com/page/\n---\nContent'
    );

    const page = new Document(pageFile, testSiteDir, DocumentType.PAGE);
    page.url = '/old-page/';
    site.pages.push(page);

    const redirects = plugin.generateRedirects(site);

    expect(redirects).toHaveLength(1);
    expect(redirects[0]!.to).toBe('https://external.com/page/');
  });

  it('should include baseurl in redirect URLs', () => {
    // Reset site with baseurl
    site = new Site(testSiteDir, {
      title: 'Test Site',
      url: 'https://example.com',
      baseurl: '/blog',
    });
    plugin = new RedirectFromPlugin();
    plugin.register(new Renderer(site), site);

    const pageFile = join(testSiteDir, 'new-page.html');
    writeFileSync(
      pageFile,
      '---\ntitle: New Page\nredirect_from: /old-page/\n---\nContent'
    );

    const page = new Document(pageFile, testSiteDir, DocumentType.PAGE);
    page.url = '/new-page/';
    site.pages.push(page);

    const redirects = plugin.generateRedirects(site);

    expect(redirects[0]!.to).toBe('/blog/new-page/');
  });

  it('should generate valid HTML redirect page', () => {
    const pageFile = join(testSiteDir, 'new-page.html');
    writeFileSync(
      pageFile,
      '---\ntitle: New Page\nredirect_from: /old-page/\n---\nContent'
    );

    const page = new Document(pageFile, testSiteDir, DocumentType.PAGE);
    page.url = '/new-page/';
    site.pages.push(page);

    const redirects = plugin.generateRedirects(site);
    const html = redirects[0]!.html;

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<meta http-equiv="refresh" content="0; url=/new-page/"');
    expect(html).toContain('<link rel="canonical" href="/new-page/"');
    expect(html).toContain('<meta name="robots" content="noindex"');
    expect(html).toContain('Click here if you are not redirected');
  });

  it('should escape HTML in redirect URLs', () => {
    const pageFile = join(testSiteDir, 'new-page.html');
    writeFileSync(
      pageFile,
      '---\ntitle: New Page\nredirect_from: /old-page/\n---\nContent'
    );

    const page = new Document(pageFile, testSiteDir, DocumentType.PAGE);
    page.url = '/page?param=value&other="test"';
    site.pages.push(page);

    const redirects = plugin.generateRedirects(site);
    const html = redirects[0]!.html;

    // Should escape ampersands and quotes
    expect(html).toContain('&amp;');
    expect(html).toContain('&quot;');
  });

  it('should process posts with redirect_from', () => {
    const postFile = join(testSiteDir, '2024-01-01-new-post.md');
    writeFileSync(
      postFile,
      '---\ntitle: New Post\ndate: 2024-01-01\nredirect_from: /old-post/\n---\nContent'
    );

    const post = new Document(postFile, testSiteDir, DocumentType.POST);
    post.url = '/2024/01/01/new-post.html';
    site.posts.push(post);

    const redirects = plugin.generateRedirects(site);

    expect(redirects).toHaveLength(1);
    expect(redirects[0]!.from).toBe('/old-post/');
    expect(redirects[0]!.to).toBe('/2024/01/01/new-post.html');
  });

  it('should normalize URLs without leading slash', () => {
    const pageFile = join(testSiteDir, 'new-page.html');
    writeFileSync(
      pageFile,
      '---\ntitle: New Page\nredirect_from: old-page\n---\nContent'
    );

    const page = new Document(pageFile, testSiteDir, DocumentType.PAGE);
    page.url = '/new-page/';
    site.pages.push(page);

    const redirects = plugin.generateRedirects(site);

    expect(redirects[0]!.from).toBe('/old-page');
  });
});
