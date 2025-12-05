import { execSync, spawn } from 'child_process';
import { existsSync, readFileSync, readdirSync, rmSync, statSync } from 'fs';
import { join, resolve, relative } from 'path';

/**
 * Integration test for benbalter/benbalter.github.com
 *
 * This test validates that jekyll-ts can successfully build a real-world,
 * complex Jekyll site. The benbalter.github.com repository is a production
 * blog with hundreds of posts, multiple plugins, custom layouts, and
 * various Jekyll features.
 *
 * Test coverage:
 * - Building a large site with many posts (~150+ posts)
 * - Complex plugin configurations (jemoji, jekyll-redirect-from, jekyll-sitemap,
 *   jekyll-feed, jekyll-seo-tag, jekyll-avatar, jekyll-github-metadata,
 *   jekyll-mentions, jekyll-og-image, jekyll-include-cache)
 * - Collections support (_resume_positions)
 * - Front matter defaults for posts and pages
 * - SASS/SCSS processing
 * - Permalink configuration
 * - Various exclude patterns
 */
describe('Integration Test: benbalter/benbalter.github.com', () => {
  const projectRoot = resolve(__dirname, '../../../..');
  const testSitesDir = resolve(projectRoot, 'tmp/test-sites');
  const siteDir = join(testSitesDir, 'benbalter.github.com');
  const destDir = join(siteDir, '_site-ts');
  const destDirRuby = join(siteDir, '_site-ruby');
  const jekyllTsBin = resolve(projectRoot, 'dist/cli/index.js');

  // Track if the site is available
  let siteAvailable = false;
  let rubyJekyllAvailable = false;
  let useBundle = false;

  /**
   * Formatting constants for test output
   */
  const SEPARATOR = '─'.repeat(60);

  /**
   * Print a section header
   */
  const printHeader = (title: string): void => {
    process.stdout.write(`\n${SEPARATOR}\n`);
    process.stdout.write(`  ${title}\n`);
    process.stdout.write(`${SEPARATOR}\n`);
  };

  /**
   * Print a stat line
   */
  const printStat = (label: string, value: string): void => {
    process.stdout.write(`  ${label.padEnd(20)} ${value}\n`);
  };

  /**
   * Clone or update the benbalter.github.com repository
   */
  const ensureSiteCloned = (): boolean => {
    try {
      // Create test sites directory if it doesn't exist
      if (!existsSync(testSitesDir)) {
        execSync(`mkdir -p "${testSitesDir}"`, { stdio: 'pipe' });
      }

      // Check if site already exists
      if (existsSync(siteDir) && existsSync(join(siteDir, '_config.yml'))) {
        process.stdout.write('✓ benbalter.github.com repository already present\n');
        return true;
      }

      // Clone the repository (shallow clone to save time/space)
      process.stdout.write('⏳ Cloning benbalter/benbalter.github.com (shallow)...\n');
      execSync(
        `git clone --depth 1 https://github.com/benbalter/benbalter.github.com.git "${siteDir}"`,
        { stdio: 'pipe', timeout: 120000 }
      );

      process.stdout.write('✓ Repository cloned successfully\n');
      return true;
    } catch (error) {
      process.stdout.write(`⚠ Failed to clone repository: ${error}\n`);
      return false;
    }
  };

  /**
   * Clean up build output directories
   */
  const cleanupDirs = () => {
    if (existsSync(destDir)) {
      rmSync(destDir, { recursive: true, force: true });
    }
    if (existsSync(destDirRuby)) {
      rmSync(destDirRuby, { recursive: true, force: true });
    }
  };

  /**
   * Get all files recursively in a directory
   */
  const getFilesRecursively = (dir: string, baseDir?: string): string[] => {
    const base = baseDir || dir;
    const files: string[] = [];

    if (!existsSync(dir)) {
      return files;
    }

    const entries = readdirSync(dir);

    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        files.push(...getFilesRecursively(fullPath, base));
      } else {
        files.push(relative(base, fullPath));
      }
    }

    return files.sort();
  };

  /**
   * Benchmark a build command
   */
  const benchmarkBuild = (
    command: string,
    args: string[],
    cwd: string
  ): Promise<{ duration: number; stdout: string; stderr: string }> => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const child = spawn(command, args, {
        cwd,
        stdio: 'pipe',
        shell: true,
        env: {
          ...process.env,
          NODE_ENV: 'production',
          JEKYLL_ENV: 'production',
        },
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        const duration = Date.now() - startTime;

        if (code === 0) {
          resolve({ duration, stdout, stderr });
        } else {
          reject(new Error(`Build failed with code ${code}\nStdout: ${stdout}\nStderr: ${stderr}`));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  };

  beforeAll(() => {
    // Skip if binary not built
    if (!existsSync(jekyllTsBin)) {
      process.stdout.write('⚠ Jekyll TS binary not found - run `npm run build` first\n');
      return;
    }

    // Try to clone the site
    siteAvailable = ensureSiteCloned();

    if (!siteAvailable) {
      process.stdout.write('⚠ benbalter.github.com not available - skipping tests\n');
      return;
    }

    // Check for Ruby Jekyll
    try {
      execSync('jekyll --version', { stdio: 'pipe' });
      rubyJekyllAvailable = true;
      useBundle = false;
      process.stdout.write('✓ Ruby Jekyll detected\n');
    } catch {
      try {
        execSync('bundle exec jekyll --version', { stdio: 'pipe', cwd: siteDir });
        rubyJekyllAvailable = true;
        useBundle = true;
        process.stdout.write('✓ Ruby Jekyll detected via bundle\n');
      } catch {
        rubyJekyllAvailable = false;
        process.stdout.write('⚠ Ruby Jekyll not available\n');
      }
    }
  });

  beforeEach(() => {
    cleanupDirs();
  });

  afterEach(() => {
    cleanupDirs();
  });

  it('should build benbalter.github.com with jekyll-ts', async () => {
    if (!existsSync(jekyllTsBin)) {
      process.stdout.write('⏭ Skipping - Jekyll TS binary not built\n');
      return;
    }

    if (!siteAvailable) {
      process.stdout.write('⏭ Skipping - Site not available\n');
      return;
    }

    printHeader('🔨 Building benbalter.github.com with jekyll-ts');

    try {
      const result = await benchmarkBuild(
        'node',
        [jekyllTsBin, 'build', '-s', siteDir, '-d', destDir],
        siteDir
      );

      process.stdout.write('\n');
      printStat('Duration:', `${(result.duration / 1000).toFixed(2)}s`);

      // Check if site was built
      expect(existsSync(destDir)).toBe(true);

      // Check for key output files
      const hasIndex = existsSync(join(destDir, 'index.html'));
      const hasAbout = existsSync(join(destDir, 'about', 'index.html'));
      const hasFeed = existsSync(join(destDir, 'feed.xml'));
      const hasSitemap = existsSync(join(destDir, 'sitemap.xml'));

      printStat('index.html:', hasIndex ? '✓' : '✗');
      printStat('about/index.html:', hasAbout ? '✓' : '✗');
      printStat('feed.xml:', hasFeed ? '✓' : '✗');
      printStat('sitemap.xml:', hasSitemap ? '✓' : '✗');

      // Get total files generated
      const allFiles = getFilesRecursively(destDir);
      printStat('Total files:', allFiles.length.toString());

      // Count HTML files (posts)
      const htmlFiles = allFiles.filter((f) => f.endsWith('.html'));
      printStat('HTML files:', htmlFiles.length.toString());

      // Verify essential files exist
      expect(hasIndex).toBe(true);

      // Log success
      process.stdout.write(`\n  ✓ Build completed successfully\n`);
      process.stdout.write(`${SEPARATOR}\n`);
    } catch (error) {
      // Log the error details for debugging
      process.stdout.write(`\n  ✗ Build failed\n`);

      if (error instanceof Error) {
        process.stdout.write(`\n  Error: ${error.message}\n`);

        // Parse the error to identify missing features
        const errorMsg = error.message.toLowerCase();

        // List of known issues to track
        const knownIssues: string[] = [];

        if (errorMsg.includes('jemoji')) {
          knownIssues.push('jemoji plugin not fully supported');
        }
        if (errorMsg.includes('jekyll-redirect-from')) {
          knownIssues.push('jekyll-redirect-from plugin not fully supported');
        }
        if (errorMsg.includes('jekyll-avatar')) {
          knownIssues.push('jekyll-avatar plugin not supported');
        }
        if (errorMsg.includes('jekyll-github-metadata')) {
          knownIssues.push('jekyll-github-metadata plugin not supported');
        }
        if (errorMsg.includes('jekyll-mentions')) {
          knownIssues.push('jekyll-mentions plugin not supported');
        }
        if (errorMsg.includes('jekyll-og-image')) {
          knownIssues.push('jekyll-og-image plugin not supported');
        }
        if (errorMsg.includes('jekyll-include-cache')) {
          knownIssues.push('jekyll-include-cache plugin not supported');
        }

        if (knownIssues.length > 0) {
          process.stdout.write(`\n  Known Issues:\n`);
          knownIssues.forEach((issue) => {
            process.stdout.write(`    - ${issue}\n`);
          });
        }
      }

      process.stdout.write(`${SEPARATOR}\n`);

      // Re-throw to fail the test but with diagnostic info captured
      throw error;
    }
  }, 300000); // 5 minute timeout for large site

  it('should compare output with Ruby Jekyll (if available)', async () => {
    if (!existsSync(jekyllTsBin)) {
      process.stdout.write('⏭ Skipping - Jekyll TS binary not built\n');
      return;
    }

    if (!siteAvailable) {
      process.stdout.write('⏭ Skipping - Site not available\n');
      return;
    }

    if (!rubyJekyllAvailable) {
      process.stdout.write('⏭ Skipping - Ruby Jekyll not available\n');
      return;
    }

    printHeader('🔍 Comparing jekyll-ts vs Ruby Jekyll output');

    // Build with Jekyll TS
    process.stdout.write('\n  Building with jekyll-ts...\n');
    let tsDuration: number;
    try {
      const tsResult = await benchmarkBuild(
        'node',
        [jekyllTsBin, 'build', '-s', siteDir, '-d', destDir],
        siteDir
      );
      tsDuration = tsResult.duration;
      printStat('jekyll-ts:', `${(tsDuration / 1000).toFixed(2)}s`);
    } catch (error) {
      process.stdout.write(`  ✗ jekyll-ts build failed\n`);
      throw error;
    }

    // Build with Ruby Jekyll
    process.stdout.write('  Building with Ruby Jekyll...\n');
    let rubyDuration: number;
    try {
      const jekyllCommand = useBundle ? 'bundle' : 'jekyll';
      const jekyllArgs = useBundle
        ? ['exec', 'jekyll', 'build', '--source', siteDir, '--destination', destDirRuby]
        : ['build', '--source', siteDir, '--destination', destDirRuby];

      const rubyResult = await benchmarkBuild(jekyllCommand, jekyllArgs, siteDir);
      rubyDuration = rubyResult.duration;
      printStat('Ruby Jekyll:', `${(rubyDuration / 1000).toFixed(2)}s`);
    } catch (error) {
      process.stdout.write(`  ✗ Ruby Jekyll build failed\n`);
      throw error;
    }

    // Compare outputs
    process.stdout.write('\n');
    process.stdout.write(`  ${SEPARATOR}\n`);
    process.stdout.write('  📊 Comparison Results\n');
    process.stdout.write(`  ${SEPARATOR}\n`);

    const tsFiles = new Set(getFilesRecursively(destDir));
    const rubyFiles = new Set(getFilesRecursively(destDirRuby));

    // Files only in TS build
    const onlyInTs = [...tsFiles].filter((f) => !rubyFiles.has(f));

    // Files only in Ruby build
    const onlyInRuby = [...rubyFiles].filter((f) => !tsFiles.has(f));

    // Common files
    const commonFiles = [...tsFiles].filter((f) => rubyFiles.has(f));

    printStat('TS files:', tsFiles.size.toString());
    printStat('Ruby files:', rubyFiles.size.toString());
    printStat('Common files:', commonFiles.length.toString());
    printStat('Only in TS:', onlyInTs.length.toString());
    printStat('Only in Ruby:', onlyInRuby.length.toString());

    // Calculate match percentage
    const matchPercent = ((commonFiles.length / rubyFiles.size) * 100).toFixed(1);
    printStat('Match %:', `${matchPercent}%`);

    // Show performance comparison
    process.stdout.write('\n');
    const speedDiff = tsDuration - rubyDuration;
    const speedPercent = Math.abs((speedDiff / rubyDuration) * 100).toFixed(1);
    if (speedDiff < 0) {
      printStat('Performance:', `jekyll-ts is ${speedPercent}% faster`);
    } else if (speedDiff > 0) {
      printStat('Performance:', `jekyll-ts is ${speedPercent}% slower`);
    } else {
      printStat('Performance:', 'Equal');
    }

    // Show missing files (limited to first 10)
    if (onlyInRuby.length > 0) {
      process.stdout.write('\n  ⚠ Files missing from jekyll-ts output:\n');
      const showCount = Math.min(onlyInRuby.length, 10);
      onlyInRuby.slice(0, showCount).forEach((f) => {
        process.stdout.write(`    - ${f}\n`);
      });
      if (onlyInRuby.length > showCount) {
        process.stdout.write(`    ... and ${onlyInRuby.length - showCount} more\n`);
      }
    }

    process.stdout.write(`\n${SEPARATOR}\n`);

    // Both builds should have completed
    expect(existsSync(destDir)).toBe(true);
    expect(existsSync(destDirRuby)).toBe(true);
  }, 600000); // 10 minute timeout for both builds

  it('should identify specific feature gaps', async () => {
    if (!siteAvailable) {
      process.stdout.write('⏭ Skipping - Site not available\n');
      return;
    }

    printHeader('📋 Feature Analysis');

    // Read the site's _config.yml to identify required features
    const configPath = join(siteDir, '_config.yml');
    const configContent = readFileSync(configPath, 'utf-8');

    // Parse plugins used
    const pluginMatch = configContent.match(/plugins:\s*\n((?:\s+-\s+\S+\n?)+)/);
    const plugins: string[] = [];
    if (pluginMatch && pluginMatch[1]) {
      const pluginLines = pluginMatch[1].split('\n');
      for (const line of pluginLines) {
        const match = line.match(/^\s+-\s+(\S+)/);
        if (match && match[1]) {
          plugins.push(match[1]);
        }
      }
    }

    process.stdout.write('\n  Plugins required by site:\n');
    plugins.forEach((plugin) => {
      const supported = isPluginSupported(plugin);
      process.stdout.write(`    ${supported ? '✓' : '✗'} ${plugin}\n`);
    });

    // Check for collections
    const hasCollections = configContent.includes('collections:');
    process.stdout.write(`\n  Collections: ${hasCollections ? '✓ used' : 'not used'}\n`);

    // Check for front matter defaults
    const hasDefaults = configContent.includes('defaults:');
    process.stdout.write(`  Front matter defaults: ${hasDefaults ? '✓ used' : 'not used'}\n`);

    // Check for SASS config
    const hasSass = configContent.includes('sass:');
    process.stdout.write(`  SASS configuration: ${hasSass ? '✓ used' : 'not used'}\n`);

    // Check for permalink config
    const hasPermalink = configContent.includes('permalink:');
    process.stdout.write(`  Permalink pattern: ${hasPermalink ? '✓ used' : 'not used'}\n`);

    process.stdout.write(`\n${SEPARATOR}\n`);

    // Test passes as this is informational
    expect(true).toBe(true);
  });

  /**
   * Check if a plugin is supported by jekyll-ts
   */
  function isPluginSupported(plugin: string): boolean {
    // List of plugins supported by jekyll-ts
    const supportedPlugins = [
      'jekyll-feed',
      'jekyll-sitemap',
      'jekyll-seo-tag',
      'jekyll-redirect-from',
    ];

    return supportedPlugins.includes(plugin);
  }
});
