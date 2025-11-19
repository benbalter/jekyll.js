import chalk from 'chalk';
import { resolve, join } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';

interface NewOptions {
  blank?: boolean;
  force?: boolean;
}

/**
 * New command handler
 * Creates a new Jekyll site scaffold
 */
export async function newCommand(path: string, options: NewOptions): Promise<void> {
  try {
    const sitePath = resolve(path);
    
    // Check if path already exists
    if (existsSync(sitePath) && !options.force) {
      throw new Error(
        `Path "${path}" already exists. Use --force to create anyway.`
      );
    }

    console.log(chalk.green(`Creating new Jekyll site at ${sitePath}`));
    
    // Create directory structure
    mkdirSync(sitePath, { recursive: true });
    
    if (!options.blank) {
      // Create standard Jekyll directory structure
      const dirs = ['_posts', '_drafts', '_layouts', '_includes', '_data'];
      dirs.forEach((dir) => {
        mkdirSync(join(sitePath, dir), { recursive: true });
      });
      
      // Create default _config.yml
      const configContent = `# Welcome to Jekyll!
#
# This config file is meant for settings that affect your whole blog, values
# which you are expected to set up once and rarely edit after that.

title: Your awesome title
description: >- # this means to ignore newlines until next key
  Write an awesome description for your new site here.

# Build settings
markdown: kramdown

# Exclude from processing
exclude:
  - Gemfile
  - Gemfile.lock
  - node_modules
  - vendor
`;
      writeFileSync(join(sitePath, '_config.yml'), configContent);
      
      // Create default index.md
      const indexContent = `---
layout: default
title: Home
---

# Welcome to Jekyll!

This is your new Jekyll site. Start editing to customize it.
`;
      writeFileSync(join(sitePath, 'index.md'), indexContent);
      
      // Create default layout
      const layoutContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{ page.title }} - {{ site.title }}</title>
</head>
<body>
  <header>
    <h1>{{ site.title }}</h1>
  </header>
  <main>
    {{ content }}
  </main>
  <footer>
    <p>{{ site.description }}</p>
  </footer>
</body>
</html>
`;
      writeFileSync(join(sitePath, '_layouts', 'default.html'), layoutContent);
      
      // Create .gitignore
      const gitignoreContent = `_site
.sass-cache
.jekyll-cache
.jekyll-metadata
`;
      writeFileSync(join(sitePath, '.gitignore'), gitignoreContent);
      
      console.log(chalk.green('✓'), 'Created directory structure');
      console.log(chalk.green('✓'), 'Created default configuration');
      console.log(chalk.green('✓'), 'Created default layout and pages');
    } else {
      // Blank site - just create minimal structure
      const configContent = `# Site configuration
title: My Site
`;
      writeFileSync(join(sitePath, '_config.yml'), configContent);
      console.log(chalk.green('✓'), 'Created blank site');
    }
    
    console.log();
    console.log(chalk.blue('Next steps:'));
    console.log(`  cd ${path}`);
    console.log('  jekyll-ts serve');
    console.log();
    console.log(chalk.green('Happy Jekyll-ing!'));
  } catch (error) {
    if (error instanceof Error) {
      console.error(chalk.red('Failed to create site:'), error.message);
    }
    throw error;
  }
}
