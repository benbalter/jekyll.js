import { benchmarkCommand } from '../benchmark';
import { existsSync, rmSync, writeFileSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';

describe('benchmarkCommand', () => {
  const testSiteDir = join(__dirname, '../../../../tmp/test-benchmark-site');
  const outputDir = join(testSiteDir, '_site');

  beforeEach(() => {
    // Clean up test directories
    if (existsSync(testSiteDir)) {
      rmSync(testSiteDir, { recursive: true, force: true });
    }

    // Create a simple test site
    mkdirSync(testSiteDir, { recursive: true });
    mkdirSync(join(testSiteDir, '_layouts'), { recursive: true });

    // Create a simple config file
    writeFileSync(join(testSiteDir, '_config.yml'), 'title: Test Site\n');

    // Create a simple layout
    writeFileSync(
      join(testSiteDir, '_layouts', 'default.html'),
      '<!DOCTYPE html><html><body>{{ content }}</body></html>'
    );

    // Create a simple page
    writeFileSync(
      join(testSiteDir, 'index.md'),
      '---\nlayout: default\ntitle: Home\n---\n# Hello World'
    );
  });

  afterEach(() => {
    // Clean up test directories
    if (existsSync(testSiteDir)) {
      rmSync(testSiteDir, { recursive: true, force: true });
    }
  });

  it('should run a benchmark successfully', async () => {
    await benchmarkCommand({
      source: testSiteDir,
      destination: outputDir,
      config: join(testSiteDir, '_config.yml'),
      runs: 1,
    });

    // Check that site was built
    expect(existsSync(outputDir)).toBe(true);
    expect(existsSync(join(outputDir, 'index.html'))).toBe(true);

    // Check content
    const content = readFileSync(join(outputDir, 'index.html'), 'utf-8');
    expect(content).toContain('Hello World');
  });

  it('should run multiple benchmark runs', async () => {
    const consoleSpy = jest.spyOn(console, 'log');

    await benchmarkCommand({
      source: testSiteDir,
      destination: outputDir,
      config: join(testSiteDir, '_config.yml'),
      runs: 2,
    });

    // Check that multiple runs were performed
    const runCalls = consoleSpy.mock.calls.filter(
      (call) => typeof call[0] === 'string' && call[0].includes('Run ')
    );
    expect(runCalls.length).toBeGreaterThanOrEqual(1);

    // Check that summary statistics were displayed
    const statsCalls = consoleSpy.mock.calls.filter(
      (call) =>
        typeof call[0] === 'string' &&
        (call[0].includes('Average') || call[0].includes('Minimum') || call[0].includes('Maximum'))
    );
    expect(statsCalls.length).toBeGreaterThan(0);

    consoleSpy.mockRestore();
  });

  it('should display operation breakdown', async () => {
    const consoleSpy = jest.spyOn(console, 'log');

    await benchmarkCommand({
      source: testSiteDir,
      destination: outputDir,
      config: join(testSiteDir, '_config.yml'),
      runs: 1,
    });

    // Check that operation breakdown was displayed
    const operationCalls = consoleSpy.mock.calls.filter(
      (call) =>
        typeof call[0] === 'string' &&
        (call[0].includes('Operation Breakdown') || call[0].includes('Read site files'))
    );
    expect(operationCalls.length).toBeGreaterThan(0);

    consoleSpy.mockRestore();
  });

  it('should track memory when --memory flag is used', async () => {
    const consoleSpy = jest.spyOn(console, 'log');

    await benchmarkCommand({
      source: testSiteDir,
      destination: outputDir,
      config: join(testSiteDir, '_config.yml'),
      runs: 1,
      memory: true,
    });

    // Check that memory statistics were displayed
    const memoryCalls = consoleSpy.mock.calls.filter(
      (call) =>
        typeof call[0] === 'string' &&
        (call[0].includes('Memory Statistics') ||
          call[0].includes('Avg Heap') ||
          call[0].includes('Peak Heap'))
    );
    expect(memoryCalls.length).toBeGreaterThan(0);

    consoleSpy.mockRestore();
  });

  it('should display benchmark completion message', async () => {
    const consoleSpy = jest.spyOn(console, 'log');

    await benchmarkCommand({
      source: testSiteDir,
      destination: outputDir,
      config: join(testSiteDir, '_config.yml'),
      runs: 1,
    });

    // Check that completion message was displayed
    const completionCalls = consoleSpy.mock.calls.filter(
      (call) => typeof call[0] === 'string' && call[0].includes('Benchmark completed successfully')
    );
    expect(completionCalls.length).toBeGreaterThan(0);

    consoleSpy.mockRestore();
  });

  it('should use source directory when --source is provided with default config', async () => {
    await benchmarkCommand({
      source: testSiteDir,
      destination: outputDir,
      config: '_config.yml', // Default relative config path
      runs: 1,
    });

    // Check that site was built from the source directory
    expect(existsSync(outputDir)).toBe(true);
    expect(existsSync(join(outputDir, 'index.html'))).toBe(true);

    // Check content came from the test site
    const content = readFileSync(join(outputDir, 'index.html'), 'utf-8');
    expect(content).toContain('Hello World');
  });

  it('should work with default config when config file does not exist', async () => {
    // Remove config file to test default config behavior
    rmSync(join(testSiteDir, '_config.yml'));

    // Should still work with defaults (matches Jekyll behavior)
    await benchmarkCommand({
      source: testSiteDir,
      destination: outputDir,
      config: '_config.yml',
      runs: 1,
    });

    // Check that site was built using defaults
    expect(existsSync(outputDir)).toBe(true);
  });
});
