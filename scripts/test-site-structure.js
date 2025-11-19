#!/usr/bin/env node

/**
 * Manual test script to verify Site and Document classes work correctly
 * This script creates a test Jekyll site and verifies it can be read and modeled properly
 */

const { Site } = require('../dist/core/Site');
const { DocumentType } = require('../dist/core/Document');

async function main() {
  const testSitePath = '/tmp/manual-test-site';
  
  console.log('🔍 Testing Jekyll Site Structure Reading\n');
  console.log(`Source: ${testSitePath}\n`);
  
  // Create site instance
  const site = new Site(testSitePath, {
    title: 'Manual Test Site',
    collections: {
      recipes: { output: true },
      tutorials: { output: true },
    },
  });
  
  // Read all files
  console.log('📖 Reading site files...');
  await site.read();
  console.log('✓ Site read complete\n');
  
  // Display statistics
  console.log('📊 Site Statistics:');
  console.log(`  Pages: ${site.pages.length}`);
  console.log(`  Posts: ${site.posts.length}`);
  console.log(`  Layouts: ${site.layouts.size}`);
  console.log(`  Includes: ${site.includes.size}`);
  console.log(`  Collections: ${site.collections.size}`);
  console.log('');
  
  // Display pages
  if (site.pages.length > 0) {
    console.log('📄 Pages:');
    site.pages.forEach((page) => {
      console.log(`  - ${page.basename} (${page.title})`);
    });
    console.log('');
  }
  
  // Display posts
  if (site.posts.length > 0) {
    console.log('📝 Posts (sorted by date):');
    site.posts.forEach((post) => {
      console.log(`  - ${post.basename}`);
      console.log(`    Title: ${post.title}`);
      console.log(`    Date: ${post.date?.toISOString().split('T')[0]}`);
      console.log(`    Categories: ${post.categories.join(', ') || 'none'}`);
      console.log(`    Tags: ${post.tags.join(', ') || 'none'}`);
    });
    console.log('');
  }
  
  // Display layouts
  if (site.layouts.size > 0) {
    console.log('🎨 Layouts:');
    site.layouts.forEach((layout, name) => {
      console.log(`  - ${name}`);
    });
    console.log('');
  }
  
  // Display includes
  if (site.includes.size > 0) {
    console.log('🧩 Includes:');
    site.includes.forEach((include, name) => {
      console.log(`  - ${name}`);
    });
    console.log('');
  }
  
  // Display collections
  if (site.collections.size > 0) {
    console.log('📚 Collections:');
    site.collections.forEach((docs, name) => {
      console.log(`  ${name} (${docs.length} documents):`);
      docs.forEach((doc) => {
        console.log(`    - ${doc.basename} (${doc.title})`);
      });
    });
    console.log('');
  }
  
  // Test specific methods
  console.log('🧪 Testing Site Methods:');
  
  const defaultLayout = site.getLayout('default');
  console.log(`  getLayout('default'): ${defaultLayout ? '✓ Found' : '✗ Not found'}`);
  
  const headerInclude = site.getInclude('header.html');
  console.log(`  getInclude('header.html'): ${headerInclude ? '✓ Found' : '✗ Not found'}`);
  
  const recipes = site.getCollection('recipes');
  console.log(`  getCollection('recipes'): ${recipes.length} documents`);
  
  const allDocs = site.getAllDocuments();
  console.log(`  getAllDocuments(): ${allDocs.length} total documents`);
  
  console.log('');
  console.log('✅ All tests completed successfully!');
}

main().catch((error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
