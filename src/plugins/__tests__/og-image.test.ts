import { OgImagePlugin } from '../og-image';
import { Site } from '../../core/Site';
import { Renderer } from '../../core/Renderer';
import { Document, DocumentType } from '../../core/Document';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import sharp from 'sharp';

describe('OgImagePlugin', () => {
  const testSiteDir = join(__dirname, '../../../../../tmp/test-og-image-site');
  let site: Site;
  let renderer: Renderer;
  let plugin: OgImagePlugin;

  beforeEach(() => {
    // Clean up and create fresh test site directory
    rmSync(testSiteDir, { recursive: true, force: true });
    mkdirSync(testSiteDir, { recursive: true });
    mkdirSync(join(testSiteDir, '_posts'), { recursive: true });

    // Create test site with config
    const config = {
      title: 'Test Site',
      url: 'https://example.com',
      baseurl: '',
      og_image: {
        output_dir: 'assets/images/og',
        verbose: false,
      },
    };

    site = new Site(testSiteDir, config);
    renderer = new Renderer(site);
    plugin = new OgImagePlugin();

    // Register the plugin
    plugin.register(renderer, site);
  });

  afterEach(() => {
    rmSync(testSiteDir, { recursive: true, force: true });
  });

  it('should have the correct name', () => {
    expect(plugin.name).toBe('jekyll-og-image');
  });

  it('should generate an image for a post', async () => {
    // Create a post file
    const postFile = join(testSiteDir, '_posts', '2024-01-01-test-post.md');
    writeFileSync(
      postFile,
      '---\ntitle: Test Post\ndescription: A test post description\n---\nPost content'
    );

    const post = new Document(postFile, testSiteDir, DocumentType.POST);
    post.url = '/2024/01/01/test-post.html';
    site.posts.push(post);

    // Generate OG images
    await plugin.generate(site, renderer);

    // Check that image was created
    const imagePath = join(testSiteDir, 'assets/images/og/posts/test-post.png');
    expect(existsSync(imagePath)).toBe(true);

    // Check that post.data.image was set
    expect(post.data.image).toBeDefined();
    expect(post.data.image.path).toBe('assets/images/og/posts/test-post.png');
    expect(post.data.image.width).toBe(1200);
    expect(post.data.image.height).toBe(600);
  });

  it('should skip posts that already have an image', async () => {
    // Create a post file with existing image
    const postFile = join(testSiteDir, '_posts', '2024-01-01-existing-image.md');
    writeFileSync(
      postFile,
      '---\ntitle: Existing Image Post\nimage: /custom/image.png\n---\nContent'
    );

    const post = new Document(postFile, testSiteDir, DocumentType.POST);
    post.url = '/2024/01/01/existing-image.html';
    site.posts.push(post);

    // Generate OG images
    await plugin.generate(site, renderer);

    // Check that the original image is preserved
    expect(post.data.image).toBe('/custom/image.png');
  });

  it('should skip unpublished posts when skip_drafts is true', async () => {
    // Create a draft post
    const postFile = join(testSiteDir, '_posts', '2024-01-01-draft-post.md');
    writeFileSync(postFile, '---\ntitle: Draft Post\ndraft: true\n---\nContent');

    const post = new Document(postFile, testSiteDir, DocumentType.POST);
    post.url = '/2024/01/01/draft-post.html';
    site.posts.push(post);

    // Generate OG images
    await plugin.generate(site, renderer);

    // Check that no image was created for draft
    const imagePath = join(testSiteDir, 'assets/images/og/posts/draft-post.png');
    expect(existsSync(imagePath)).toBe(false);
  });

  it('should use post slug for image filename', async () => {
    // Create a post file with custom slug
    const postFile = join(testSiteDir, '_posts', '2024-01-01-original-filename.md');
    writeFileSync(postFile, '---\ntitle: Custom Slug Post\nslug: custom-slug\n---\nContent');

    const post = new Document(postFile, testSiteDir, DocumentType.POST);
    post.url = '/2024/01/01/custom-slug.html';
    site.posts.push(post);

    // Generate OG images
    await plugin.generate(site, renderer);

    // Check that image uses the slug
    const imagePath = join(testSiteDir, 'assets/images/og/posts/custom-slug.png');
    expect(existsSync(imagePath)).toBe(true);
  });

  it('should not regenerate existing images unless force is true', async () => {
    // Create a post file
    const postFile = join(testSiteDir, '_posts', '2024-01-01-no-regen.md');
    writeFileSync(postFile, '---\ntitle: No Regen Post\n---\nContent');

    const post = new Document(postFile, testSiteDir, DocumentType.POST);
    post.url = '/2024/01/01/no-regen.html';
    site.posts.push(post);

    // Generate OG image first time
    await plugin.generate(site, renderer);

    const imagePath = join(testSiteDir, 'assets/images/og/posts/no-regen.png');
    const firstMtime = existsSync(imagePath) ? statSync(imagePath).mtime.getTime() : 0;

    // Wait a bit and regenerate (should skip)
    await new Promise((resolve) => setTimeout(resolve, 100));
    await plugin.generate(site, renderer);

    const secondMtime = existsSync(imagePath) ? statSync(imagePath).mtime.getTime() : 0;

    // File should not have been modified
    expect(firstMtime).toBe(secondMtime);
  });

  it('should regenerate existing images when force is true', async () => {
    // Create a post file
    const postFile = join(testSiteDir, '_posts', '2024-01-01-force-test.md');
    writeFileSync(postFile, '---\ntitle: Force Test\n---\nContent');

    const post = new Document(postFile, testSiteDir, DocumentType.POST);
    post.url = '/2024/01/01/force-test.html';
    site.posts.push(post);

    // Generate OG image first time
    await plugin.generate(site, renderer);

    const imagePath = join(testSiteDir, 'assets/images/og/posts/force-test.png');
    const firstMtime = existsSync(imagePath) ? statSync(imagePath).mtime.getTime() : 0;

    // Wait a bit and regenerate with force=true
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Create new site config with force=true
    const siteWithForce = new Site(testSiteDir, {
      title: 'Test Site',
      url: 'https://example.com',
      og_image: {
        output_dir: 'assets/images/og',
        force: true,
      },
    });
    siteWithForce.posts.push(post);
    const rendererWithForce = new Renderer(siteWithForce);

    await plugin.generate(siteWithForce, rendererWithForce);

    const secondMtime = existsSync(imagePath) ? statSync(imagePath).mtime.getTime() : 0;

    // File should have been regenerated
    expect(secondMtime).toBeGreaterThan(firstMtime);
  });

  it('should merge post-level og_image config with global config', async () => {
    // Create site with global config
    const siteWithConfig = new Site(testSiteDir, {
      title: 'Test Site',
      url: 'https://example.com',
      og_image: {
        output_dir: 'assets/og',
        canvas: {
          background_color: '#FF0000',
        },
      },
    });

    // Create a post with post-level override
    const postFile = join(testSiteDir, '_posts', '2024-01-01-config-test.md');
    writeFileSync(
      postFile,
      '---\ntitle: Config Test\nog_image:\n  canvas:\n    background_color: "#00FF00"\n---\nContent'
    );

    const post = new Document(postFile, testSiteDir, DocumentType.POST);
    post.url = '/2024/01/01/config-test.html';
    siteWithConfig.posts.push(post);

    const rendererWithConfig = new Renderer(siteWithConfig);

    // Generate OG image
    await plugin.generate(siteWithConfig, rendererWithConfig);

    // Check that image was created in the configured output dir
    const imagePath = join(testSiteDir, 'assets/og/posts/config-test.png');
    expect(existsSync(imagePath)).toBe(true);
  });

  it('should handle posts with special characters in title', async () => {
    const postFile = join(testSiteDir, '_posts', '2024-01-01-special-chars.md');
    writeFileSync(postFile, '---\ntitle: "Test & <Special> \'Characters\'"\n---\nContent');

    const post = new Document(postFile, testSiteDir, DocumentType.POST);
    post.url = '/2024/01/01/special-chars.html';
    site.posts.push(post);

    // Should not throw
    await expect(plugin.generate(site, renderer)).resolves.toBeDefined();

    const imagePath = join(testSiteDir, 'assets/images/og/posts/special-chars.png');
    expect(existsSync(imagePath)).toBe(true);
  });

  it('should use default output_dir when not configured', async () => {
    // Create site without og_image config
    const siteNoConfig = new Site(testSiteDir, {
      title: 'Test Site',
      url: 'https://example.com',
    });

    const postFile = join(testSiteDir, '_posts', '2024-01-01-default-dir.md');
    writeFileSync(postFile, '---\ntitle: Default Dir Post\n---\nContent');

    const post = new Document(postFile, testSiteDir, DocumentType.POST);
    post.url = '/2024/01/01/default-dir.html';
    siteNoConfig.posts.push(post);

    const rendererNoConfig = new Renderer(siteNoConfig);

    await plugin.generate(siteNoConfig, rendererNoConfig);

    // Should use default: assets/images/og
    const imagePath = join(testSiteDir, 'assets/images/og/posts/default-dir.png');
    expect(existsSync(imagePath)).toBe(true);
  });
});

describe('OgImagePlugin image generation', () => {
  const testSiteDir = join(__dirname, '../../../../../tmp/test-og-image-gen');
  let site: Site;
  let renderer: Renderer;
  let plugin: OgImagePlugin;

  beforeEach(() => {
    rmSync(testSiteDir, { recursive: true, force: true });
    mkdirSync(testSiteDir, { recursive: true });
    mkdirSync(join(testSiteDir, '_posts'), { recursive: true });

    const config = {
      title: 'Test Site',
      url: 'https://example.com',
      og_image: {
        output_dir: 'assets/images/og',
        domain: 'example.com',
        border_bottom: {
          width: 20,
          fill: ['#FF0000', '#00FF00', '#0000FF'],
        },
      },
    };

    site = new Site(testSiteDir, config);
    renderer = new Renderer(site);
    plugin = new OgImagePlugin();
    plugin.register(renderer, site);
  });

  afterEach(() => {
    rmSync(testSiteDir, { recursive: true, force: true });
  });

  it('should generate image with configured border colors', async () => {
    const postFile = join(testSiteDir, '_posts', '2024-01-01-border-test.md');
    writeFileSync(
      postFile,
      '---\ntitle: Border Test\ndescription: Testing border colors\n---\nContent'
    );

    const post = new Document(postFile, testSiteDir, DocumentType.POST);
    post.url = '/2024/01/01/border-test.html';
    site.posts.push(post);

    await plugin.generate(site, renderer);

    const imagePath = join(testSiteDir, 'assets/images/og/posts/border-test.png');
    expect(existsSync(imagePath)).toBe(true);

    // Verify it's a valid PNG by checking magic bytes
    const buffer = readFileSync(imagePath);
    expect(buffer[0]).toBe(0x89); // PNG magic bytes
    expect(buffer[1]).toBe(0x50);
    expect(buffer[2]).toBe(0x4e);
    expect(buffer[3]).toBe(0x47);
  });

  it('should generate image with long title (text wrapping)', async () => {
    const longTitle =
      'This is a very long title that should wrap to multiple lines when rendered on the OG image canvas';
    const postFile = join(testSiteDir, '_posts', '2024-01-01-long-title.md');
    writeFileSync(postFile, `---\ntitle: "${longTitle}"\n---\nContent`);

    const post = new Document(postFile, testSiteDir, DocumentType.POST);
    post.url = '/2024/01/01/long-title.html';
    site.posts.push(post);

    await plugin.generate(site, renderer);

    const imagePath = join(testSiteDir, 'assets/images/og/posts/long-title.png');
    expect(existsSync(imagePath)).toBe(true);
  });

  it('should generate image with logo image', async () => {
    // Create a simple test logo image using sharp

    const logoPath = join(testSiteDir, 'logo.png');
    await sharp({
      create: {
        width: 200,
        height: 200,
        channels: 3,
        background: { r: 0, g: 128, b: 255 },
      },
    })
      .png()
      .toFile(logoPath);

    // Create site with logo configured
    const siteWithLogo = new Site(testSiteDir, {
      title: 'Test Site',
      url: 'https://example.com',
      og_image: {
        output_dir: 'assets/images/og',
        image: 'logo.png',
      },
    });

    const postFile = join(testSiteDir, '_posts', '2024-01-01-logo-test.md');
    writeFileSync(postFile, '---\ntitle: Logo Test\ndescription: Testing logo image\n---\nContent');

    const post = new Document(postFile, testSiteDir, DocumentType.POST);
    post.url = '/2024/01/01/logo-test.html';
    siteWithLogo.posts.push(post);

    const rendererWithLogo = new Renderer(siteWithLogo);

    await plugin.generate(siteWithLogo, rendererWithLogo);

    const imagePath = join(testSiteDir, 'assets/images/og/posts/logo-test.png');
    expect(existsSync(imagePath)).toBe(true);

    // Verify it's a valid PNG
    const buffer = readFileSync(imagePath);
    expect(buffer[0]).toBe(0x89);
    expect(buffer[1]).toBe(0x50);
    expect(buffer[2]).toBe(0x4e);
    expect(buffer[3]).toBe(0x47);
  });

  it('should generate image with background image', async () => {
    // Create a simple test background image using sharp

    const bgPath = join(testSiteDir, 'background.png');
    await sharp({
      create: {
        width: 1200,
        height: 600,
        channels: 3,
        background: { r: 100, g: 150, b: 200 },
      },
    })
      .png()
      .toFile(bgPath);

    // Create site with background image configured
    const siteWithBg = new Site(testSiteDir, {
      title: 'Test Site',
      url: 'https://example.com',
      og_image: {
        output_dir: 'assets/images/og',
        canvas: {
          background_image: 'background.png',
        },
      },
    });

    const postFile = join(testSiteDir, '_posts', '2024-01-01-bg-test.md');
    writeFileSync(
      postFile,
      '---\ntitle: Background Test\ndescription: Testing background image\n---\nContent'
    );

    const post = new Document(postFile, testSiteDir, DocumentType.POST);
    post.url = '/2024/01/01/bg-test.html';
    siteWithBg.posts.push(post);

    const rendererWithBg = new Renderer(siteWithBg);

    await plugin.generate(siteWithBg, rendererWithBg);

    const imagePath = join(testSiteDir, 'assets/images/og/posts/bg-test.png');
    expect(existsSync(imagePath)).toBe(true);

    // Verify it's a valid PNG
    const buffer = readFileSync(imagePath);
    expect(buffer[0]).toBe(0x89);
    expect(buffer[1]).toBe(0x50);
    expect(buffer[2]).toBe(0x4e);
    expect(buffer[3]).toBe(0x47);
  });
});
