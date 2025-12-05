#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { buildCommand } from './commands/build';
import { serveCommand } from './commands/serve';
import { newCommand } from './commands/new';
import { validateCommand } from './commands/validate';
import { benchmarkCommand } from './commands/benchmark';

const program = new Command();

program
  .name('jekyll-ts')
  .description('A TypeScript reimplementation of Jekyll static site generator')
  .version('0.1.0');

// Build command
program
  .command('build')
  .description('Build your site')
  .option('-s, --source <path>', 'Source directory', '.')
  .option('-d, --destination <path>', 'Destination directory', './_site')
  .option('--config <file>', 'Custom configuration file', '_config.yml')
  .option('--drafts', 'Process and render draft posts')
  .option('--no-drafts', 'Do not render draft posts')
  .option('--future', 'Publish posts with a future date')
  .option('--no-future', 'Do not publish posts with a future date')
  .option('-w, --watch', 'Watch for changes and rebuild')
  .option('-W, --no-watch', 'Do not watch for changes')
  .option('-I, --incremental', 'Enable incremental build')
  .option('--no-incremental', 'Disable incremental build')
  .option('--verbose', 'Print verbose output')
  .option('--debug', 'Enable debug mode with enhanced diagnostics')
  .option('--profile', 'Show detailed timing information for build operations')
  .action(buildCommand);

// Serve command
program
  .command('serve')
  .description('Serve your site locally')
  .option('-s, --source <path>', 'Source directory', '.')
  .option('-d, --destination <path>', 'Destination directory', './_site')
  .option('--config <file>', 'Custom configuration file', '_config.yml')
  .option('-P, --port <port>', 'Port to listen on', '4000')
  .option('-H, --host <host>', 'Host to bind to', 'localhost')
  .option('--livereload', 'Use LiveReload to automatically refresh browsers', true)
  .option('--no-livereload', 'Disable LiveReload')
  .option('--drafts', 'Process and render draft posts')
  .option('--no-drafts', 'Do not render draft posts')
  .option('--future', 'Publish posts with a future date')
  .option('--no-future', 'Do not publish posts with a future date')
  .option('--verbose', 'Print verbose output')
  .option('--debug', 'Enable debug mode with enhanced diagnostics')
  .action(serveCommand);

// New command
program
  .command('new')
  .description('Create a new Jekyll site')
  .argument('<path>', 'Path where to create the site')
  .option('--blank', 'Create a blank site without default theme')
  .option('--force', 'Force creation even if path already exists')
  .action(newCommand);

// Validate command
program
  .command('validate')
  .description('Validate your site configuration')
  .option('-s, --source <path>', 'Source directory', '.')
  .option('--config <file>', 'Custom configuration file', '_config.yml')
  .option('--verbose', 'Print verbose output')
  .option('--strict', 'Treat warnings as errors')
  .action(validateCommand);

// Benchmark command
program
  .command('benchmark')
  .description('Benchmark site build performance')
  .option('-s, --source <path>', 'Source directory', '.')
  .option('-d, --destination <path>', 'Destination directory', './_site')
  .option('--config <file>', 'Custom configuration file', '_config.yml')
  .option(
    '-n, --runs <number>',
    'Number of benchmark runs',
    (value: string) => {
      const parsed = parseInt(value, 10);
      if (isNaN(parsed) || parsed < 1) {
        throw new Error('Number of runs must be a positive integer');
      }
      return parsed;
    },
    3
  )
  .option('--memory', 'Track memory usage during builds')
  .option('--verbose', 'Print verbose output')
  .action(benchmarkCommand);

// Error handling
program.exitOverride();

try {
  program.parse(process.argv);
} catch (error) {
  if (error instanceof Error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
