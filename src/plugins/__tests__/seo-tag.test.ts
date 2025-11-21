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

    expect(result).toContain('<meta property="og:image" content="https://example.com/assets/test-image.jpg">');
    expect(result).toContain('<meta name="twitter:image" content="https://example.com/assets/test-image.jpg">');
    expect(result).toContain('<meta name="twitter:card" content="summary_large_image">');
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
    expect(result).toContain('Description with &lt;tags&gt;');
    // Check that script tags are not in the meta tag values (escaped)
    expect(result).toMatch(/<meta[^>]*content="[^"]*&lt;script&gt;[^"]*"/);
  });
});
