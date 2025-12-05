import { AvatarPlugin } from '../plugins/avatar';
import { Site } from '../core/Site';
import { Renderer } from '../core/Renderer';
import { GitHubMetadataPlugin } from '../plugins/github-metadata';
import { mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

async function testAvatar() {
  const testSiteDir = join(tmpdir(), 'jekyll-test-avatar-debug');
  rmSync(testSiteDir, { recursive: true, force: true });
  mkdirSync(testSiteDir, { recursive: true });

  // Create test site with config that includes github metadata
  const config = {
    title: 'Test Site',
    url: 'https://example.com',
    repository: 'sitegithubowner/siterepo',
  };

  const site = new Site(testSiteDir, config);
  const renderer = new Renderer(site);
  
  // Register the GitHub metadata plugin (like in a real site)
  const githubPlugin = new GitHubMetadataPlugin();
  githubPlugin.register(renderer, site);
  
  // Register the avatar plugin
  const avatarPlugin = new AvatarPlugin();
  avatarPlugin.register(renderer, site);

  // Test case 1: using variable reference that resolves to something
  console.log("--- Test 1: Variable reference ---");
  const template1 = '{% avatar site.github.owner.name %}';
  try {
    const result1 = await renderer.render(template1, {});
    console.log("Template:", template1);
    console.log("Result:", result1);
  } catch(e) {
    console.log("Error:", e);
  }

  // Test case 2: using dotted path as username
  console.log("\n--- Test 2: Dotted path as literal ---");
  const template2 = '{% avatar "site.github.owner.name" %}';
  try {
    const result2 = await renderer.render(template2, {});
    console.log("Template:", template2);
    console.log("Result:", result2);
  } catch(e) {
    console.log("Error:", e);
  }

  // Test case 3: username with periods
  console.log("\n--- Test 3: Username with period (invalid) ---");
  const template3 = '{% avatar user.name %}';
  try {
    const result3 = await renderer.render(template3, {});
    console.log("Template:", template3);
    console.log("Result:", result3);
  } catch(e) {
    console.log("Error:", e);
  }

  rmSync(testSiteDir, { recursive: true, force: true });
}

testAvatar().catch(console.error);
