/**
 * Configuration module for Jekyll.js
 * Handles loading, parsing, and validation of _config.yml
 */

export {
  JekyllConfig,
  ConfigValidation,
  loadConfig,
  getDefaultConfig,
  mergeWithDefaults,
  validateConfig,
  printValidation,
  applyFrontMatterDefaults,
  expandEnvVariables,
  expandConfigEnvVariables,
} from './Config';

// Export modern validation with Zod
export * from './validation';
