import { AvatarPlugin, generateAvatarTag, getAvatarUrl } from '../avatar';
import { Site } from '../../core/Site';
import { Renderer } from '../../core/Renderer';
import { mkdirSync, rmSync } from 'fs';
import { join } from 'path';

describe('AvatarPlugin', () => {
  const testSiteDir = join(__dirname, '../../../../../tmp/test-avatar-site');
  let site: Site;
  let renderer: Renderer;
  let plugin: AvatarPlugin;

  beforeEach(() => {
    // Clean up and create fresh test site directory
    rmSync(testSiteDir, { recursive: true, force: true });
    mkdirSync(testSiteDir, { recursive: true });

    // Create test site with config
    const config = {
      title: 'Test Site',
      url: 'https://example.com',
    };

    site = new Site(testSiteDir, config);
    renderer = new Renderer(site);
    plugin = new AvatarPlugin();

    // Register the plugin
    plugin.register(renderer, site);
  });

  afterEach(() => {
    rmSync(testSiteDir, { recursive: true, force: true });
  });

  it('should have the correct name', () => {
    expect(plugin.name).toBe('jekyll-avatar');
  });

  it('should register the avatar tag', async () => {
    const template = '{% avatar octocat %}';
    const result = await renderer.render(template, {});

    expect(result).toContain('<img');
    expect(result).toContain('avatars.githubusercontent.com/octocat');
    expect(result).toContain('alt="octocat"');
  });

  it('should support custom size parameter', async () => {
    const template = '{% avatar octocat size=80 %}';
    const result = await renderer.render(template, {});

    expect(result).toContain('width="80"');
    expect(result).toContain('height="80"');
    expect(result).toContain('s=160'); // 2x for retina
  });

  describe('generateAvatarTag function', () => {
    it('should generate img tag for valid username', () => {
      const tag = generateAvatarTag('octocat');

      expect(tag).toContain('<img');
      expect(tag).toContain('class="avatar avatar-small"');
      // The ampersand is escaped to &amp; which is correct for HTML attributes
      expect(tag).toContain('src="https://avatars.githubusercontent.com/octocat?v=4&amp;s=80"');
      expect(tag).toContain('alt="octocat"');
      expect(tag).toContain('width="40"');
      expect(tag).toContain('height="40"');
    });

    it('should support custom size', () => {
      const tag = generateAvatarTag('octocat', 100);

      expect(tag).toContain('width="100"');
      expect(tag).toContain('height="100"');
      expect(tag).toContain('s=200'); // 2x for retina
    });

    it('should sanitize username to prevent XSS', () => {
      const tag = generateAvatarTag('<script>alert("xss")</script>');

      expect(tag).not.toContain('<script>');
      // The sanitized username doesn't contain special characters like < > " ( )
      // So "scriptalertxssscript" is what remains after sanitization
      expect(tag).toContain('scriptalertxssscript');
    });

    it('should allow hyphens and underscores in username', () => {
      const tag = generateAvatarTag('octo-cat_123');

      expect(tag).toContain('octo-cat_123');
    });

    it('should return empty string for empty username', () => {
      expect(generateAvatarTag('')).toBe('');
    });

    it('should include srcset for high-DPI displays', () => {
      const tag = generateAvatarTag('octocat', 40);

      // Ampersand is escaped in HTML attributes
      expect(tag).toContain('srcset="https://avatars.githubusercontent.com/octocat?v=4&amp;s=80 2x"');
    });
  });

  describe('getAvatarUrl function', () => {
    it('should return avatar URL for username', () => {
      const url = getAvatarUrl('octocat');

      expect(url).toBe('https://avatars.githubusercontent.com/octocat?v=4&s=40');
    });

    it('should support custom size', () => {
      const url = getAvatarUrl('octocat', 100);

      expect(url).toBe('https://avatars.githubusercontent.com/octocat?v=4&s=100');
    });

    it('should sanitize username', () => {
      const url = getAvatarUrl('octocat<script>');

      expect(url).not.toContain('<script>');
    });

    it('should return empty string for empty username', () => {
      expect(getAvatarUrl('')).toBe('');
    });
  });

  describe('variable resolution in avatar tag', () => {
    it('should resolve username from variable', async () => {
      const template = '{% avatar username %}';
      const result = await renderer.render(template, {
        username: 'octocat',
      });

      expect(result).toContain('avatars.githubusercontent.com/octocat');
    });

    it('should handle quoted username', async () => {
      const template = '{% avatar "octocat" %}';
      const result = await renderer.render(template, {});

      expect(result).toContain('avatars.githubusercontent.com/octocat');
    });
  });
});
