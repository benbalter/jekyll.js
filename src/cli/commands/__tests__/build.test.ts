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
    writeFileSync(
      join(testSiteDir, '_config.yml'),
      'title: Test Site\n'
    );

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

  // Note: We don't test --watch mode here because it would hang the test suite
  // Watch mode should be tested manually or with a timeout mechanism
});
