import chalk from 'chalk';
import { resolve, join, isAbsolute } from 'path';
import { loadConfig, validateConfig, printValidation } from '../../config';
import { Site, Builder, BuildTimings, TimedOperation } from '../../core';
import { logger } from '../../utils/logger';
import { getMemoryStats, formatBytes, MemoryTracker } from '../../utils';

/**
 * Benchmark command options interface
 */
interface BenchmarkOptions {
  source: string;
  destination: string;
  config: string;
  runs?: number;
  verbose?: boolean;
  memory?: boolean;
}

/**
 * Formatting constants for consistent output
 */
const SEPARATOR = '─'.repeat(60);
const TIME_PAD = 10;

/**
 * Format a duration in milliseconds to a human-readable string
 * @param ms - Duration in milliseconds
 * @returns Formatted string with ms unit
 */
function formatTime(ms: number): string {
  return `${ms.toFixed(0).padStart(TIME_PAD)}ms`;
}

/**
 * Print a section header with decorative borders
 * @param title - The title of the section
 */
function printHeader(title: string): void {
  console.log(`\n${chalk.cyan(SEPARATOR)}`);
  console.log(chalk.bold.cyan(`  ${title}`));
  console.log(chalk.cyan(SEPARATOR));
}

/**
 * Print a key-value statistic with consistent formatting
 * @param label - The label for the value
 * @param value - The value to display
 * @param indent - Number of spaces to indent (default: 2)
 */
function printStat(label: string, value: string, indent: number = 2): void {
  const padding = ' '.repeat(indent);
  const labelPad = 14;
  console.log(`${padding}${chalk.gray(label.padEnd(labelPad))} ${value}`);
}

/**
 * Print an operation timing row with name, duration, percentage, and optional details
 * @param op - The timed operation
 * @param totalDuration - Total build duration for percentage calculation
 * @param rank - Optional rank number for the operation
 */
function printOperationRow(op: TimedOperation, totalDuration: number, rank?: number): void {
  const percentage = totalDuration > 0 ? ((op.duration / totalDuration) * 100).toFixed(1) : '0.0';
  const rankStr = rank !== undefined ? `${rank.toString().padStart(2)}. ` : '    ';
  const nameWidth = 24;
  const name = op.name.length > nameWidth ? op.name.substring(0, nameWidth - 1) + '…' : op.name;
  const details = op.details ? chalk.gray(` (${op.details})`) : '';
  console.log(
    `  ${rankStr}${chalk.white(name.padEnd(nameWidth))} ${formatTime(op.duration)} ${chalk.yellow(percentage.padStart(6) + '%')}${details}`
  );
}

/**
 * Run a single benchmark build and return timings
 * @param sourcePath - Source directory path
 * @param _destPath - Destination directory path (used via config)
 * @param config - Site configuration
 * @returns Build timings
 */
async function runBenchmarkBuild(
  sourcePath: string,
  _destPath: string,
  config: ReturnType<typeof loadConfig>
): Promise<BuildTimings> {
  const site = new Site(sourcePath, config);
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
}

/**
 * Benchmark command handler
 * Runs build benchmarks and displays performance metrics
 */
export async function benchmarkCommand(options: BenchmarkOptions): Promise<void> {
  const isVerbose = options.verbose || false;
  const trackMemory = options.memory || false;
  const numRuns = options.runs || 3;

  logger.setVerbose(isVerbose);

  try {
    // Resolve source directory from CLI option (defaults to '.')
    const sourcePath = resolve(options.source);

    // Resolve config path relative to source directory if it's a relative path
    const configPath = isAbsolute(options.config)
      ? options.config
      : resolve(sourcePath, options.config);

    logger.debug('Loading configuration', { path: configPath });
    const config = loadConfig(configPath, isVerbose);

    // Validate configuration
    const validation = validateConfig(config);
    if (!validation.valid) {
      printValidation(validation, isVerbose);
      throw new Error('Configuration validation failed. Please fix the errors above.');
    }

    // Destination path: CLI option takes precedence, then config, then default based on source
    const destPath =
      options.destination !== undefined
        ? resolve(options.destination)
        : config.destination
          ? resolve(config.destination)
          : join(sourcePath, '_site');

    // Update config with final paths
    config.source = sourcePath;
    config.destination = destPath;

    // Print benchmark header
    console.log(chalk.bold.green('\n📊 Jekyll TS Build Benchmark'));
    console.log(chalk.gray(`   Source: ${sourcePath}`));
    console.log(chalk.gray(`   Destination: ${destPath}`));
    console.log(chalk.gray(`   Runs: ${numRuns}`));
    if (trackMemory) {
      console.log(chalk.gray('   Memory tracking: enabled'));
    }

    // Run multiple builds for consistency
    const durations: number[] = [];
    const memoryReadings: { heapUsed: number; peakHeap: number }[] = [];
    let lastTimings: BuildTimings | null = null;

    printHeader(`🔄 Running ${numRuns} build${numRuns > 1 ? 's' : ''}...`);

    for (let i = 0; i < numRuns; i++) {
      const runLabel = `Run ${i + 1}/${numRuns}`;

      // Track memory if enabled
      let memoryTracker: MemoryTracker | null = null;
      if (trackMemory) {
        memoryTracker = new MemoryTracker();
        memoryTracker.start();
      }

      const startTime = Date.now();
      const timings = await runBenchmarkBuild(sourcePath, destPath, { ...config });
      const duration = Date.now() - startTime;

      durations.push(duration);
      lastTimings = timings;

      // Collect memory stats
      if (memoryTracker) {
        memoryTracker.sample();
        const memResults = memoryTracker.getResults();
        memoryReadings.push({
          heapUsed: memResults.endMemory?.heapUsed || 0,
          peakHeap: memResults.peakHeapUsed,
        });
        printStat(
          runLabel,
          `${formatTime(duration)} | Heap: ${formatBytes(memResults.endMemory?.heapUsed || 0)}`
        );
      } else {
        printStat(runLabel, formatTime(duration));
      }
    }

    // Calculate statistics
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);
    const variance =
      durations.reduce((sum, val) => sum + Math.pow(val - avgDuration, 2), 0) / durations.length;
    const stdDev = Math.sqrt(variance);
    const cv = (stdDev / avgDuration) * 100;

    // Print summary statistics
    printHeader('📈 Summary Statistics');
    printStat('Average:', `${avgDuration.toFixed(0)}ms`);
    printStat('Minimum:', `${minDuration}ms`);
    printStat('Maximum:', `${maxDuration}ms`);
    printStat('Std Dev:', `${stdDev.toFixed(1)}ms`);
    printStat('CV:', `${cv.toFixed(1)}%`);

    // Print memory statistics if tracked
    if (trackMemory && memoryReadings.length > 0) {
      const avgHeap =
        memoryReadings.reduce((sum, r) => sum + r.heapUsed, 0) / memoryReadings.length;
      const peakHeap = Math.max(...memoryReadings.map((r) => r.peakHeap));

      printHeader('💾 Memory Statistics');
      printStat('Avg Heap:', formatBytes(avgHeap));
      printStat('Peak Heap:', formatBytes(peakHeap));
      printStat('Current:', formatBytes(getMemoryStats().heapUsed));
    }

    // Print operation breakdown from last build
    if (lastTimings) {
      printHeader('⏱️  Operation Breakdown');

      // Get operations sorted by duration (most costly first)
      const sortedOps = lastTimings.getMostCostlyOperations();

      // Print header for operations table
      console.log(
        chalk.gray(
          `  ${'#'.padEnd(4)} ${'Operation'.padEnd(24)} ${'Time'.padStart(12)} ${'%'.padStart(7)}`
        )
      );
      console.log(chalk.gray(`  ${SEPARATOR.substring(0, 50)}`));

      // Print all operations ranked by cost
      sortedOps.forEach((op, index) => {
        printOperationRow(op, lastTimings!.totalDuration, index + 1);
      });

      console.log(chalk.gray(`  ${SEPARATOR.substring(0, 50)}`));
      console.log(
        `  ${chalk.bold('Total:')} ${chalk.bold.green(formatTime(lastTimings.totalDuration))}`
      );
    }

    // Final success message
    console.log(chalk.bold.green(`\n✓ Benchmark completed successfully!`));
    console.log(
      chalk.gray(
        `  Average build time: ${avgDuration.toFixed(0)}ms (${(avgDuration / 1000).toFixed(2)}s)`
      )
    );
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)));
    process.exit(1);
  }
}
