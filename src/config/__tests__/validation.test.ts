/**
 * Tests for config validation with Zod
 */

import {
  validateJekyllConfig,
  validateAndLog,
  getDefaultConfig,
  mergeAndValidateConfig,
  validatePartialConfig,
} from '../validation';

describe('Config Validation', () => {
  describe('validateJekyllConfig', () => {
    it('should validate a valid minimal config', () => {
      const config = {
        title: 'My Site',
        url: 'https://example.com',
      };
      
      const result = validateJekyllConfig(config);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.title).toBe('My Site');
    });

    it('should validate a full config', () => {
      const config = {
        title: 'My Site',
        email: 'test@example.com',
        description: 'A test site',
        url: 'https://example.com',
        baseurl: '/blog',
        source: '.',
        destination: '_site',
        port: 4000,
        host: 'localhost',
        markdown: 'kramdown',
        highlighter: 'rouge',
        plugins: ['jekyll-feed', 'jekyll-seo-tag'],
        exclude: ['node_modules', '.git'],
      };
      
      const result = validateJekyllConfig(config);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should reject invalid email', () => {
      const config = {
        email: 'not-an-email',
      };
      
      const result = validateJekyllConfig(config);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.some(e => e.path.includes('email'))).toBe(true);
    });

    it('should reject invalid port number', () => {
      const config = {
        port: 99999, // Too high
      };
      
      const result = validateJekyllConfig(config);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should reject invalid highlighter', () => {
      const config = {
        highlighter: 'invalid-highlighter',
      };
      
      const result = validateJekyllConfig(config);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should validate modern features', () => {
      const config = {
        modern: {
          syntaxHighlighting: {
            enabled: true,
            theme: 'github-dark',
          },
          imageOptimization: {
            enabled: true,
            quality: 80,
            generateWebP: true,
          },
        },
      };
      
      const result = validateJekyllConfig(config);
      expect(result.success).toBe(true);
      expect(result.data?.modern?.syntaxHighlighting?.enabled).toBe(true);
    });

    it('should allow empty URL string', () => {
      const config = {
        url: '',
      };
      
      const result = validateJekyllConfig(config);
      expect(result.success).toBe(true);
    });
  });

  describe('getDefaultConfig', () => {
    it('should return a valid default config', () => {
      const config = getDefaultConfig();
      expect(config).toBeDefined();
      expect(config.source).toBe('.');
      expect(config.destination).toBe('./_site');
      expect(config.port).toBe(4000);
    });

    it('should have modern features disabled by default', () => {
      const config = getDefaultConfig();
      expect(config.modern?.syntaxHighlighting?.enabled).toBe(false);
      expect(config.modern?.imageOptimization?.enabled).toBe(false);
    });
  });

  describe('mergeAndValidateConfig', () => {
    it('should merge user config with defaults', () => {
      const userConfig = {
        title: 'My Site',
        port: 3000,
      };
      
      const result = mergeAndValidateConfig(userConfig);
      expect(result.success).toBe(true);
      expect(result.data?.title).toBe('My Site');
      expect(result.data?.port).toBe(3000);
      expect(result.data?.source).toBe('.'); // From defaults
    });

    it('should handle invalid user config', () => {
      const userConfig = {
        port: 'not-a-number',
      };
      
      const result = mergeAndValidateConfig(userConfig);
      expect(result.success).toBe(false);
    });
  });

  describe('validatePartialConfig', () => {
    it('should validate partial config', () => {
      const partialConfig = {
        title: 'My Site',
      };
      
      const result = validatePartialConfig(partialConfig);
      expect(result.success).toBe(true);
    });

    it('should reject invalid partial config', () => {
      const partialConfig = {
        port: 99999,
      };
      
      const result = validatePartialConfig(partialConfig);
      expect(result.success).toBe(false);
    });
  });

  describe('validateAndLog', () => {
    it('should return true for valid config', () => {
      const config = {
        title: 'My Site',
      };
      
      const result = validateAndLog(config);
      expect(result).toBe(true);
    });

    it('should return false for invalid config', () => {
      const config = {
        email: 'not-an-email',
      };
      
      // Suppress console output during test
      const originalError = console.error;
      console.error = jest.fn();
      
      const result = validateAndLog(config);
      expect(result).toBe(false);
      
      console.error = originalError;
    });
  });
});
