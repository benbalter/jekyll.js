import { execSync, spawn } from 'child_process';
import { existsSync, rmSync } from 'fs';
import { join, resolve } from 'path';

/**
 * Benchmark test to compare jekyll-ts performance against Ruby Jekyll.
 * This is a full integration test that shells out to both CLIs.
 */
describe('Benchmark: Jekyll TS vs Ruby Jekyll', () => {
  const fixtureDir = resolve(__dirname, '../../../../test-fixtures/basic-site');
  const destDirTs = join(fixtureDir, '_site-ts');
  const destDirRuby = join(fixtureDir, '_site-ruby');
  const jekyllTsBin = resolve(__dirname, '../../../../dist/cli/index.js');

  // Check if Ruby Jekyll is available
  let rubyJekyllAvailable = false;

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
    // Check if Ruby Jekyll is installed
    try {
      execSync('jekyll --version', { stdio: 'pipe' });
      rubyJekyllAvailable = true;
      console.log('✓ Ruby Jekyll detected - will run comparison benchmark');
    } catch (error) {
      rubyJekyllAvailable = false;
      console.log('⚠ Ruby Jekyll not found - will only benchmark jekyll-ts');
    }

    // Verify fixture site exists
    expect(existsSync(fixtureDir)).toBe(true);

    // Verify jekyll-ts binary exists
    expect(existsSync(jekyllTsBin)).toBe(true);
  });

  beforeEach(() => {
    cleanupDirs();
  });

  afterEach(() => {
    cleanupDirs();
  });

  /**
   * Helper function to benchmark a build command
   */
  const benchmarkBuild = (command: string, args: string[], cwd: string): Promise<number> => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const child = spawn(command, args, {
        cwd,
        stdio: 'pipe',
        shell: true,
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

  it('should benchmark jekyll-ts build', async () => {
    const duration = await benchmarkBuild(
      'node',
      [jekyllTsBin, 'build', '-s', fixtureDir, '-d', destDirTs],
      fixtureDir
    );

    console.log(`\n📊 Jekyll TS build time: ${duration}ms`);

    // Verify output was created
    expect(existsSync(destDirTs)).toBe(true);
    expect(existsSync(join(destDirTs, 'index.html'))).toBe(true);

    // Reasonable performance threshold (should build in < 10 seconds)
    expect(duration).toBeLessThan(10000);
  }, 15000); // 15 second timeout

  it('should run side-by-side benchmark if Ruby Jekyll is available', async () => {
    if (!rubyJekyllAvailable) {
      console.log('⏭ Skipping Ruby Jekyll comparison (not installed)');
      return;
    }

    console.log('\n🏁 Running side-by-side benchmark...\n');

    // Benchmark Jekyll TS
    const durationTs = await benchmarkBuild(
      'node',
      [jekyllTsBin, 'build', '-s', fixtureDir, '-d', destDirTs],
      fixtureDir
    );

    console.log(`📊 Jekyll TS build time: ${durationTs}ms`);

    // Benchmark Ruby Jekyll
    const durationRuby = await benchmarkBuild(
      'jekyll',
      ['build', '--source', fixtureDir, '--destination', destDirRuby],
      fixtureDir
    );

    console.log(`📊 Ruby Jekyll build time: ${durationRuby}ms`);

    // Calculate comparison
    const difference = durationTs - durationRuby;
    const percentageDiff = durationRuby > 0 
      ? ((difference / durationRuby) * 100).toFixed(2)
      : '0.00';

    console.log('\n📈 Comparison:');
    if (durationTs < durationRuby) {
      console.log(`   Jekyll TS is ${Math.abs(difference)}ms (${Math.abs(parseFloat(percentageDiff))}%) faster`);
    } else {
      console.log(`   Jekyll TS is ${difference}ms (${percentageDiff}%) slower`);
    }

    // Verify both outputs were created
    expect(existsSync(destDirTs)).toBe(true);
    expect(existsSync(destDirRuby)).toBe(true);
    expect(existsSync(join(destDirTs, 'index.html'))).toBe(true);
    expect(existsSync(join(destDirRuby, 'index.html'))).toBe(true);
  }, 30000); // 30 second timeout for both builds

  it('should benchmark multiple runs for consistency', async () => {
    const runs = 3;
    const durations: number[] = [];

    console.log(`\n🔄 Running ${runs} builds to measure consistency...\n`);

    for (let i = 0; i < runs; i++) {
      // Clean up before each run
      cleanupDirs();

      const duration = await benchmarkBuild(
        'node',
        [jekyllTsBin, 'build', '-s', fixtureDir, '-d', destDirTs],
        fixtureDir
      );

      durations.push(duration);
      console.log(`   Run ${i + 1}: ${duration}ms`);
    }

    // Calculate statistics
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    const min = Math.min(...durations);
    const max = Math.max(...durations);
    const variance = durations.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / durations.length;
    const stdDev = Math.sqrt(variance);

    console.log('\n📊 Statistics:');
    console.log(`   Average: ${avg.toFixed(2)}ms`);
    console.log(`   Min: ${min}ms`);
    console.log(`   Max: ${max}ms`);
    console.log(`   Std Dev: ${stdDev.toFixed(2)}ms`);

    // Verify output was created on last run
    expect(existsSync(destDirTs)).toBe(true);
    expect(existsSync(join(destDirTs, 'index.html'))).toBe(true);

    // All builds should complete in reasonable time
    expect(avg).toBeLessThan(10000);
  }, 60000); // 60 second timeout for multiple runs
});
