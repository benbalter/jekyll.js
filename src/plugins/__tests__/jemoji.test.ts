import { JemojiPlugin, emojify, getEmoji, hasEmoji, findEmoji } from '../jemoji';
import { Site } from '../../core/Site';
import { Renderer } from '../../core/Renderer';
import { mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('JemojiPlugin', () => {
  const testSiteDir = join(tmpdir(), 'jekyll-test-jemoji-site');
  let site: Site;
  let renderer: Renderer;
  let plugin: JemojiPlugin;

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
    plugin = new JemojiPlugin();

    // Register the plugin
    plugin.register(renderer, site);
  });

  afterEach(() => {
    rmSync(testSiteDir, { recursive: true, force: true });
  });

  it('should have the correct name', () => {
    expect(plugin.name).toBe('jemoji');
  });

  it('should register the emojify filter', async () => {
    const template = '{{ "Hello :smile:" | emojify }}';
    const result = await renderer.render(template, {});

    expect(result).toContain('😄');
  });

  describe('emojify function', () => {
    it('should convert simple emoji codes', () => {
      expect(emojify(':smile:')).toContain('😄');
      expect(emojify(':heart:')).toContain('❤');
      expect(emojify(':+1:')).toBe('👍');
      expect(emojify(':rocket:')).toBe('🚀');
    });

    it('should handle multiple emojis', () => {
      const result = emojify(':smile: :heart: :+1:');
      expect(result).toContain('😄');
      expect(result).toContain('👍');
    });

    it('should preserve text around emojis', () => {
      const result = emojify('Hello :smile: World :heart:!');
      expect(result).toContain('Hello');
      expect(result).toContain('World');
      expect(result).toContain('😄');
    });

    it('should preserve unknown emoji codes', () => {
      expect(emojify(':unknown_emoji_code_xyz:')).toBe(':unknown_emoji_code_xyz:');
    });

    it('should handle empty input', () => {
      expect(emojify('')).toBe('');
    });

    it('should handle null/undefined input', () => {
      expect(emojify(null as any)).toBe('');
      expect(emojify(undefined as any)).toBe('');
    });

    it('should handle emoji codes with underscores', () => {
      expect(emojify(':stuck_out_tongue:')).toContain('😛');
      expect(emojify(':heart_eyes:')).toContain('😍');
    });

    it('should handle emoji codes with numbers', () => {
      expect(emojify(':100:')).toBe('💯');
      expect(emojify(':+1:')).toBe('👍');
      expect(emojify(':-1:')).toBe('👎');
    });
  });

  describe('getEmoji function', () => {
    it('should return emoji character for valid name', () => {
      expect(getEmoji('smile')).toContain('😄');
      expect(getEmoji('heart')).toContain('❤');
    });

    it('should return undefined for unknown emoji', () => {
      expect(getEmoji('unknown_emoji_code_xyz')).toBeUndefined();
    });
  });

  describe('hasEmoji function', () => {
    it('should return true for existing emoji', () => {
      expect(hasEmoji('smile')).toBe(true);
      expect(hasEmoji('heart')).toBe(true);
    });

    it('should return false for non-existing emoji', () => {
      expect(hasEmoji('unknown_emoji_code_xyz')).toBe(false);
    });
  });

  describe('findEmoji function', () => {
    it('should find emoji by name', () => {
      const result = findEmoji('smile');
      expect(result).toBeDefined();
      expect(result?.emoji).toContain('😄');
    });

    it('should return undefined for unknown emoji', () => {
      expect(findEmoji('unknown_emoji_code_xyz')).toBeUndefined();
    });
  });

  describe('common GitHub emojis', () => {
    it('should support thumbs up/down', () => {
      expect(emojify(':+1:')).toBe('👍');
      expect(emojify(':-1:')).toBe('👎');
    });

    it('should support celebration emojis', () => {
      expect(emojify(':tada:')).toBe('🎉');
      expect(emojify(':rocket:')).toBe('🚀');
      expect(emojify(':sparkles:')).toBe('✨');
    });

    it('should support check marks and X', () => {
      expect(emojify(':white_check_mark:')).toBe('✅');
      expect(emojify(':x:')).toBe('❌');
      expect(emojify(':warning:')).toContain('⚠');
    });

    it('should support face emojis', () => {
      expect(emojify(':smile:')).toContain('😄');
      expect(emojify(':cry:')).toContain('😢');
      expect(emojify(':thinking:')).toContain('🤔');
      expect(emojify(':sunglasses:')).toContain('😎');
    });
  });
});
