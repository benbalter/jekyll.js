import chalk from 'chalk';
import { resolve, isAbsolute } from 'path';
import { existsSync } from 'fs';
import { loadConfig, validateConfig, printValidation, validateJekyllConfig } from '../../config';
import { logger } from '../../utils/logger';

interface ValidateOptions {
  source: string;
  config: string;
  verbose?: boolean;
  strict?: boolean;
}

/**
 * Validate command handler
 * Validates the Jekyll configuration file
 */
export async function validateCommand(options: ValidateOptions): Promise<void> {
  const isVerbose = options.verbose || false;
  const isStrict = options.strict || false;
  logger.setVerbose(isVerbose);

  try {
    // Resolve source directory from CLI option (defaults to '.')
    const sourcePath = resolve(options.source);

    // Resolve config path relative to source directory if it's a relative path
    const configPath = isAbsolute(options.config)
      ? options.config
      : resolve(sourcePath, options.config);

    logger.section('Configuration Validator');
    console.log(chalk.blue('  Validating configuration file:'), configPath);

    // Check if config file exists
    if (!existsSync(configPath)) {
      console.error(chalk.red('\n✗ Configuration file not found:'), configPath);
      process.exit(1);
    }

    // Load the configuration
    if (isVerbose) {
      console.log(chalk.gray('\n  Loading configuration...'));
    }
    const config = loadConfig(configPath, isVerbose);

    // Run basic validation (Jekyll-compatible checks)
    if (isVerbose) {
      console.log(chalk.gray('  Running basic validation...'));
    }
    const basicValidation = validateConfig(config);

    // Run Zod schema validation (type/structure checks)
    if (isVerbose) {
      console.log(chalk.gray('  Running schema validation...'));
    }
    const schemaValidation = validateJekyllConfig(config);

    // Combine results
    const hasBasicErrors = !basicValidation.valid;
    const hasSchemaErrors = !schemaValidation.success;
    const hasWarnings = basicValidation.warnings.length > 0;

    // Print results
    console.log(''); // Empty line for spacing

    // Print schema validation errors first
    if (hasSchemaErrors && schemaValidation.errors) {
      console.error(chalk.red('Schema validation errors:'));
      for (const error of schemaValidation.errors) {
        const path = error.path.length > 0 ? `${error.path.join('.')}` : 'config';
        console.error(chalk.red('  ✗'), `${path}: ${error.message}`);
      }
    }

    // Print basic validation results
    printValidation(basicValidation, isVerbose);

    // Summary
    console.log(''); // Empty line for spacing

    if (hasBasicErrors || hasSchemaErrors) {
      console.error(chalk.red('✗ Configuration validation failed'));
      console.error(chalk.gray('  Please fix the errors above and run the validator again.'));
      process.exit(1);
    }

    if (hasWarnings) {
      if (isStrict) {
        console.error(chalk.yellow('✗ Configuration has warnings (strict mode enabled)'));
        console.error(chalk.gray('  Please fix the warnings above or run without --strict.'));
        process.exit(1);
      }
      console.log(chalk.yellow('⚠ Configuration is valid with warnings'));
      console.log(chalk.gray('  Consider addressing the warnings above for best compatibility.'));
    } else {
      console.log(chalk.green('✓ Configuration is valid'));
    }

    // Print summary of validated settings if verbose
    if (isVerbose) {
      logger.section('Configuration Summary');
      console.log(chalk.gray('  Site settings:'));
      if (config.title) console.log(`    title: ${config.title}`);
      if (config.url) console.log(`    url: ${config.url}`);
      if (config.baseurl) console.log(`    baseurl: ${config.baseurl}`);

      console.log(chalk.gray('\n  Build settings:'));
      console.log(`    source: ${config.source || '.'}`);
      console.log(`    destination: ${config.destination || '_site'}`);
      if (config.markdown) console.log(`    markdown: ${config.markdown}`);
      if (config.highlighter) console.log(`    highlighter: ${config.highlighter}`);

      if (config.collections && Object.keys(config.collections).length > 0) {
        console.log(chalk.gray('\n  Collections:'));
        for (const [name, settings] of Object.entries(config.collections)) {
          console.log(`    ${name}:`, JSON.stringify(settings));
        }
      }

      if (config.plugins && config.plugins.length > 0) {
        console.log(chalk.gray('\n  Plugins:'));
        for (const plugin of config.plugins) {
          console.log(`    - ${plugin}`);
        }
      }

      if (config.defaults && config.defaults.length > 0) {
        console.log(chalk.gray('\n  Front matter defaults:'));
        console.log(`    ${config.defaults.length} default scope(s) defined`);
      }
    }
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)));
    process.exit(1);
  }
}
