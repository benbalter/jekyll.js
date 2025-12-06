/**
 * GitHub Metadata Plugin for Jekyll.js
 *
 * Implements jekyll-github-metadata functionality
 * Provides access to GitHub repository metadata in templates
 *
 * @see https://github.com/jekyll/github-metadata
 */

import { Plugin } from './types';
import { Renderer } from '../core/Renderer';
import { Site } from '../core/Site';
import { escapeHtml } from '../utils/html';
import { logger } from '../utils/logger';

/** Maximum length for quoted string parsing to prevent DoS */
const MAX_QUOTED_STRING_LENGTH = 1000;

/**
 * Parse a quoted string without using regex to avoid ReDoS
 * Supports escaped quotes within the string
 * @param input The input string starting with a quote character
 * @param quoteChar The quote character (' or ")
 * @returns The unescaped content between quotes, or null if invalid
 */
function parseQuotedString(input: string, quoteChar: string): string | null {
  if (!input.startsWith(quoteChar)) {
    return null;
  }

  let result = '';
  let i = 1; // Start after the opening quote
  const maxLen = Math.min(input.length, MAX_QUOTED_STRING_LENGTH);

  while (i < maxLen) {
    const char = input[i];

    if (char === quoteChar) {
      // Found closing quote
      return result;
    } else if (char === '\\' && i + 1 < maxLen) {
      // Escape sequence
      const nextChar = input[i + 1];
      if (nextChar === quoteChar || nextChar === '\\') {
        result += nextChar;
        i += 2;
      } else {
        // Keep the backslash and continue
        result += char;
        i++;
      }
    } else if (char !== undefined) {
      result += char;
      i++;
    } else {
      break;
    }
  }

  // No closing quote found
  return null;
}

/**
 * GitHub repository metadata interface
 */
export interface GitHubRepository {
  /** Repository name */
  name: string;
  /** Full repository name (owner/repo) */
  full_name: string;
  /** Repository owner username */
  owner: string;
  /** Repository description */
  description: string;
  /** Whether the repository is a fork */
  fork: boolean;
  /** Whether the repository is private */
  private: boolean;
  /** Repository homepage URL */
  homepage: string;
  /** Repository HTML URL */
  html_url: string;
  /** Repository clone URL */
  clone_url: string;
  /** Repository git URL */
  git_url: string;
  /** Repository SSH URL */
  ssh_url: string;
  /** Repository default branch */
  default_branch: string;
  /** Repository language */
  language: string;
  /** Repository topics */
  topics: string[];
  /** Number of stars */
  stargazers_count: number;
  /** Number of watchers */
  watchers_count: number;
  /** Number of forks */
  forks_count: number;
  /** Number of open issues */
  open_issues_count: number;
  /** Repository license */
  license: {
    key: string;
    name: string;
    spdx_id: string;
    url: string;
  } | null;
  /** Repository creation date */
  created_at: string;
  /** Repository update date */
  updated_at: string;
  /** Repository push date */
  pushed_at: string;
}

/**
 * GitHub metadata structure available in templates
 */
export interface GitHubMetadata {
  /** GitHub API URL */
  api_url: string;
  /** GitHub base URL */
  base_url: string;
  /** Build revision (commit SHA) */
  build_revision: string;
  /** Environment (development, staging, production) */
  environment: string;
  /** GitHub Pages hostname */
  hostname: string;
  /** Whether this is a GitHub Pages environment */
  is_pages_env: boolean;
  /** Repository owner information */
  owner: {
    login: string;
    name: string;
    email: string;
    avatar_url: string;
    html_url: string;
    type: string;
    site_admin: boolean;
  };
  /** Organization information (if owner is an org) */
  organization?: {
    login: string;
    name: string;
    avatar_url: string;
    html_url: string;
    description: string;
  };
  /** Repository information */
  repository: GitHubRepository;
  /** Repository name */
  repository_name: string;
  /** Repository namespace (owner) */
  repository_nwo: string;
  /** Repository URL */
  repository_url: string;
  /** Whether the repository is a project page */
  is_project_page: boolean;
  /** Whether the repository is a user page */
  is_user_page: boolean;
  /** Owner name (username/login) - convenience property for templates */
  owner_name: string;
  /** Source information */
  source: {
    branch: string;
    path: string;
  };
  /** Contributors to the repository */
  contributors: Array<{
    login: string;
    avatar_url: string;
    html_url: string;
    contributions: number;
  }>;
  /** Repository releases */
  releases: Array<{
    tag_name: string;
    name: string;
    html_url: string;
    published_at: string;
    draft: boolean;
    prerelease: boolean;
  }>;
  /** Latest release */
  latest_release?: {
    tag_name: string;
    name: string;
    html_url: string;
    published_at: string;
  };
  /** Public repositories for the owner */
  public_repositories: GitHubRepository[];
  /** Repository URL for editing files */
  edit_link: string;
}

/**
 * Site config with github metadata extension
 */
interface SiteConfigWithGitHub {
  repository?: string;
  github?: {
    repository_nwo?: string;
  };
  url?: string;
  description?: string;
  branch?: string;
  /** GitHub Pages source path (e.g., "docs/" or "/"). NOT the Jekyll source directory. */
  github_pages_source_path?: string;
}

/**
 * GitHub Metadata Plugin implementation
 */
export class GitHubMetadataPlugin implements Plugin {
  name = 'jekyll-github-metadata';

  register(renderer: Renderer, site: Site): void {
    // Initialize github metadata on the site
    const metadata = this.getMetadata(site);

    // Warn if repository information is missing
    if (!metadata.repository_nwo) {
      logger.warn(
        `${this.name}: No GitHub repository found. ` +
          `Set 'repository' in _config.yml (e.g., 'repository: owner/repo') or ` +
          `set the GITHUB_REPOSITORY environment variable.`
      );
    }

    // Add github metadata to site.data so it's accessible in templates
    if (!site.data) {
      site.data = {};
    }
    site.data.github = metadata;

    // Also add to site config for backward compatibility
    // Note: Using type assertion since JekyllConfig doesn't include github property
    (site.config as SiteConfigWithGitHub & { github: GitHubMetadata }).github = metadata;

    // Register the github_edit_link tag
    this.registerGitHubEditLinkTag(renderer, site);
  }

  /**
   * Register the github_edit_link liquid tag
   * @param renderer Renderer instance
   * @param site Site instance
   */
  private registerGitHubEditLinkTag(renderer: Renderer, site: Site): void {
    renderer.getLiquid().registerTag('github_edit_link', {
      parse(token: any) {
        // Parse optional link text argument from quotes
        // Supports escaped quotes within the text (e.g., "Say \"Hello\"" or 'It\'s here')
        const args = token.args.trim();

        // Use a safer parsing approach that avoids ReDoS
        // Match quoted strings using bounded patterns
        let linkText: string | null = null;

        if (args.startsWith('"')) {
          // Double-quoted string - parse character by character
          linkText = parseQuotedString(args, '"');
        } else if (args.startsWith("'")) {
          // Single-quoted string - parse character by character
          linkText = parseQuotedString(args, "'");
        }

        this.linkText = linkText;
      },
      render: function (ctx: any) {
        // Get github metadata from site data
        const github = site.data.github as GitHubMetadata;
        if (!github || !github.repository_url) {
          return '';
        }

        // Get page path from context
        const page = ctx.environments?.page || ctx.page || ctx.scopes?.[0]?.page;
        const pagePath = page?.path || '';

        // Build the edit URL
        const editUrl = buildEditUrl(github, pagePath);

        if (!editUrl) {
          return '';
        }

        // Return link or just URL based on whether link text was provided
        if (this.linkText) {
          return `<a href="${escapeHtml(editUrl)}">${escapeHtml(this.linkText)}</a>`;
        }

        return escapeHtml(editUrl);
      },
    });
  }

  /**
   * Get GitHub metadata from configuration and environment
   */
  getMetadata(site: Site): GitHubMetadata {
    const config = site.config as SiteConfigWithGitHub;

    // Try to get repository from config or environment
    const repository = this.parseRepository(config);
    const owner = repository.owner || '';
    const repoName = repository.name || '';
    const nwo = owner && repoName ? `${owner}/${repoName}` : '';

    // Determine environment
    const environment = process.env.JEKYLL_ENV || 'development';
    const isPagesEnv = environment === 'production' || !!process.env.GITHUB_PAGES;

    // Base URLs
    const baseUrl = 'https://github.com';
    const apiUrl = 'https://api.github.com';
    const hostname = 'github.com';

    // Determine if this is a user/org page or project page
    const isUserPage = repoName === `${owner}.github.io` || repoName === `${owner}.github.com`;
    const isProjectPage = !isUserPage && !!nwo;

    // Build URL
    const repoUrl = nwo ? `${baseUrl}/${nwo}` : '';

    // Source information
    const branch = config.branch || 'main';
    // GitHub Pages source path (e.g., "docs/" or "/"), NOT the Jekyll source directory
    const sourcePath = config.github_pages_source_path || '';

    return {
      api_url: apiUrl,
      base_url: baseUrl,
      build_revision: process.env.GITHUB_SHA || '',
      environment,
      hostname,
      is_pages_env: isPagesEnv,
      owner: {
        login: owner,
        name: owner,
        email: '',
        avatar_url: owner ? `https://avatars.githubusercontent.com/${owner}` : '',
        html_url: owner ? `${baseUrl}/${owner}` : '',
        type: 'User',
        site_admin: false,
      },
      repository: {
        name: repoName,
        full_name: nwo,
        owner,
        description: config.description || '',
        fork: false,
        private: false,
        homepage: config.url || '',
        html_url: repoUrl,
        clone_url: nwo ? `${repoUrl}.git` : '',
        git_url: nwo ? `git://github.com/${nwo}.git` : '',
        ssh_url: nwo ? `git@github.com:${nwo}.git` : '',
        default_branch: branch,
        language: '',
        topics: [],
        stargazers_count: 0,
        watchers_count: 0,
        forks_count: 0,
        open_issues_count: 0,
        license: null,
        created_at: '',
        updated_at: '',
        pushed_at: '',
      },
      repository_name: repoName,
      repository_nwo: nwo,
      repository_url: repoUrl,
      is_project_page: isProjectPage,
      is_user_page: isUserPage,
      owner_name: owner,
      source: {
        branch,
        path: sourcePath,
      },
      contributors: [],
      releases: [],
      public_repositories: [],
      edit_link: nwo ? `${repoUrl}/edit/${branch}/` : '',
    };
  }

  /**
   * Parse repository information from configuration
   */
  private parseRepository(config: SiteConfigWithGitHub): { owner: string; name: string } {
    // Check for explicit repository config
    if (config.repository) {
      const parts = config.repository.split('/');
      if (parts.length === 2 && parts[0] && parts[1]) {
        return { owner: parts[0], name: parts[1] };
      }
    }

    // Check for github config
    if (config.github?.repository_nwo) {
      const parts = config.github.repository_nwo.split('/');
      if (parts.length === 2 && parts[0] && parts[1]) {
        return { owner: parts[0], name: parts[1] };
      }
    }

    // Check environment variables (GitHub Actions)
    const envRepo = process.env.GITHUB_REPOSITORY;
    if (envRepo) {
      const parts = envRepo.split('/');
      if (parts.length === 2 && parts[0] && parts[1]) {
        return { owner: parts[0], name: parts[1] };
      }
    }

    // Try to infer from URL
    if (config.url) {
      const match = config.url.match(/github\.io\/([^/]+)/);
      if (match && match[1]) {
        const owner = config.url.match(/\/\/([^.]+)\.github\.io/)?.[1] || '';
        return { owner, name: match[1] };
      }

      // Check for user/org pages
      const userMatch = config.url.match(/\/\/([^.]+)\.github\.io\/?$/);
      if (userMatch && userMatch[1]) {
        const owner = userMatch[1];
        return { owner, name: `${owner}.github.io` };
      }
    }

    return { owner: '', name: '' };
  }
}

/**
 * Build the GitHub edit URL for a page
 * @param github GitHub metadata
 * @param pagePath Path to the page file
 * @returns The edit URL or empty string if missing data
 */
function buildEditUrl(github: GitHubMetadata, pagePath: string): string {
  const repositoryUrl = github.repository_url;
  const branch = github.source?.branch || 'main';
  const sourcePath = github.source?.path || '';

  if (!repositoryUrl || !pagePath) {
    return '';
  }

  // Normalize parts: remove leading slashes and ensure trailing slashes where needed
  const normalizedRepoUrl = repositoryUrl.endsWith('/')
    ? repositoryUrl.slice(0, -1)
    : repositoryUrl;
  const normalizedBranch = branch.replace(/^\//, '').replace(/\/$/, '');
  const normalizedSourcePath = sourcePath.replace(/^\//, '').replace(/\/$/, '');
  const normalizedPagePath = pagePath.replace(/^\//, '');

  // Build URL parts
  const parts = [normalizedRepoUrl, 'edit', normalizedBranch];

  if (normalizedSourcePath) {
    parts.push(normalizedSourcePath);
  }

  parts.push(normalizedPagePath);

  return parts.join('/');
}
