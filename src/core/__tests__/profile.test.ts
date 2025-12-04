import { Site } from '../Site';
import { Renderer } from '../Renderer';
import { processMarkdown, initMarkdownProcessor } from '../markdown';
import { join } from 'path';
import { loadConfig } from '../../config';
import { Document } from '../Document';

const fixtureDir = join(__dirname, '../../../test-fixtures/basic-site');

describe('Performance Profile', () => {
  it('should profile rendering performance', async () => {
    console.log('Starting benchmark...\n');

    // Load site
    const configPath = join(fixtureDir, '_config.yml');
    const config = loadConfig(configPath, false);
    config.source = fixtureDir;
    
    const site = new Site(fixtureDir, config);
    await site.read();

    // Get layout and include directories
    const layoutDirs = site.themeManager.getLayoutDirectories();
    const includeDirs = site.themeManager.getIncludeDirectories();

    const renderer = new Renderer(site, {
      layoutsDir: layoutDirs.length > 0
        ? layoutDirs
        : [join(site.source, site.config.layouts_dir || '_layouts')],
      includesDir: includeDirs.length > 0
        ? includeDirs
        : [join(site.source, site.config.includes_dir || '_includes')],
    });

    // Generate URLs
    for (const page of site.pages) {
      page.url = '/' + page.basename + '.html';
    }

    // Pre-cache site data
    renderer.preloadSiteData();

    // Test 1: First markdown process (cold start)
    console.log('=== Markdown Processing ===');
    let start = Date.now();
    await processMarkdown('# Hello World\n\nThis is a test.');
    console.log(`First markdown process (cold): ${Date.now() - start}ms`);

    // Test 2: Subsequent markdown processes
    start = Date.now();
    for (let i = 0; i < 10; i++) {
      await processMarkdown('# Hello World\n\nThis is a test paragraph ' + i);
    }
    console.log(`10 markdown processes (warm): ${Date.now() - start}ms (${(Date.now() - start) / 10}ms avg)`);

    // Test 3: First page render (cold start)
    console.log('\n=== Page Rendering ===');
    const firstPage = site.pages[0]!;
    start = Date.now();
    await renderer.renderDocument(firstPage);
    console.log(`First page render (cold): ${Date.now() - start}ms`);

    // Test 4: Same page render again (warm)
    start = Date.now();
    await renderer.renderDocument(firstPage);
    console.log(`Same page render (warm): ${Date.now() - start}ms`);

    // Test 5: Render all pages
    start = Date.now();
    await Promise.all(site.pages.map((page: Document) => renderer.renderDocument(page)));
    console.log(`All ${site.pages.length} pages rendered: ${Date.now() - start}ms`);

    // Test 6: Pre-initialize markdown processor and try again
    console.log('\n=== With Pre-initialization ===');
    await initMarkdownProcessor({});
    start = Date.now();
    await Promise.all(site.pages.map((page: Document) => renderer.renderDocument(page)));
    console.log(`All ${site.pages.length} pages rendered (after init): ${Date.now() - start}ms`);
  }, 30000);
});
