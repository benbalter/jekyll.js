import { JemojiPlugin, emojify, getEmoji, hasEmoji, getEmojiNames } from '../jemoji';
import { Site } from '../../core/Site';
import { Renderer } from '../../core/Renderer';
import { mkdirSync, rmSync } from 'fs';
import { join } from 'path';

describe('JemojiPlugin', () => {
  const testSiteDir = join(__dirname, '../../../../../tmp/test-jemoji-site');
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

    expect(result).toBe('Hello 😄');
  });

  describe('emojify function', () => {
    it('should convert simple emoji codes', () => {
      expect(emojify(':smile:')).toBe('😄');
      expect(emojify(':heart:')).toBe('❤️');
      expect(emojify(':+1:')).toBe('👍');
      expect(emojify(':rocket:')).toBe('🚀');
    });

    it('should handle multiple emojis', () => {
      expect(emojify(':smile: :heart: :+1:')).toBe('😄 ❤️ 👍');
    });

    it('should preserve text around emojis', () => {
      expect(emojify('Hello :smile: World :heart:!')).toBe('Hello 😄 World ❤️!');
    });

    it('should preserve unknown emoji codes', () => {
      expect(emojify(':unknown_emoji:')).toBe(':unknown_emoji:');
    });

    it('should handle empty input', () => {
      expect(emojify('')).toBe('');
    });

    it('should handle null/undefined input', () => {
      expect(emojify(null as any)).toBe('');
      expect(emojify(undefined as any)).toBe('');
    });

    it('should be case insensitive', () => {
      expect(emojify(':SMILE:')).toBe('😄');
      expect(emojify(':Smile:')).toBe('😄');
    });

    it('should handle emoji codes with underscores', () => {
      expect(emojify(':stuck_out_tongue:')).toBe('😛');
      expect(emojify(':heart_eyes:')).toBe('😍');
    });

    it('should handle emoji codes with numbers', () => {
      expect(emojify(':100:')).toBe('💯');
      expect(emojify(':+1:')).toBe('👍');
      expect(emojify(':-1:')).toBe('👎');
    });
  });

  describe('getEmoji function', () => {
    it('should return emoji character for valid name', () => {
      expect(getEmoji('smile')).toBe('😄');
      expect(getEmoji('heart')).toBe('❤️');
    });

    it('should return undefined for unknown emoji', () => {
      expect(getEmoji('unknown_emoji')).toBeUndefined();
    });

    it('should be case insensitive', () => {
      expect(getEmoji('SMILE')).toBe('😄');
    });
  });

  describe('hasEmoji function', () => {
    it('should return true for existing emoji', () => {
      expect(hasEmoji('smile')).toBe(true);
      expect(hasEmoji('heart')).toBe(true);
    });

    it('should return false for non-existing emoji', () => {
      expect(hasEmoji('unknown_emoji')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(hasEmoji('SMILE')).toBe(true);
    });
  });

  describe('getEmojiNames function', () => {
    it('should return an array of emoji names', () => {
      const names = getEmojiNames();
      expect(Array.isArray(names)).toBe(true);
      expect(names.length).toBeGreaterThan(0);
      expect(names).toContain('smile');
      expect(names).toContain('heart');
    });
  });

  describe('common GitHub emojis', () => {
    it('should support thumbs up/down', () => {
      expect(emojify(':+1:')).toBe('👍');
      expect(emojify(':thumbsup:')).toBe('👍');
      expect(emojify(':-1:')).toBe('👎');
      expect(emojify(':thumbsdown:')).toBe('👎');
    });

    it('should support celebration emojis', () => {
      expect(emojify(':tada:')).toBe('🎉');
      expect(emojify(':rocket:')).toBe('🚀');
      expect(emojify(':sparkles:')).toBe('✨');
    });

    it('should support check marks and X', () => {
      expect(emojify(':white_check_mark:')).toBe('✅');
      expect(emojify(':x:')).toBe('❌');
      expect(emojify(':warning:')).toBe('⚠️');
    });

    it('should support face emojis', () => {
      expect(emojify(':smile:')).toBe('😄');
      expect(emojify(':cry:')).toBe('😢');
      expect(emojify(':thinking:')).toBe('🤔');
      expect(emojify(':sunglasses:')).toBe('😎');
    });
  });
});
