import { FeedPlugin } from '../feed';
import { Site } from '../../core/Site';
import { Renderer } from '../../core/Renderer';
import { Document, DocumentType } from '../../core/Document';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';

describe('FeedPlugin', () => {
  const testSiteDir = join(__dirname, '../../../../../tmp/test-feed-site');
  let site: Site;
  let renderer: Renderer;
  let plugin: FeedPlugin;

  beforeEach(() => {
    // Clean up and create fresh test site directory
    rmSync(testSiteDir, { recursive: true, force: true });
    mkdirSync(testSiteDir, { recursive: true });

    // Create test site with config
    const config = {
      title: 'Test Blog',
      description: 'A test blog for feed generation',
      url: 'https://example.com',
      baseurl: '',
      author: {
        name: 'Test Author',
        email: 'test@example.com',
        url: 'https://example.com/about',
      },
    };

    site = new Site(testSiteDir, config);
    renderer = new Renderer(site);
    plugin = new FeedPlugin();

    // Register the plugin
    plugin.register(renderer, site);
  });

  afterEach(() => {
    rmSync(testSiteDir, { recursive: true, force: true });
  });

  it('should have the correct name', () => {
    expect(plugin.name).toBe('jekyll-feed');
  });

  it('should generate a valid Atom feed structure', () => {
    const feed = plugin.generateFeed(site);

    expect(feed).toContain('<?xml version="1.0" encoding="utf-8"?>');
    expect(feed).toContain('<feed xmlns="http://www.w3.org/2005/Atom">');
    expect(feed).toContain('</feed>');
  });

  it('should include feed metadata', () => {
    const feed = plugin.generateFeed(site);

    expect(feed).toContain('<title>Test Blog</title>');
    expect(feed).toContain('<subtitle>A test blog for feed generation</subtitle>');
    expect(feed).toContain(
      '<link href="https://example.com/feed.xml" rel="self" type="application/atom+xml"/>'
    );
    expect(feed).toContain('<link href="https://example.com/" rel="alternate" type="text/html"/>');
  });

  it('should include author information', () => {
    const feed = plugin.generateFeed(site);

    expect(feed).toContain('<author>');
    expect(feed).toContain('<name>Test Author</name>');
    expect(feed).toContain('<email>test@example.com</email>');
    expect(feed).toContain('<uri>https://example.com/about</uri>');
    expect(feed).toContain('</author>');
  });

  it('should include generator tag', () => {
    const feed = plugin.generateFeed(site);

    expect(feed).toContain(
      '<generator uri="https://github.com/benbalter/jekyll.js" version="0.1.0">Jekyll.js</generator>'
    );
  });

  it('should include published posts in the feed', () => {
    const postFile = join(testSiteDir, '2024-01-01-test-post.md');
    writeFileSync(postFile, '---\ntitle: Test Post\ndate: 2024-01-01\n---\nPost content');

    const post = new Document(postFile, testSiteDir, DocumentType.POST);
    post.url = '/2024/01/01/test-post.html';
    site.posts.push(post);

    const feed = plugin.generateFeed(site);

    expect(feed).toContain('<entry>');
    expect(feed).toContain('<title type="html">Test Post</title>');
    expect(feed).toContain('<link href="https://example.com/2024/01/01/test-post.html"');
  });

  it('should include post published and updated dates', () => {
    const postFile = join(testSiteDir, '2024-01-01-test-post.md');
    writeFileSync(
      postFile,
      '---\ntitle: Test Post\ndate: 2024-01-01T10:00:00Z\nlast_modified_at: 2024-01-02T15:00:00Z\n---\nContent'
    );

    const post = new Document(postFile, testSiteDir, DocumentType.POST);
    post.url = '/2024/01/01/test-post.html';
    site.posts.push(post);

    const feed = plugin.generateFeed(site);

    expect(feed).toContain('<published>2024-01-01T10:00:00.000Z</published>');
    expect(feed).toContain('<updated>2024-01-02T15:00:00.000Z</updated>');
  });

  it('should include post categories', () => {
    const postFile = join(testSiteDir, '2024-01-01-test-post.md');
    writeFileSync(
      postFile,
      '---\ntitle: Test Post\ndate: 2024-01-01\ncategories: [tech, programming]\n---\nContent'
    );

    const post = new Document(postFile, testSiteDir, DocumentType.POST);
    post.url = '/2024/01/01/test-post.html';
    site.posts.push(post);

    const feed = plugin.generateFeed(site);

    expect(feed).toContain('<category term="tech"/>');
    expect(feed).toContain('<category term="programming"/>');
  });

  it('should include post excerpt', () => {
    const postFile = join(testSiteDir, '2024-01-01-test-post.md');
    writeFileSync(
      postFile,
      '---\ntitle: Test Post\ndate: 2024-01-01\nexcerpt: This is a test excerpt\n---\nFull content'
    );

    const post = new Document(postFile, testSiteDir, DocumentType.POST);
    post.url = '/2024/01/01/test-post.html';
    site.posts.push(post);

    const feed = plugin.generateFeed(site);

    expect(feed).toContain('<summary type="html">This is a test excerpt</summary>');
  });

  it('should limit number of posts in feed', () => {
    // Create 15 posts
    for (let i = 1; i <= 15; i++) {
      const postFile = join(testSiteDir, `2024-01-${i.toString().padStart(2, '0')}-post-${i}.md`);
      writeFileSync(
        postFile,
        `---\ntitle: Post ${i}\ndate: 2024-01-${i.toString().padStart(2, '0')}\n---\nContent ${i}`
      );

      const post = new Document(postFile, testSiteDir, DocumentType.POST);
      post.url = `/2024/01/${i.toString().padStart(2, '0')}/post-${i}.html`;
      site.posts.push(post);
    }

    const feed = plugin.generateFeed(site);

    // Count number of <entry> tags - should be 10 (default limit)
    const entryCount = (feed.match(/<entry>/g) || []).length;
    expect(entryCount).toBe(10);
  });

  it('should respect custom feed path', () => {
    site.config.feed = { path: '/custom-feed.xml' };
    const feed = plugin.generateFeed(site);

    expect(feed).toContain('<link href="https://example.com/custom-feed.xml" rel="self"');
  });

  it('should respect custom posts limit', () => {
    site.config.feed = { posts_limit: 3 };

    // Create 5 posts
    for (let i = 1; i <= 5; i++) {
      const postFile = join(testSiteDir, `2024-01-0${i}-post-${i}.md`);
      writeFileSync(postFile, `---\ntitle: Post ${i}\ndate: 2024-01-0${i}\n---\nContent ${i}`);

      const post = new Document(postFile, testSiteDir, DocumentType.POST);
      post.url = `/2024/01/0${i}/post-${i}.html`;
      site.posts.push(post);
    }

    const feed = plugin.generateFeed(site);

    // Count number of <entry> tags - should be 3
    const entryCount = (feed.match(/<entry>/g) || []).length;
    expect(entryCount).toBe(3);
  });

  it('should escape XML special characters', () => {
    const postFile = join(testSiteDir, '2024-01-01-test-post.md');
    writeFileSync(postFile, '---\ntitle: Test & "Quotes" <script>\ndate: 2024-01-01\n---\nContent');

    const post = new Document(postFile, testSiteDir, DocumentType.POST);
    post.url = '/2024/01/01/test-post.html';
    site.posts.push(post);

    const feed = plugin.generateFeed(site);

    expect(feed).toContain('Test &amp; &quot;Quotes&quot; &lt;script&gt;');
    expect(feed).not.toContain('<script>');
  });

  it('should sort posts by date (newest first)', () => {
    const post1File = join(testSiteDir, '2024-01-01-old-post.md');
    writeFileSync(post1File, '---\ntitle: Old Post\ndate: 2024-01-01\n---\nOld content');
    const post1 = new Document(post1File, testSiteDir, DocumentType.POST);
    post1.url = '/2024/01/01/old-post.html';

    const post2File = join(testSiteDir, '2024-01-15-new-post.md');
    writeFileSync(post2File, '---\ntitle: New Post\ndate: 2024-01-15\n---\nNew content');
    const post2 = new Document(post2File, testSiteDir, DocumentType.POST);
    post2.url = '/2024/01/15/new-post.html';

    // Add in reverse chronological order
    site.posts.push(post1);
    site.posts.push(post2);

    const feed = plugin.generateFeed(site);

    const newPostIndex = feed.indexOf('New Post');
    const oldPostIndex = feed.indexOf('Old Post');

    expect(newPostIndex).toBeLessThan(oldPostIndex);
  });
});
