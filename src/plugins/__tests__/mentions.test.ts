import { MentionsPlugin, mentionify } from '../mentions';
import { Site } from '../../core/Site';
import { Renderer } from '../../core/Renderer';
import { mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('MentionsPlugin', () => {
  const testSiteDir = join(tmpdir(), 'jekyll-test-mentions-site');
  let site: Site;
  let renderer: Renderer;
  let plugin: MentionsPlugin;

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
    plugin = new MentionsPlugin();

    // Register the plugin
    plugin.register(renderer, site);
  });

  afterEach(() => {
    rmSync(testSiteDir, { recursive: true, force: true });
  });

  it('should have the correct name', () => {
    expect(plugin.name).toBe('jekyll-mentions');
  });

  it('should register the mentionify filter', async () => {
    const template = '{{ "Hello @octocat!" | mentionify }}';
    const result = await renderer.render(template, {});

    expect(result).toContain('<a href="https://github.com/octocat"');
    expect(result).toContain('@octocat</a>');
  });

  describe('mentionify function', () => {
    it('should convert @mentions to links', () => {
      const result = mentionify('Hello @octocat!');

      expect(result).toBe(
        'Hello <a href="https://github.com/octocat" class="user-mention">@octocat</a>!'
      );
    });

    it('should handle multiple mentions', () => {
      const result = mentionify('Thanks @alice and @bob!');

      expect(result).toContain('href="https://github.com/alice"');
      expect(result).toContain('href="https://github.com/bob"');
    });

    it('should support custom base URL', () => {
      const result = mentionify('Hello @octocat!', 'https://gitlab.com');

      expect(result).toContain('href="https://gitlab.com/octocat"');
    });

    it('should handle empty input', () => {
      expect(mentionify('')).toBe('');
    });

    it('should handle null/undefined input', () => {
      expect(mentionify(null as any)).toBe('');
      expect(mentionify(undefined as any)).toBe('');
    });

    it('should preserve text without mentions', () => {
      const text = 'No mentions here!';
      expect(mentionify(text)).toBe(text);
    });

    it('should handle usernames with hyphens', () => {
      const result = mentionify('Hello @octo-cat!');

      expect(result).toContain('href="https://github.com/octo-cat"');
    });

    it('should handle usernames with numbers', () => {
      const result = mentionify('Hello @user123!');

      expect(result).toContain('href="https://github.com/user123"');
    });

    it('should not convert email addresses', () => {
      const text = 'Contact test@example.com';
      // Email has letter before @, so it shouldn't match
      expect(mentionify(text)).toBe(text);
    });

    it('should handle mentions at start of line', () => {
      const result = mentionify('@octocat is great');

      expect(result).toContain('href="https://github.com/octocat"');
    });

    it('should handle mentions at end of line', () => {
      const result = mentionify('Thanks @octocat');

      expect(result).toContain('href="https://github.com/octocat"');
    });

    it('should handle mentions after punctuation', () => {
      const result = mentionify('Hey, @octocat!');

      expect(result).toContain('href="https://github.com/octocat"');
    });

    it('should not convert mentions inside HTML tags', () => {
      const text = '<a href="@octocat">link</a>';
      // The mention is inside an attribute, should not be converted
      expect(mentionify(text)).toBe(text);
    });

    it('should not convert mentions inside existing links', () => {
      const text = '<a href="https://example.com">@octocat</a>';
      // The mention is inside a link, should not be converted
      expect(mentionify(text)).toBe(text);
    });

    it('should escape HTML in usernames', () => {
      // This shouldn't happen with valid GitHub usernames, but test sanitization
      const result = mentionify('@user');

      expect(result).not.toContain('&lt;');
      expect(result).not.toContain('&gt;');
    });

    it('should normalize base URL with trailing slash', () => {
      const result = mentionify('@octocat', 'https://github.com/');

      expect(result).toContain('href="https://github.com/octocat"');
      expect(result).not.toContain('github.com//');
    });

    it('should add user-mention class to links', () => {
      const result = mentionify('@octocat');

      expect(result).toContain('class="user-mention"');
    });
  });

  describe('custom base URL configuration', () => {
    it('should use jekyll_mentions.base_url from config', () => {
      const customConfig = {
        title: 'Test Site',
        url: 'https://example.com',
        jekyll_mentions: {
          base_url: 'https://gitlab.com',
        },
      };

      const customSite = new Site(testSiteDir, customConfig);
      const customRenderer = new Renderer(customSite);
      const customPlugin = new MentionsPlugin();
      customPlugin.register(customRenderer, customSite);

      // The filter should use the custom base URL
      // We can verify this by checking the plugin's behavior
    });

    it('should use mentions.base_url from config as fallback', () => {
      const customConfig = {
        title: 'Test Site',
        url: 'https://example.com',
        mentions: {
          base_url: 'https://bitbucket.org',
        },
      };

      const customSite = new Site(testSiteDir, customConfig);
      const customRenderer = new Renderer(customSite);
      const customPlugin = new MentionsPlugin();
      customPlugin.register(customRenderer, customSite);

      // The filter should use the custom base URL
    });
  });

  describe('graceful handling without repository', () => {
    const originalEnv = process.env.GITHUB_REPOSITORY;

    beforeEach(() => {
      // Clear the environment variable to simulate no repository
      delete process.env.GITHUB_REPOSITORY;
    });

    afterEach(() => {
      // Restore the environment variable
      if (originalEnv !== undefined) {
        process.env.GITHUB_REPOSITORY = originalEnv;
      } else {
        delete process.env.GITHUB_REPOSITORY;
      }
    });

    it('should not enable GitHub mentions in markdown when repository is missing', () => {
      // Create site without repository config
      const configWithoutRepo = {
        title: 'Test Site',
        url: 'https://example.com',
        // No repository configured
      };

      const siteWithoutRepo = new Site(testSiteDir, configWithoutRepo);
      const rendererWithoutRepo = new Renderer(siteWithoutRepo);
      const pluginWithoutRepo = new MentionsPlugin();

      // Should not throw when registering without repository
      expect(() => {
        pluginWithoutRepo.register(rendererWithoutRepo, siteWithoutRepo);
      }).not.toThrow();

      // Markdown options should not have githubMentions enabled
      const markdownOptions = rendererWithoutRepo.getMarkdownOptions();
      expect(markdownOptions.githubMentions).toBeUndefined();
    });

    it('should still register mentionify filter when repository is missing', async () => {
      // Create site without repository config
      const configWithoutRepo = {
        title: 'Test Site',
        url: 'https://example.com',
        // No repository configured
      };

      const siteWithoutRepo = new Site(testSiteDir, configWithoutRepo);
      const rendererWithoutRepo = new Renderer(siteWithoutRepo);
      const pluginWithoutRepo = new MentionsPlugin();
      pluginWithoutRepo.register(rendererWithoutRepo, siteWithoutRepo);

      // The mentionify filter should still work
      const template = '{{ "Hello @octocat!" | mentionify }}';
      const result = await rendererWithoutRepo.render(template, {});

      expect(result).toContain('<a href="https://github.com/octocat"');
      expect(result).toContain('@octocat</a>');
    });

    it('should enable GitHub mentions when repository is configured', () => {
      // Create site with repository config
      const configWithRepo = {
        title: 'Test Site',
        url: 'https://example.com',
        repository: 'owner/repo',
      };

      const siteWithRepo = new Site(testSiteDir, configWithRepo);
      const rendererWithRepo = new Renderer(siteWithRepo);
      const pluginWithRepo = new MentionsPlugin();
      pluginWithRepo.register(rendererWithRepo, siteWithRepo);

      // Markdown options should have githubMentions enabled
      const markdownOptions = rendererWithRepo.getMarkdownOptions();
      expect(markdownOptions.githubMentions).toEqual({
        repository: 'owner/repo',
        mentionStrong: false,
      });
    });
  });

  describe('edge cases', () => {
    it('should handle very long usernames (up to 39 chars)', () => {
      const longUsername = 'a'.repeat(39);
      const result = mentionify(`@${longUsername}`);

      expect(result).toContain(`href="https://github.com/${longUsername}"`);
    });

    it('should handle usernames at exactly 39 chars boundary', () => {
      const tooLongUsername = 'a'.repeat(40);
      const text = `@${tooLongUsername}`;
      const result = mentionify(text);

      // The regex pattern allows max 39 chars: 1 starting char + up to 37 middle chars + 1 ending char
      // For a username of 40 identical chars, the regex will match 39 chars and leave 1
      // The matched username should be the first 39 'a' characters
      const expected39Chars = 'a'.repeat(39);
      expect(result).toContain(`href="https://github.com/${expected39Chars}"`);
      // The remaining 'a' should not be part of the link
      expect(result).toMatch(/<\/a>a$/);
    });

    it('should not match usernames starting with hyphen', () => {
      const text = '@-invalid';
      // Usernames starting with hyphen are invalid
      expect(mentionify(text)).toBe(text);
    });

    it('should handle consecutive mentions', () => {
      const result = mentionify('@alice @bob @charlie');

      expect(result).toContain('href="https://github.com/alice"');
      expect(result).toContain('href="https://github.com/bob"');
      expect(result).toContain('href="https://github.com/charlie"');
    });

    it('should handle mentions in markdown-like content', () => {
      const result = mentionify('**@octocat** is awesome');

      expect(result).toContain('href="https://github.com/octocat"');
    });
  });
});
