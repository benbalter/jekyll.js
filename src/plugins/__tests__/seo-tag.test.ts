import { SeoTagPlugin } from '../seo-tag';
import { Site } from '../../core/Site';
import { Renderer } from '../../core/Renderer';
import { mkdirSync, rmSync } from 'fs';
import { join } from 'path';

describe('SeoTagPlugin', () => {
  const testSiteDir = join(__dirname, '../../../../../tmp/test-seo-site');
  let site: Site;
  let renderer: Renderer;
  let plugin: SeoTagPlugin;

  beforeEach(() => {
    // Clean up and create fresh test site directory
    rmSync(testSiteDir, { recursive: true, force: true });
    mkdirSync(testSiteDir, { recursive: true });

    // Create test site with config
    const config = {
      title: 'Test Site',
      description: 'A test site for SEO',
      url: 'https://example.com',
      baseurl: '',
      author: {
        name: 'Test Author',
        email: 'test@example.com',
      },
      twitter: {
        username: '@testauthor',
      },
    };

    site = new Site(testSiteDir, config);
    renderer = new Renderer(site);
    plugin = new SeoTagPlugin();

    // Register the plugin
    plugin.register(renderer, site);
  });

  afterEach(() => {
    rmSync(testSiteDir, { recursive: true, force: true });
  });

  it('should have the correct name', () => {
    expect(plugin.name).toBe('jekyll-seo-tag');
  });

  it('should register the seo tag', async () => {
    const template = '{% seo %}';
    const result = await renderer.render(template, {
      page: {
        title: 'Test Page',
        description: 'Test description',
        url: '/test-page/',
      },
    });

    expect(result).toContain('<title>Test Page | Test Site</title>');
    expect(result).toContain('<meta name="description" content="Test description">');
    expect(result).toContain('<link rel="canonical" href="https://example.com/test-page/">');
  });

  it('should generate Open Graph tags', async () => {
    const template = '{% seo %}';
    const result = await renderer.render(template, {
      page: {
        title: 'OG Test',
        description: 'OG description',
        url: '/og-test/',
      },
    });

    expect(result).toContain('<meta property="og:title" content="OG Test">');
    expect(result).toContain('<meta property="og:description" content="OG description">');
    expect(result).toContain('<meta property="og:url" content="https://example.com/og-test/">');
    expect(result).toContain('<meta property="og:site_name" content="Test Site">');
    expect(result).toContain('<meta property="og:type" content="website">');
  });

  it('should generate Twitter Card tags', async () => {
    const template = '{% seo %}';
    const result = await renderer.render(template, {
      page: {
        title: 'Twitter Test',
        description: 'Twitter description',
        url: '/twitter-test/',
      },
    });

    expect(result).toContain('<meta name="twitter:card" content="summary">');
    expect(result).toContain('<meta name="twitter:title" content="Twitter Test">');
    expect(result).toContain('<meta name="twitter:description" content="Twitter description">');
    expect(result).toContain('<meta name="twitter:site" content="@testauthor">');
  });

  it('should handle article type for posts', async () => {
    const template = '{% seo %}';
    const result = await renderer.render(template, {
      page: {
        title: 'Blog Post',
        description: 'Post description',
        url: '/2024/01/01/blog-post/',
        layout: 'post',
        date: '2024-01-01T00:00:00Z',
      },
    });

    expect(result).toContain('<meta property="og:type" content="article">');
    expect(result).toContain('<meta property="article:published_time"');
  });

  it('should generate JSON-LD structured data', async () => {
    const template = '{% seo %}';
    const result = await renderer.render(template, {
      page: {
        title: 'JSON-LD Test',
        description: 'JSON-LD description',
        url: '/json-ld/',
        layout: 'post',
        date: '2024-01-01T00:00:00Z',
      },
    });

    expect(result).toContain('<script type="application/ld+json">');
    expect(result).toContain('"@context":"https://schema.org"');
    expect(result).toContain('"@type":"BlogPosting"');
  });

  it('should handle pages with images', async () => {
    const template = '{% seo %}';
    const result = await renderer.render(template, {
      page: {
        title: 'Image Test',
        description: 'Image description',
        url: '/image-test/',
        image: '/assets/test-image.jpg',
      },
    });

    expect(result).toContain(
      '<meta property="og:image" content="https://example.com/assets/test-image.jpg">'
    );
    expect(result).toContain(
      '<meta name="twitter:image" content="https://example.com/assets/test-image.jpg">'
    );
    expect(result).toContain('<meta name="twitter:card" content="summary_large_image">');
  });

  it('should handle images without leading slash', async () => {
    const template = '{% seo %}';
    const result = await renderer.render(template, {
      page: {
        title: 'Image Test',
        description: 'Image description',
        url: '/image-test/',
        image: 'assets/images/og/posts/test-image.png',
      },
    });

    expect(result).toContain(
      '<meta property="og:image" content="https://example.com/assets/images/og/posts/test-image.png">'
    );
    expect(result).toContain(
      '<meta name="twitter:image" content="https://example.com/assets/images/og/posts/test-image.png">'
    );
  });

  it('should handle logo without leading slash in JSON-LD', async () => {
    // Setup site with logo
    site.config.logo = 'assets/logo.png';

    const template = '{% seo %}';
    const result = await renderer.render(template, {
      page: {
        title: 'Test Post',
        url: '/test/',
        layout: 'post',
        date: '2024-01-01T00:00:00Z',
      },
    });

    expect(result).toContain(
      '"logo":{"@type":"ImageObject","url":"https://example.com/assets/logo.png"}'
    );
  });

  it('should handle images without leading slash with baseurl', async () => {
    site.config.baseurl = '/blog';

    const template = '{% seo %}';
    const result = await renderer.render(template, {
      page: {
        title: 'Image Test',
        url: '/test/',
        image: 'assets/images/og/test.png',
      },
    });

    expect(result).toContain(
      '<meta property="og:image" content="https://example.com/blog/assets/images/og/test.png">'
    );
  });

  it('should escape HTML in metadata', async () => {
    const template = '{% seo %}';
    const result = await renderer.render(template, {
      page: {
        title: 'Test & "Quotes" <script>',
        description: 'Description with <tags>',
        url: '/escape-test/',
      },
    });

    expect(result).toContain('Test &amp; &quot;Quotes&quot; &lt;script&gt;');
    // HTML tags in description are stripped during markdown processing
    // This matches Jekyll's behavior of markdownify | strip_html
    expect(result).toContain('<meta name="description" content="Description with">');
    // Check that script tags in title are properly escaped
    expect(result).toMatch(/<title>[^<]*&lt;script&gt;[^<]*<\/title>/);
  });

  it('should process markdown in description fields', async () => {
    const template = '{% seo %}';
    const result = await renderer.render(template, {
      page: {
        title: 'Markdown Test',
        description: 'This is **bold** and this is *italic* text',
        url: '/markdown-test/',
      },
    });

    // Markdown should be converted to HTML then stripped for meta tags
    // **bold** becomes <strong>bold</strong> then "bold"
    // *italic* becomes <em>italic</em> then "italic"
    expect(result).toContain(
      '<meta name="description" content="This is bold and this is italic text">'
    );
    expect(result).toContain(
      '<meta property="og:description" content="This is bold and this is italic text">'
    );
    expect(result).toContain(
      '<meta name="twitter:description" content="This is bold and this is italic text">'
    );
  });

  it('should handle markdown with links in description', async () => {
    const template = '{% seo %}';
    const result = await renderer.render(template, {
      page: {
        title: 'Link Test',
        description: 'Check out [this link](https://example.com) for more info',
        url: '/link-test/',
      },
    });

    // Markdown links should be converted to HTML then stripped
    // [text](url) becomes <a href="url">text</a> then just "text"
    expect(result).toContain(
      '<meta name="description" content="Check out this link for more info">'
    );
  });

  it('should handle markdown with code in description', async () => {
    const template = '{% seo %}';
    const result = await renderer.render(template, {
      page: {
        title: 'Code Test',
        description: 'Use `npm install` to install packages',
        url: '/code-test/',
      },
    });

    // Inline code should be converted to HTML then stripped
    // `code` becomes <code>code</code> then just "code"
    expect(result).toContain(
      '<meta name="description" content="Use npm install to install packages">'
    );
  });
});
