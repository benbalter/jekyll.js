/**
 * GitHub Metadata Plugin for Jekyll.js
 *
 * Implements jekyll-github-metadata functionality
 * Provides access to GitHub repository metadata in templates
 *
 * @see https://github.com/jekyll/github-metadata
 */

import { Plugin } from './index';
import { Renderer } from '../core/Renderer';
import { Site } from '../core/Site';

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
  source?: string;
}

/**
 * GitHub Metadata Plugin implementation
 */
export class GitHubMetadataPlugin implements Plugin {
  name = 'jekyll-github-metadata';

  register(_renderer: Renderer, site: Site): void {
    // Initialize github metadata on the site
    const metadata = this.getMetadata(site);
    
    // Add github metadata to site.data so it's accessible in templates
    if (!site.data) {
      site.data = {};
    }
    site.data.github = metadata;
    
    // Also add to site config for backward compatibility
    // Note: Using type assertion since JekyllConfig doesn't include github property
    (site.config as SiteConfigWithGitHub & { github: GitHubMetadata }).github = metadata;
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
    const sourcePath = config.source || '';
    
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
