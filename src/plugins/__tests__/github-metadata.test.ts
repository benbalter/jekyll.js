import { GitHubMetadataPlugin } from '../github-metadata';
import { Site } from '../../core/Site';
import { Renderer } from '../../core/Renderer';
import { mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('GitHubMetadataPlugin', () => {
  const testSiteDir = join(tmpdir(), 'jekyll-test-github-metadata-site');
  let site: Site;
  let renderer: Renderer;
  let plugin: GitHubMetadataPlugin;

  // Store original env vars
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Clean up and create fresh test site directory
    rmSync(testSiteDir, { recursive: true, force: true });
    mkdirSync(testSiteDir, { recursive: true });

    // Reset env vars
    delete process.env.GITHUB_REPOSITORY;
    delete process.env.GITHUB_SHA;
    delete process.env.JEKYLL_ENV;
    delete process.env.GITHUB_PAGES;
  });

  afterEach(() => {
    rmSync(testSiteDir, { recursive: true, force: true });
    // Restore original env vars
    process.env = { ...originalEnv };
  });

  it('should have the correct name', () => {
    const config = {
      title: 'Test Site',
      url: 'https://example.com',
    };
    site = new Site(testSiteDir, config);
    plugin = new GitHubMetadataPlugin();
    plugin.register(new Renderer(site), site);

    expect(plugin.name).toBe('jekyll-github-metadata');
  });

  it('should add github metadata to site.data', () => {
    const config = {
      title: 'Test Site',
      url: 'https://example.com',
      repository: 'owner/repo',
    };
    site = new Site(testSiteDir, config);
    plugin = new GitHubMetadataPlugin();
    plugin.register(new Renderer(site), site);

    expect(site.data.github).toBeDefined();
    expect(site.data.github.repository_name).toBe('repo');
    expect(site.data.github.repository_nwo).toBe('owner/repo');
  });

  it('should parse repository from config', () => {
    const config = {
      title: 'Test Site',
      url: 'https://example.com',
      repository: 'benbalter/jekyll.js',
    };
    site = new Site(testSiteDir, config);
    plugin = new GitHubMetadataPlugin();
    plugin.register(new Renderer(site), site);

    const metadata = site.data.github;

    expect(metadata.repository.name).toBe('jekyll.js');
    expect(metadata.repository.owner).toBe('benbalter');
    expect(metadata.repository_nwo).toBe('benbalter/jekyll.js');
    expect(metadata.repository_url).toBe('https://github.com/benbalter/jekyll.js');
  });

  it('should parse repository from environment variable', () => {
    process.env.GITHUB_REPOSITORY = 'octocat/hello-world';

    const config = {
      title: 'Test Site',
      url: 'https://example.com',
    };
    site = new Site(testSiteDir, config);
    plugin = new GitHubMetadataPlugin();
    plugin.register(new Renderer(site), site);

    const metadata = site.data.github;

    expect(metadata.repository.name).toBe('hello-world');
    expect(metadata.repository.owner).toBe('octocat');
  });

  it('should detect user/org pages', () => {
    const config = {
      title: 'Test Site',
      url: 'https://octocat.github.io',
      repository: 'octocat/octocat.github.io',
    };
    site = new Site(testSiteDir, config);
    plugin = new GitHubMetadataPlugin();
    plugin.register(new Renderer(site), site);

    const metadata = site.data.github;

    expect(metadata.is_user_page).toBe(true);
    expect(metadata.is_project_page).toBe(false);
  });

  it('should detect project pages', () => {
    const config = {
      title: 'Test Site',
      url: 'https://octocat.github.io/hello-world',
      repository: 'octocat/hello-world',
    };
    site = new Site(testSiteDir, config);
    plugin = new GitHubMetadataPlugin();
    plugin.register(new Renderer(site), site);

    const metadata = site.data.github;

    expect(metadata.is_user_page).toBe(false);
    expect(metadata.is_project_page).toBe(true);
  });

  it('should include GitHub URLs', () => {
    const config = {
      title: 'Test Site',
      url: 'https://example.com',
      repository: 'owner/repo',
    };
    site = new Site(testSiteDir, config);
    plugin = new GitHubMetadataPlugin();
    plugin.register(new Renderer(site), site);

    const metadata = site.data.github;

    expect(metadata.api_url).toBe('https://api.github.com');
    expect(metadata.base_url).toBe('https://github.com');
    expect(metadata.hostname).toBe('github.com');
  });

  it('should detect production environment', () => {
    process.env.JEKYLL_ENV = 'production';

    const config = {
      title: 'Test Site',
      url: 'https://example.com',
    };
    site = new Site(testSiteDir, config);
    plugin = new GitHubMetadataPlugin();
    plugin.register(new Renderer(site), site);

    const metadata = site.data.github;

    expect(metadata.environment).toBe('production');
    expect(metadata.is_pages_env).toBe(true);
  });

  it('should detect GitHub Pages environment', () => {
    process.env.GITHUB_PAGES = 'true';

    const config = {
      title: 'Test Site',
      url: 'https://example.com',
    };
    site = new Site(testSiteDir, config);
    plugin = new GitHubMetadataPlugin();
    plugin.register(new Renderer(site), site);

    const metadata = site.data.github;

    expect(metadata.is_pages_env).toBe(true);
  });

  it('should include build revision from environment', () => {
    process.env.GITHUB_SHA = 'abc123def456';

    const config = {
      title: 'Test Site',
      url: 'https://example.com',
    };
    site = new Site(testSiteDir, config);
    plugin = new GitHubMetadataPlugin();
    plugin.register(new Renderer(site), site);

    const metadata = site.data.github;

    expect(metadata.build_revision).toBe('abc123def456');
  });

  it('should generate owner avatar URL', () => {
    const config = {
      title: 'Test Site',
      url: 'https://example.com',
      repository: 'octocat/hello-world',
    };
    site = new Site(testSiteDir, config);
    plugin = new GitHubMetadataPlugin();
    plugin.register(new Renderer(site), site);

    const metadata = site.data.github;

    expect(metadata.owner.avatar_url).toBe('https://avatars.githubusercontent.com/octocat');
    expect(metadata.owner.html_url).toBe('https://github.com/octocat');
  });

  it('should generate clone URLs', () => {
    const config = {
      title: 'Test Site',
      url: 'https://example.com',
      repository: 'octocat/hello-world',
    };
    site = new Site(testSiteDir, config);
    plugin = new GitHubMetadataPlugin();
    plugin.register(new Renderer(site), site);

    const metadata = site.data.github;

    expect(metadata.repository.clone_url).toBe('https://github.com/octocat/hello-world.git');
    expect(metadata.repository.git_url).toBe('git://github.com/octocat/hello-world.git');
    expect(metadata.repository.ssh_url).toBe('git@github.com:octocat/hello-world.git');
  });

  it('should be accessible in templates', async () => {
    const config = {
      title: 'Test Site',
      url: 'https://example.com',
      repository: 'octocat/hello-world',
    };
    site = new Site(testSiteDir, config);
    renderer = new Renderer(site);
    plugin = new GitHubMetadataPlugin();
    plugin.register(renderer, site);

    const template = '{{ site.github.repository_name }}';
    const result = await renderer.render(template, {
      site: { ...site.config, github: site.data.github },
    });

    expect(result).toBe('hello-world');
  });

  describe('github_edit_link tag', () => {
    it('should generate edit URL without link text', async () => {
      const config = {
        title: 'Test Site',
        url: 'https://example.com',
        repository: 'octocat/hello-world',
      };
      site = new Site(testSiteDir, config);
      renderer = new Renderer(site);
      plugin = new GitHubMetadataPlugin();
      plugin.register(renderer, site);

      const template = '{% github_edit_link %}';
      const result = await renderer.render(template, {
        page: { path: 'page.md' },
        site: { ...site.config, github: site.data.github },
      });

      expect(result).toBe('https://github.com/octocat/hello-world/edit/main/page.md');
    });

    it('should generate link with double-quoted text', async () => {
      const config = {
        title: 'Test Site',
        url: 'https://example.com',
        repository: 'octocat/hello-world',
      };
      site = new Site(testSiteDir, config);
      renderer = new Renderer(site);
      plugin = new GitHubMetadataPlugin();
      plugin.register(renderer, site);

      const template = '{% github_edit_link "Improve this page" %}';
      const result = await renderer.render(template, {
        page: { path: 'page.md' },
        site: { ...site.config, github: site.data.github },
      });

      expect(result).toBe(
        '<a href="https://github.com/octocat/hello-world/edit/main/page.md">Improve this page</a>'
      );
    });

    it('should generate link with single-quoted text', async () => {
      const config = {
        title: 'Test Site',
        url: 'https://example.com',
        repository: 'octocat/hello-world',
      };
      site = new Site(testSiteDir, config);
      renderer = new Renderer(site);
      plugin = new GitHubMetadataPlugin();
      plugin.register(renderer, site);

      const template = "{% github_edit_link 'Edit on GitHub' %}";
      const result = await renderer.render(template, {
        page: { path: 'index.html' },
        site: { ...site.config, github: site.data.github },
      });

      expect(result).toBe(
        '<a href="https://github.com/octocat/hello-world/edit/main/index.html">Edit on GitHub</a>'
      );
    });

    it('should include source path if specified', async () => {
      const config = {
        title: 'Test Site',
        url: 'https://example.com',
        repository: 'octocat/hello-world',
        github_pages_source_path: 'docs/',
        branch: 'gh-pages',
      };
      site = new Site(testSiteDir, config);
      renderer = new Renderer(site);
      plugin = new GitHubMetadataPlugin();
      plugin.register(renderer, site);

      const template = '{% github_edit_link %}';
      const result = await renderer.render(template, {
        page: { path: 'getting-started.md' },
        site: { ...site.config, github: site.data.github },
      });

      expect(result).toBe(
        'https://github.com/octocat/hello-world/edit/gh-pages/docs/getting-started.md'
      );
    });

    it('should return empty string when no repository configured', async () => {
      const config = {
        title: 'Test Site',
        url: 'https://example.com',
      };
      site = new Site(testSiteDir, config);
      renderer = new Renderer(site);
      plugin = new GitHubMetadataPlugin();
      plugin.register(renderer, site);

      const template = '{% github_edit_link %}';
      const result = await renderer.render(template, {
        page: { path: 'page.md' },
        site: { ...site.config, github: site.data.github },
      });

      expect(result).toBe('');
    });

    it('should escape HTML in link text', async () => {
      const config = {
        title: 'Test Site',
        url: 'https://example.com',
        repository: 'octocat/hello-world',
      };
      site = new Site(testSiteDir, config);
      renderer = new Renderer(site);
      plugin = new GitHubMetadataPlugin();
      plugin.register(renderer, site);

      const template = '{% github_edit_link "<script>alert(1)</script>" %}';
      const result = await renderer.render(template, {
        page: { path: 'page.md' },
        site: { ...site.config, github: site.data.github },
      });

      expect(result).toBe(
        '<a href="https://github.com/octocat/hello-world/edit/main/page.md">&lt;script&gt;alert(1)&lt;/script&gt;</a>'
      );
    });

    it('should handle nested page paths', async () => {
      const config = {
        title: 'Test Site',
        url: 'https://example.com',
        repository: 'octocat/hello-world',
      };
      site = new Site(testSiteDir, config);
      renderer = new Renderer(site);
      plugin = new GitHubMetadataPlugin();
      plugin.register(renderer, site);

      const template = '{% github_edit_link %}';
      const result = await renderer.render(template, {
        page: { path: 'guides/getting-started/installation.md' },
        site: { ...site.config, github: site.data.github },
      });

      expect(result).toBe(
        'https://github.com/octocat/hello-world/edit/main/guides/getting-started/installation.md'
      );
    });

    it('should use custom branch from config', async () => {
      const config = {
        title: 'Test Site',
        url: 'https://example.com',
        repository: 'octocat/hello-world',
        branch: 'develop',
      };
      site = new Site(testSiteDir, config);
      renderer = new Renderer(site);
      plugin = new GitHubMetadataPlugin();
      plugin.register(renderer, site);

      const template = '{% github_edit_link %}';
      const result = await renderer.render(template, {
        page: { path: 'README.md' },
        site: { ...site.config, github: site.data.github },
      });

      expect(result).toBe('https://github.com/octocat/hello-world/edit/develop/README.md');
    });

    it('should return empty string when page path is missing', async () => {
      const config = {
        title: 'Test Site',
        url: 'https://example.com',
        repository: 'octocat/hello-world',
      };
      site = new Site(testSiteDir, config);
      renderer = new Renderer(site);
      plugin = new GitHubMetadataPlugin();
      plugin.register(renderer, site);

      const template = '{% github_edit_link %}';
      const result = await renderer.render(template, {
        page: { path: '' },
        site: { ...site.config, github: site.data.github },
      });

      expect(result).toBe('');
    });

    it('should handle escaped quotes in link text', async () => {
      const config = {
        title: 'Test Site',
        url: 'https://example.com',
        repository: 'octocat/hello-world',
      };
      site = new Site(testSiteDir, config);
      renderer = new Renderer(site);
      plugin = new GitHubMetadataPlugin();
      plugin.register(renderer, site);

      const template = '{% github_edit_link "Say \\"Hello\\"" %}';
      const result = await renderer.render(template, {
        page: { path: 'page.md' },
        site: { ...site.config, github: site.data.github },
      });

      // Quotes in link text are HTML-escaped for security
      expect(result).toBe(
        '<a href="https://github.com/octocat/hello-world/edit/main/page.md">Say &quot;Hello&quot;</a>'
      );
    });
  });
});
