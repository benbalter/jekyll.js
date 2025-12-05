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

  // Test case: using literal username "benbalter"
  const template = '{% avatar benbalter size=250 %}';
  const result = await renderer.render(template, {});
  
  console.log("Template:", template);
  console.log("Result:", result);
  console.log("Contains benbalter:", result.includes('benbalter'));
  console.log("Contains sitegithubowner:", result.includes('sitegithubowner'));
  
  rmSync(testSiteDir, { recursive: true, force: true });
}

testAvatar().catch(console.error);
