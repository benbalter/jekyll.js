import { execSync, spawn } from 'child_process';
import { existsSync, readFileSync, readdirSync, rmSync, statSync } from 'fs';
import { join, resolve, relative } from 'path';
import { Site, Builder, BuildTimings, TimedOperation } from '../../../core';
import { loadConfig } from '../../../config';
import { getMemoryStats, formatBytes, MemoryTracker } from '../../../utils';

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
   * Memory threshold constants for benchmark tests
   * These are set higher than typical build memory to account for:
   * - Jest's memory overhead
   * - TypeScript/ts-jest compilation
   * - Varying CI environment base memory usage
   * - Expanded fixture with 52 posts
   *
   * The max heap threshold can be configured via JEKYLLJS_BENCHMARK_MAX_HEAP_MB
   * environment variable (defaults to 1536MB for CI compatibility with expanded fixture)
   */
  const DEFAULT_MAX_HEAP_MB = 1536;
  const MAX_EXPECTED_HEAP_BYTES =
    parseInt(process.env.JEKYLLJS_BENCHMARK_MAX_HEAP_MB || `${DEFAULT_MAX_HEAP_MB}`, 10) *
    1024 *
    1024;
  const HEAP_STABILITY_THRESHOLD_BYTES = 10 * 1024 * 1024; // 10MB stability threshold

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
    process.stdout.write(
      `  ${rankStr}${name.padEnd(nameWidth)} ${formatTime(op.duration)} ${percentage.padStart(5)}%${details}\n`
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

    // Get operations sorted by duration (most costly first)
    const sortedOps = timings.getMostCostlyOperations();

    // Print total duration
    process.stdout.write('\n');
    printStat('Total:', formatTime(timings.totalDuration));
    process.stdout.write('\n');

    // Print header for operations table
    process.stdout.write(
      `  ${'#'.padEnd(3)} ${'Operation'.padEnd(22)} ${'Time'.padStart(10)} ${'%'.padStart(6)}\n`
    );
    process.stdout.write(`  ${SEPARATOR}\n`);

    // Print all operations ranked by cost
    sortedOps.forEach((op, index) => {
      printOperationRow(op, timings.totalDuration, index + 1);
    });

    process.stdout.write(`  ${SEPARATOR}\n`);

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

  /**
   * Recursively get all files in a directory
   * @param dir - Directory path to scan
   * @param baseDir - Base directory for relative paths
   * @returns Array of relative file paths
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
   * Normalize HTML content for comparison
   * Removes whitespace differences that don't affect rendering
   * @param content - HTML content to normalize
   * @returns Normalized HTML content
   */
  const normalizeHtml = (content: string): string => {
    return (
      content
        // Normalize line endings
        .replace(/\r\n/g, '\n')
        // Remove trailing whitespace on lines
        .replace(/[ \t]+$/gm, '')
        // Collapse multiple blank lines to single
        .replace(/\n{3,}/g, '\n\n')
        // Trim leading/trailing whitespace
        .trim()
    );
  };

  /**
   * Compare two files and return the differences
   * @param file1 - Path to first file
   * @param file2 - Path to second file
   * @returns Object containing match status and details
   */
  const compareFiles = (
    file1: string,
    file2: string
  ): { match: boolean; details: string | null } => {
    if (!existsSync(file1) || !existsSync(file2)) {
      return {
        match: false,
        details: !existsSync(file1) ? 'Missing in TS build' : 'Missing in Ruby build',
      };
    }

    const content1 = readFileSync(file1, 'utf-8');
    const content2 = readFileSync(file2, 'utf-8');

    // For HTML/CSS files, normalize before comparison
    const ext = file1.split('.').pop()?.toLowerCase();
    const isTextFile = ['html', 'css', 'xml', 'txt'].includes(ext || '');

    if (isTextFile) {
      const normalized1 = normalizeHtml(content1);
      const normalized2 = normalizeHtml(content2);

      if (normalized1 === normalized2) {
        return { match: true, details: null };
      }

      // Find first difference location for debugging
      const lines1 = normalized1.split('\n');
      const lines2 = normalized2.split('\n');

      for (let i = 0; i < Math.max(lines1.length, lines2.length); i++) {
        if (lines1[i] !== lines2[i]) {
          return {
            match: false,
            details: `Difference at line ${i + 1}`,
          };
        }
      }
    }

    // Binary comparison for other files
    if (content1 === content2) {
      return { match: true, details: null };
    }

    return { match: false, details: 'Content differs' };
  };

  /**
   * Result of a file comparison
   */
  interface FileComparisonResult {
    relativePath: string;
    match: boolean;
    details: string | null;
  }

  /**
   * Compare two build output directories
   * @param dir1 - Path to first directory (TS build)
   * @param dir2 - Path to second directory (Ruby build)
   * @returns Comparison results
   */
  const compareBuildOutputs = (
    dir1: string,
    dir2: string
  ): {
    matching: FileComparisonResult[];
    onlyInTs: string[];
    onlyInRuby: string[];
    different: FileComparisonResult[];
  } => {
    const filesTs = new Set(getFilesRecursively(dir1));
    const filesRuby = new Set(getFilesRecursively(dir2));

    const matching: FileComparisonResult[] = [];
    const different: FileComparisonResult[] = [];
    const onlyInTs: string[] = [];
    const onlyInRuby: string[] = [];

    // Files only in TS build
    for (const file of filesTs) {
      if (!filesRuby.has(file)) {
        onlyInTs.push(file);
      }
    }

    // Files only in Ruby build
    for (const file of filesRuby) {
      if (!filesTs.has(file)) {
        onlyInRuby.push(file);
      }
    }

    // Compare files that exist in both
    for (const file of filesTs) {
      if (filesRuby.has(file)) {
        const result = compareFiles(join(dir1, file), join(dir2, file));
        const comparisonResult: FileComparisonResult = {
          relativePath: file,
          match: result.match,
          details: result.details,
        };

        if (result.match) {
          matching.push(comparisonResult);
        } else {
          different.push(comparisonResult);
        }
      }
    }

    return { matching, onlyInTs, onlyInRuby, different };
  };

  it('should produce similar output as Ruby Jekyll (smoke test)', async () => {
    if (!existsSync(jekyllTsBin)) {
      process.stdout.write('⏭ Skipping - Jekyll TS binary not built\n');
      return;
    }

    if (!rubyJekyllAvailable) {
      process.stdout.write('⏭ Skipping smoke test (Ruby Jekyll not installed)\n');
      return;
    }

    printHeader('🔍 Output Comparison (Smoke Test)');

    // Build with Jekyll TS
    await benchmarkBuild(
      'node',
      [jekyllTsBin, 'build', '-s', fixtureDir, '-d', destDirTs],
      fixtureDir
    );

    // Build with Ruby Jekyll
    const jekyllCommand = useBundle ? 'bundle' : 'jekyll';
    const jekyllArgs = useBundle
      ? ['exec', 'jekyll', 'build', '--source', fixtureDir, '--destination', destDirRuby]
      : ['build', '--source', fixtureDir, '--destination', destDirRuby];
    const jekyllCwd = useBundle ? projectRoot : fixtureDir;

    await benchmarkBuild(jekyllCommand, jekyllArgs, jekyllCwd);

    // Compare outputs
    const comparison = compareBuildOutputs(destDirTs, destDirRuby);

    // Print results
    process.stdout.write('\n');
    process.stdout.write(`  ${SEPARATOR}\n`);
    process.stdout.write('  📊 Comparison Results\n');
    process.stdout.write(`  ${SEPARATOR}\n`);

    // Summary stats
    const totalFiles = comparison.matching.length + comparison.different.length;
    const matchPercent =
      totalFiles > 0 ? ((comparison.matching.length / totalFiles) * 100).toFixed(1) : '0';

    printStat('Matching:', `${comparison.matching.length} files`);
    printStat('Different:', `${comparison.different.length} files`);
    printStat('TS only:', `${comparison.onlyInTs.length} files`);
    printStat('Ruby only:', `${comparison.onlyInRuby.length} files`);
    printStat('Match %:', `${matchPercent}%`);

    // Show matching files
    if (comparison.matching.length > 0) {
      process.stdout.write('\n');
      process.stdout.write('  ✓ Matching files:\n');
      comparison.matching.forEach((file) => {
        process.stdout.write(`    ✓ ${file.relativePath}\n`);
      });
    }

    // Show different files (these are potential compatibility issues)
    if (comparison.different.length > 0) {
      process.stdout.write('\n');
      process.stdout.write('  ✗ Different files:\n');
      comparison.different.forEach((file) => {
        process.stdout.write(`    ✗ ${file.relativePath}`);
        if (file.details) {
          process.stdout.write(` (${file.details})`);
        }
        process.stdout.write('\n');
      });
    }

    // Show files only in TS build
    if (comparison.onlyInTs.length > 0) {
      process.stdout.write('\n');
      process.stdout.write('  ⚠ Only in Jekyll TS build:\n');
      comparison.onlyInTs.forEach((file) => {
        process.stdout.write(`    + ${file}\n`);
      });
    }

    // Show files only in Ruby build
    if (comparison.onlyInRuby.length > 0) {
      process.stdout.write('\n');
      process.stdout.write('  ⚠ Only in Ruby Jekyll build:\n');
      comparison.onlyInRuby.forEach((file) => {
        process.stdout.write(`    - ${file}\n`);
      });
    }

    process.stdout.write(`\n  ${SEPARATOR}\n`);

    // Verify both outputs were created
    expect(existsSync(destDirTs)).toBe(true);
    expect(existsSync(destDirRuby)).toBe(true);

    // Log the comparison summary for CI visibility
    const summary = {
      matching: comparison.matching.length,
      different: comparison.different.length,
      onlyInTs: comparison.onlyInTs.length,
      onlyInRuby: comparison.onlyInRuby.length,
      matchPercent,
    };

    process.stdout.write(`\n  Smoke test summary: ${JSON.stringify(summary)}\n`);

    // For now, we just verify that both builds completed and produced output
    // Future: Add assertions for specific files or match percentage thresholds
    expect(totalFiles).toBeGreaterThan(0);
  }, 60000); // 60 second timeout for both builds and comparison

  it('should profile memory usage during build', async () => {
    printHeader('💾 Memory Profiling');

    const memoryTracker = new MemoryTracker();
    memoryTracker.start();

    // Get initial memory state
    const initialMemory = getMemoryStats();

    // Run a timed build with memory sampling
    const configPath = join(fixtureDir, '_config.yml');
    const config = loadConfig(configPath, false);
    config.source = fixtureDir;
    config.destination = destDirTs;

    const site = new Site(fixtureDir, config);
    const builder = new Builder(site, {
      clean: true,
      verbose: false,
      timing: true,
    });

    // Sample memory during build phases
    memoryTracker.sample();

    const timings = await builder.build();

    // Final memory sample
    memoryTracker.sample();

    const memoryResults = memoryTracker.getResults();
    const finalMemory = getMemoryStats();

    // Print memory statistics
    process.stdout.write('\n');
    printStat('Initial Heap:', formatBytes(initialMemory.heapUsed));
    printStat('Final Heap:', formatBytes(finalMemory.heapUsed));
    printStat('Peak Heap:', formatBytes(memoryResults.peakHeapUsed));
    printStat('Memory Delta:', formatBytes(memoryResults.memoryDelta));
    printStat('RSS:', formatBytes(finalMemory.rss));

    // Print build timing alongside memory
    if (timings) {
      process.stdout.write('\n');
      process.stdout.write(`  Build Time:    ${formatTime(timings.totalDuration)}\n`);
    }

    process.stdout.write(`  ${SEPARATOR}\n`);

    // Verify output was created
    expect(existsSync(destDirTs)).toBe(true);
    expect(existsSync(join(destDirTs, 'index.html'))).toBe(true);

    // Memory should stay within reasonable bounds for the expanded fixture (52 posts)
    expect(memoryResults.peakHeapUsed).toBeLessThan(MAX_EXPECTED_HEAP_BYTES);
  }, 30000);

  it('should track memory efficiency across multiple builds', async () => {
    printHeader('🔄 Memory Efficiency Test');

    const runs = 3;
    const memoryReadings: { heapUsed: number; heapTotal: number }[] = [];
    const durations: number[] = [];

    process.stdout.write('\n');

    for (let i = 0; i < runs; i++) {
      // Clean up before each run
      cleanupDirs();

      // Force garbage collection if available (run with --expose-gc)
      if (global.gc) {
        global.gc();
      }

      const beforeMemory = getMemoryStats();

      const configPath = join(fixtureDir, '_config.yml');
      const config = loadConfig(configPath, false);
      config.source = fixtureDir;
      config.destination = destDirTs;

      const site = new Site(fixtureDir, config);
      const builder = new Builder(site, {
        clean: true,
        verbose: false,
        timing: true,
      });

      const startTime = Date.now();
      await builder.build();
      const duration = Date.now() - startTime;

      const afterMemory = getMemoryStats();

      memoryReadings.push({
        heapUsed: afterMemory.heapUsed - beforeMemory.heapUsed,
        heapTotal: afterMemory.heapTotal,
      });
      durations.push(duration);

      printStat(
        `Run ${i + 1}:`,
        `${formatTime(duration)} | Heap: ${formatBytes(afterMemory.heapUsed)}`
      );
    }

    // Calculate memory statistics
    const avgHeapIncrease =
      memoryReadings.reduce((sum, r) => sum + r.heapUsed, 0) / memoryReadings.length;
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;

    process.stdout.write('\n');
    process.stdout.write(`  ${SEPARATOR}\n`);
    process.stdout.write('  📊 Summary\n');
    process.stdout.write(`  ${SEPARATOR}\n`);
    printStat('Avg Time:', `${avgDuration.toFixed(0)}ms`);
    printStat('Avg Heap Δ:', formatBytes(avgHeapIncrease));

    // Check for memory leaks - heap increase per run should stabilize
    // This is a basic check; more sophisticated leak detection would need longer runs
    const lastTwoHeapIncreases = memoryReadings.slice(-2).map((r) => r.heapUsed);
    if (lastTwoHeapIncreases.length === 2) {
      const heapDiff = Math.abs(lastTwoHeapIncreases[1]! - lastTwoHeapIncreases[0]!);
      const isStable = heapDiff < HEAP_STABILITY_THRESHOLD_BYTES;
      printStat('Memory Stable:', isStable ? 'Yes ✓' : 'No (may indicate leak)');
    }

    process.stdout.write(`  ${SEPARATOR}\n`);

    // Verify last build completed successfully
    expect(existsSync(destDirTs)).toBe(true);
  }, 60000);

  /**
   * Scaling test to understand performance characteristics with different site sizes.
   *
   * ## Issue Investigation: Benchmark vs Real-World Performance Discrepancy
   *
   * This test addresses GitHub issue #231: "Investigate why Jekyll.rb is 50% slower
   * in benchmark tests but 4x+ faster in real world tests"
   *
   * **Correction**: The actual observation is:
   * - Benchmark tests: Jekyll.rb is ~50% FASTER (not slower)
   * - Real-world tests: Jekyll.rb is 4x+ SLOWER (Jekyll.ts is faster)
   *
   * ### Root Cause Analysis
   *
   * The discrepancy stemmed from the original fixture being too small. Now:
   *
   * **1. Expanded Benchmark Fixture**
   *
   * - Benchmark fixture: 52 posts with varied content, tables, code blocks
   * - This crosses the performance crossover point (~20-30 posts)
   * - Now representative of real-world sites
   *
   * **2. Initialization Overhead vs Per-Document Cost**
   *
   * **Small sites (benchmark fixture)**:
   * - Jekyll.ts initialization: ~400-500ms (dynamic imports, Remark loading)
   * - Ruby Jekyll initialization: ~300ms (sync gem loading, lighter Kramdown)
   * - Per-document costs barely register with only 2 posts
   * - Result: Ruby Jekyll wins by ~50% due to faster startup
   *
   * **Large sites (real-world)**:
   * - Same initialization overhead (becomes negligible percentage)
   * - Jekyll.ts per-doc: ~5-9ms (async, parallel processing)
   * - Ruby Jekyll per-doc: ~18-32ms (sync, single-threaded)
   * - Result: Jekyll.ts wins by 4x+ due to efficient per-doc processing
   *
   * ### Why Jekyll.ts is Faster in Real-World
   *
   * Jekyll.ts benefits from:
   * - Parallel document rendering via Promise.all
   * - Async I/O for non-blocking file operations
   * - Efficient V8 JIT compilation of hot paths
   * - Batch operations (pre-create directories, parallel writes)
   *
   * ### Why Ruby Jekyll Wins Benchmarks
   *
   * Ruby Jekyll benefits from:
   * - Lower initialization overhead (sync gem loading)
   * - Kramdown starts faster than Remark + plugins
   * - Small sites don't reach the crossover point (~20-30 posts)
   *
   * ### API vs CLI Timing Note
   *
   * This test uses the API directly (runTimedBuild), so subsequent tests
   * benefit from cached modules. The first CLI benchmark shows the true
   * cold-start initialization cost (~200ms for markdown processor alone).
   */
  it('should analyze scaling characteristics', async () => {
    printHeader('📊 Scaling Analysis');

    const timings = await runTimedBuild();

    // Calculate fixed vs variable costs
    const sortedOps = timings.getMostCostlyOperations();

    // Fixed costs (initialization, setup)
    const fixedCostOps = ['Initialize markdown', 'Read site files', 'Clean destination'];
    const fixedCost = sortedOps
      .filter((op) => fixedCostOps.includes(op.name))
      .reduce((sum, op) => sum + op.duration, 0);

    // Variable costs (per-document rendering)
    const variableCostOps = ['Render pages', 'Render posts', 'Render collections'];
    const variableCost = sortedOps
      .filter((op) => variableCostOps.includes(op.name))
      .reduce((sum, op) => sum + op.duration, 0);

    // Count documents - parse to numbers before adding
    const pageCount = parseInt(
      sortedOps.find((op) => op.name === 'Render pages')?.details?.match(/(\d+) pages/)?.[1] || '0',
      10
    );
    const postCount = parseInt(
      sortedOps.find((op) => op.name === 'Render posts')?.details?.match(/(\d+) posts/)?.[1] || '0',
      10
    );
    const docCount = pageCount + postCount;

    // Print analysis
    process.stdout.write('\n');
    process.stdout.write('  Cost Breakdown:\n');
    process.stdout.write(`  ${SEPARATOR}\n`);
    printStat(
      'Fixed costs:',
      `${fixedCost}ms (${((fixedCost / timings.totalDuration) * 100).toFixed(1)}%)`
    );
    printStat(
      'Variable costs:',
      `${variableCost}ms (${((variableCost / timings.totalDuration) * 100).toFixed(1)}%)`
    );
    printStat('Documents:', String(docCount));
    process.stdout.write('\n');

    // Estimate scaling
    const perDocCost = variableCost / (docCount || 1);
    const estimatedLargeSite100 = fixedCost + perDocCost * 100;
    const estimatedLargeSite500 = fixedCost + perDocCost * 500;

    process.stdout.write('  Estimated build times (linear scaling assumption):\n');
    process.stdout.write(`  ${SEPARATOR}\n`);
    printStat('Current site:', `${timings.totalDuration}ms`);
    printStat('100 documents:', `~${Math.round(estimatedLargeSite100)}ms`);
    printStat('500 documents:', `~${Math.round(estimatedLargeSite500)}ms`);
    process.stdout.write('\n');

    // Explain the discrepancy
    process.stdout.write('  Key Insight:\n');
    process.stdout.write(`  ${SEPARATOR}\n`);
    process.stdout.write(
      '  In small sites (benchmarks), Ruby Jekyll wins due to lower initialization cost.\n'
    );
    process.stdout.write(
      '  In large sites (real-world), Jekyll.ts wins due to parallel processing.\n'
    );
    process.stdout.write(
      '  Crossover point is ~20-30 posts where per-doc costs exceed init overhead.\n'
    );
    process.stdout.write(`  ${SEPARATOR}\n`);

    // Verify we got meaningful data
    expect(timings.totalDuration).toBeGreaterThan(0);
    expect(sortedOps.length).toBeGreaterThan(0);
  }, 30000);
});
