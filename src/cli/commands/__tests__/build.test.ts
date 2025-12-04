import { buildCommand } from '../build';
import { existsSync, rmSync, writeFileSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';

describe('buildCommand', () => {
  const testSiteDir = join(__dirname, '../../../../tmp/test-build-site');
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

  it('should build a site successfully', async () => {
    await buildCommand({
      source: testSiteDir,
      destination: outputDir,
      config: join(testSiteDir, '_config.yml'),
    });

    // Check that site was built
    expect(existsSync(outputDir)).toBe(true);
    expect(existsSync(join(outputDir, 'index.html'))).toBe(true);

    // Check content
    const content = readFileSync(join(outputDir, 'index.html'), 'utf-8');
    expect(content).toContain('Hello World');
  });

  it('should build with drafts when --drafts flag is used', async () => {
    // Create a draft
    mkdirSync(join(testSiteDir, '_drafts'), { recursive: true });
    writeFileSync(
      join(testSiteDir, '_drafts', 'draft-post.md'),
      '---\nlayout: default\ntitle: Draft\n---\nDraft content'
    );

    await buildCommand({
      source: testSiteDir,
      destination: outputDir,
      config: join(testSiteDir, '_config.yml'),
      drafts: true,
    });

    expect(existsSync(outputDir)).toBe(true);
  });

  it('should build with future posts when --future flag is used', async () => {
    // Create a future post
    mkdirSync(join(testSiteDir, '_posts'), { recursive: true });
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const dateStr = futureDate.toISOString().split('T')[0];

    writeFileSync(
      join(testSiteDir, '_posts', `${dateStr}-future-post.md`),
      '---\nlayout: default\ntitle: Future\n---\nFuture content'
    );

    await buildCommand({
      source: testSiteDir,
      destination: outputDir,
      config: join(testSiteDir, '_config.yml'),
      future: true,
    });

    expect(existsSync(outputDir)).toBe(true);
  });

  it('should not hang when --watch is not used', async () => {
    const startTime = Date.now();

    await buildCommand({
      source: testSiteDir,
      destination: outputDir,
      config: join(testSiteDir, '_config.yml'),
    });

    const duration = Date.now() - startTime;

    // Build should complete quickly (within 5 seconds)
    expect(duration).toBeLessThan(5000);
    expect(existsSync(outputDir)).toBe(true);
  });

  it('should display build time on completion', async () => {
    const consoleSpy = jest.spyOn(console, 'log');

    await buildCommand({
      source: testSiteDir,
      destination: outputDir,
      config: join(testSiteDir, '_config.yml'),
    });

    // Check that build time is displayed
    const buildTimeCalls = consoleSpy.mock.calls.filter(
      (call) => typeof call[0] === 'string' && call[0].includes('Done in')
    );
    expect(buildTimeCalls.length).toBeGreaterThan(0);
    // Verify format matches "Done in X.XXX seconds."
    const buildTimeOutput = buildTimeCalls[0]?.[0] as string | undefined;
    expect(buildTimeOutput).toBeDefined();
    expect(buildTimeOutput).toMatch(/Done in \d+\.\d{3} seconds\./);

    consoleSpy.mockRestore();
  });

  // Note: We don't test --watch mode here because it would hang the test suite
  // Watch mode should be tested manually or with a timeout mechanism

  describe('--source argument', () => {
    it('should use source directory when --source is provided with default config', async () => {
      // When using `jekyll-ts build --source <path>`, the config should be resolved
      // relative to the source directory (default is '_config.yml' in source)
      await buildCommand({
        source: testSiteDir,
        destination: outputDir,
        config: '_config.yml', // Default relative config path
      });

      // Check that site was built from the source directory
      expect(existsSync(outputDir)).toBe(true);
      expect(existsSync(join(outputDir, 'index.html'))).toBe(true);

      // Check content came from the test site
      const content = readFileSync(join(outputDir, 'index.html'), 'utf-8');
      expect(content).toContain('Hello World');
    });

    it('should resolve relative config path from source directory', async () => {
      // Create a custom config in a subdirectory of the source
      const configDir = join(testSiteDir, 'config');
      mkdirSync(configDir, { recursive: true });
      writeFileSync(join(configDir, 'custom.yml'), 'title: Custom Config Site\n');

      await buildCommand({
        source: testSiteDir,
        destination: outputDir,
        config: 'config/custom.yml', // Relative to source
      });

      // Check that site was built
      expect(existsSync(outputDir)).toBe(true);
      expect(existsSync(join(outputDir, 'index.html'))).toBe(true);
    });

    it('should use source directory even when cwd is different', async () => {
      // This test verifies that --source works even when the current working directory
      // is not the source directory. The config should be resolved relative to source.
      const alternateOutputDir = join(testSiteDir, 'custom-output');

      await buildCommand({
        source: testSiteDir,
        destination: alternateOutputDir,
        config: '_config.yml', // Should resolve to testSiteDir/_config.yml
      });

      // Check that site was built in the alternate output directory
      expect(existsSync(alternateOutputDir)).toBe(true);
      expect(existsSync(join(alternateOutputDir, 'index.html'))).toBe(true);
    });
  });
});
