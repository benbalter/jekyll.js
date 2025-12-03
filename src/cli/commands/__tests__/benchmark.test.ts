import { execSync, spawn } from 'child_process';
import { existsSync, rmSync } from 'fs';
import { join, resolve } from 'path';
import { Site, Builder, BuildTimings, TimedOperation } from '../../../core';
import { loadConfig } from '../../../config';

/**
 * Benchmark test to compare jekyll-ts performance against Ruby Jekyll.
 * This is a full integration test that shells out to both CLIs.
 */
describe('Benchmark: Jekyll TS vs Ruby Jekyll', () => {
  const fixtureDir = resolve(__dirname, '../../../../test-fixtures/basic-site');
  const projectRoot = resolve(__dirname, '../../../..');
  const destDirTs = join(fixtureDir, '_site-ts');
  const destDirRuby = join(fixtureDir, '_site-ruby');
  const jekyllTsBin = resolve(__dirname, '../../../../dist/cli/index.js');

  // Check if Ruby Jekyll is available
  let rubyJekyllAvailable = false;
  let useBundle = false;

  /**
   * Formatting constants for consistent output
   */
  const SEPARATOR = '─'.repeat(50);
  const TIME_PAD = 8;

  /**
   * Format a duration in milliseconds to a human-readable string
   * @param ms - Duration in milliseconds
   * @returns Formatted string with ms unit, right-padded for alignment
   */
  const formatTime = (ms: number): string => {
    return `${ms.toString().padStart(TIME_PAD)}ms`;
  };

  /**
   * Print a section header with decorative borders
   * @param title - The title of the section
   */
  const printHeader = (title: string): void => {
    process.stdout.write(`\n${SEPARATOR}\n`);
    process.stdout.write(`  ${title}\n`);
    process.stdout.write(`${SEPARATOR}\n`);
  };

  /**
   * Print a key-value pair with consistent formatting
   * @param label - The label for the value
   * @param value - The value to display
   * @param indent - Number of spaces to indent (default: 2)
   */
  const printStat = (label: string, value: string, indent: number = 2): void => {
    const padding = ' '.repeat(indent);
    const labelPad = 12;
    process.stdout.write(`${padding}${label.padEnd(labelPad)} ${value}\n`);
  };

  /**
   * Print an operation timing row with name, duration, percentage, and optional details
   * @param op - The timed operation
   * @param totalDuration - Total build duration for percentage calculation
   * @param rank - Optional rank number for the operation
   */
  const printOperationRow = (op: TimedOperation, totalDuration: number, rank?: number): void => {
    const percentage = totalDuration > 0 ? ((op.duration / totalDuration) * 100).toFixed(1) : '0.0';
    const rankStr = rank !== undefined ? `${rank}. ` : '   ';
    const nameWidth = 22;
    const name = op.name.length > nameWidth ? op.name.substring(0, nameWidth - 1) + '…' : op.name;
    const details = op.details ? ` (${op.details})` : '';
    console.log(
      `  ${rankStr}${name.padEnd(nameWidth)} ${formatTime(op.duration)} ${percentage.padStart(5)}%${details}`
    );
  };

  /**
   * Helper function to clean up destination directories
   */
  const cleanupDirs = () => {
    if (existsSync(destDirTs)) {
      rmSync(destDirTs, { recursive: true, force: true });
    }
    if (existsSync(destDirRuby)) {
      rmSync(destDirRuby, { recursive: true, force: true });
    }
  };

  beforeAll(() => {
    // Skip all tests if jekyll-ts binary doesn't exist (not built yet)
    if (!existsSync(jekyllTsBin)) {
      process.stdout.write('⚠ Jekyll TS binary not found - skipping benchmark tests\n');
      process.stdout.write('   Run `npm run build` before running benchmarks\n');
      return;
    }

    // Check if Ruby Jekyll is installed (try both direct and bundle exec)
    try {
      execSync('jekyll --version', { stdio: 'pipe' });
      rubyJekyllAvailable = true;
      useBundle = false;
      process.stdout.write('✓ Ruby Jekyll detected - will run comparison benchmark\n');
    } catch (error) {
      // Try bundle exec jekyll (CI uses bundler-cache which makes bundle available)
      try {
        execSync('bundle exec jekyll --version', { stdio: 'pipe', cwd: projectRoot });
        rubyJekyllAvailable = true;
        useBundle = true;
        process.stdout.write('✓ Ruby Jekyll detected via bundle - will run comparison benchmark\n');
      } catch (bundleError) {
        rubyJekyllAvailable = false;
        process.stdout.write('⚠ Ruby Jekyll not found - will only benchmark jekyll-ts\n');
      }
    }

    // Verify fixture site exists
    expect(existsSync(fixtureDir)).toBe(true);
  });

  beforeEach(() => {
    cleanupDirs();
  });

  afterEach(() => {
    cleanupDirs();
  });

  /**
   * Helper function to benchmark a build command
   * Runs in production mode (NODE_ENV=production, JEKYLL_ENV=production)
   * to take advantage of caching and other production optimizations.
   * @param command - The command to execute (e.g., 'node', 'jekyll')
   * @param args - Array of command-line arguments
   * @param cwd - Current working directory for the command
   * @returns Promise that resolves with the build duration in milliseconds
   */
  const benchmarkBuild = (command: string, args: string[], cwd: string): Promise<number> => {
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
        const endTime = Date.now();
        const duration = endTime - startTime;

        if (code === 0) {
          resolve(duration);
        } else {
          reject(new Error(`Build failed with code ${code}\nStdout: ${stdout}\nStderr: ${stderr}`));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  };

  /**
   * Helper function to run a build with timing enabled and return timings
   * @returns Promise that resolves with build timings
   */
  const runTimedBuild = async (): Promise<BuildTimings> => {
    const configPath = join(fixtureDir, '_config.yml');
    const config = loadConfig(configPath, false);

    // Set destination to our test output directory
    config.source = fixtureDir;
    config.destination = destDirTs;

    const site = new Site(fixtureDir, config);
    const builder = new Builder(site, {
      clean: true,
      verbose: false,
      timing: true,
    });

    const timings = await builder.build();

    if (!timings) {
      throw new Error('Expected build timings but got undefined');
    }

    return timings;
  };

  it('should benchmark jekyll-ts build', async () => {
    if (!existsSync(jekyllTsBin)) {
      process.stdout.write('⏭ Skipping - Jekyll TS binary not built\n');
      return;
    }

    const duration = await benchmarkBuild(
      'node',
      [jekyllTsBin, 'build', '-s', fixtureDir, '-d', destDirTs],
      fixtureDir
    );

    printHeader('📊 Jekyll TS Build Benchmark');
    printStat('Duration:', formatTime(duration));

    // Verify output was created
    expect(existsSync(destDirTs)).toBe(true);
    expect(existsSync(join(destDirTs, 'index.html'))).toBe(true);

    // Reasonable performance threshold (should build in < 10 seconds)
    expect(duration).toBeLessThan(10000);
  }, 15000); // 15 second timeout

  it('should show most costly operations', async () => {
    printHeader('⏱️  Operation Breakdown');

    const timings = await runTimedBuild();

    // Sort operations by duration (most costly first)
    const sortedOps = [...timings.operations].sort((a, b) => b.duration - a.duration);

    // Print total duration
    console.log('');
    printStat('Total:', formatTime(timings.totalDuration));
    console.log('');

    // Print header for operations table
    console.log(
      `  ${'#'.padEnd(3)} ${'Operation'.padEnd(22)} ${'Time'.padStart(10)} ${'%'.padStart(6)}`
    );
    console.log(`  ${SEPARATOR}`);

    // Print all operations ranked by cost
    sortedOps.forEach((op, index) => {
      printOperationRow(op, timings.totalDuration, index + 1);
    });

    console.log(`  ${SEPARATOR}`);

    // Verify output was created
    expect(existsSync(destDirTs)).toBe(true);
    expect(existsSync(join(destDirTs, 'index.html'))).toBe(true);

    // Verify we got timing data
    expect(timings.operations.length).toBeGreaterThan(0);
    expect(timings.totalDuration).toBeGreaterThan(0);
  }, 15000); // 15 second timeout

  it('should run side-by-side benchmark if Ruby Jekyll is available', async () => {
    if (!existsSync(jekyllTsBin)) {
      process.stdout.write('⏭ Skipping - Jekyll TS binary not built\n');
      return;
    }

    if (!rubyJekyllAvailable) {
      process.stdout.write('⏭ Skipping Ruby Jekyll comparison (not installed)\n');
      return;
    }

    printHeader('🏁 Side-by-Side Benchmark');

    // Benchmark Jekyll TS
    const durationTs = await benchmarkBuild(
      'node',
      [jekyllTsBin, 'build', '-s', fixtureDir, '-d', destDirTs],
      fixtureDir
    );

    // Benchmark Ruby Jekyll
    const jekyllCommand = useBundle ? 'bundle' : 'jekyll';
    const jekyllArgs = useBundle
      ? ['exec', 'jekyll', 'build', '--source', fixtureDir, '--destination', destDirRuby]
      : ['build', '--source', fixtureDir, '--destination', destDirRuby];
    const jekyllCwd = useBundle ? projectRoot : fixtureDir;

    const durationRuby = await benchmarkBuild(jekyllCommand, jekyllArgs, jekyllCwd);

    // Print build times
    process.stdout.write('\n');
    printStat('Jekyll TS:', formatTime(durationTs));
    printStat('Ruby Jekyll:', formatTime(durationRuby));

    // Calculate and display comparison
    const difference = durationTs - durationRuby;
    const percentageDiff = durationRuby !== 0 ? (difference / durationRuby) * 100 : 0;

    process.stdout.write('\n');
    process.stdout.write(`  ${SEPARATOR}\n`);
    if (durationTs < durationRuby) {
      const icon = '🚀';
      process.stdout.write(`  ${icon} Jekyll TS is FASTER\n`);
      process.stdout.write(
        `     by ${Math.abs(difference)}ms (${Math.abs(percentageDiff).toFixed(1)}%)\n`
      );
    } else if (durationTs > durationRuby) {
      const icon = '🐢';
      process.stdout.write(`  ${icon} Jekyll TS is SLOWER\n`);
      process.stdout.write(`     by ${difference}ms (${percentageDiff.toFixed(1)}%)\n`);
    } else {
      process.stdout.write(`  ⚖️  Performance is EQUAL\n`);
    }
    process.stdout.write(`  ${SEPARATOR}\n`);

    // Verify both outputs were created
    expect(existsSync(destDirTs)).toBe(true);
    expect(existsSync(destDirRuby)).toBe(true);
    expect(existsSync(join(destDirTs, 'index.html'))).toBe(true);
    expect(existsSync(join(destDirRuby, 'index.html'))).toBe(true);
  }, 30000); // 30 second timeout for both builds

  it('should benchmark multiple runs for consistency', async () => {
    if (!existsSync(jekyllTsBin)) {
      process.stdout.write('⏭ Skipping - Jekyll TS binary not built\n');
      return;
    }

    const runs = 3;
    const durations: number[] = [];

    printHeader(`🔄 Consistency Test (${runs} runs)`);
    process.stdout.write('\n');

    for (let i = 0; i < runs; i++) {
      // Clean up before each run
      cleanupDirs();

      const duration = await benchmarkBuild(
        'node',
        [jekyllTsBin, 'build', '-s', fixtureDir, '-d', destDirTs],
        fixtureDir
      );

      durations.push(duration);
      printStat(`Run ${i + 1}:`, formatTime(duration));
    }

    // Calculate statistics
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    const min = Math.min(...durations);
    const max = Math.max(...durations);
    const variance =
      durations.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / durations.length;
    const stdDev = Math.sqrt(variance);

    // Print statistics table
    process.stdout.write('\n');
    process.stdout.write(`  ${SEPARATOR}\n`);
    process.stdout.write('  📊 Statistics\n');
    process.stdout.write(`  ${SEPARATOR}\n`);
    printStat('Average:', `${avg.toFixed(2).padStart(TIME_PAD)}ms`);
    printStat('Minimum:', formatTime(min));
    printStat('Maximum:', formatTime(max));
    printStat('Std Dev:', `${stdDev.toFixed(2).padStart(TIME_PAD)}ms`);
    printStat('CV (%):', `${((stdDev / avg) * 100).toFixed(1).padStart(TIME_PAD - 1)}%`);
    process.stdout.write(`  ${SEPARATOR}\n`);

    // Verify output was created on last run
    expect(existsSync(destDirTs)).toBe(true);
    expect(existsSync(join(destDirTs, 'index.html'))).toBe(true);

    // All builds should complete in reasonable time
    expect(avg).toBeLessThan(10000);
  }, 60000); // 60 second timeout for multiple runs
});
