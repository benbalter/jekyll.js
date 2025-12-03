/**
 * Mentions Plugin for Jekyll.js
 *
 * Implements jekyll-mentions functionality using remark-github
 * Converts @mentions to GitHub profile links automatically in markdown
 *
 * @see https://github.com/jekyll/jekyll-mentions
 */

import { Plugin } from './index';
import { Renderer } from '../core/Renderer';
import { Site } from '../core/Site';
import { escapeHtml } from '../utils/html';

/**
 * Mentions Plugin implementation
 *
 * Uses remark-github for automatic @mention conversion in markdown content,
 * and provides the mentionify filter for use in Liquid templates
 */
export class MentionsPlugin implements Plugin {
  name = 'jekyll-mentions';

  register(renderer: Renderer, site: Site): void {
    // Get base URL for mentions from config, default to GitHub
    const baseUrl =
      site.config.jekyll_mentions?.base_url ||
      site.config.mentions?.base_url ||
      'https://github.com';

    // Get repository for GitHub references (issues, PRs, etc.)
    const repository = site.config.repository || process.env.GITHUB_REPOSITORY || undefined;

    // Only enable GitHub mentions/references processing in markdown if repository is configured.
    // The remark-github library (used for markdown processing) requires a repository to link
    // GitHub-specific features like @mentions, issue references (#123), and commit SHAs.
    // Without a repository, remark-github throws an error, so we gracefully skip this feature.
    if (repository) {
      renderer.enableGitHubMentions({
        repository,
        mentionStrong: false,
      });
    }

    // Register the mentions filter for Liquid templates (for non-markdown content)
    // This filter works independently of remark-github and doesn't require repository
    renderer.getLiquid().registerFilter('mentionify', (input: string) => {
      return mentionify(input, baseUrl);
    });
  }
}

/**
 * Convert @mentions to links
 * @param input Text containing @mentions
 * @param baseUrl Base URL for profile links (default: https://github.com)
 * @returns Text with mentions converted to links
 */
export function mentionify(input: string, baseUrl: string = 'https://github.com'): string {
  if (!input) return '';

  // Remove trailing slash from base URL
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');

  // Match @username patterns
  // GitHub usernames: alphanumeric, hyphens (not at start/end), max 39 chars
  // Negative lookbehind ensures @ is not immediately preceded by an alphanumeric character.
  // Note: Exclusion of matches inside links is handled by isInsideLink(), not by this regex.
  const mentionRegex = /(?<![a-zA-Z0-9])@([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?)/g;

  return String(input).replace(mentionRegex, (match, username, offset, str) => {
    // Check if we're inside an HTML tag or existing link
    if (isInsideHtmlTag(str, offset) || isInsideLink(str, offset)) {
      return match;
    }

    const escapedUsername = escapeHtml(username);
    const escapedUrl = escapeHtml(`${normalizedBaseUrl}/${username}`);

    return `<a href="${escapedUrl}" class="user-mention">@${escapedUsername}</a>`;
  });
}

/**
 * Check if a position is inside an HTML tag
 */
function isInsideHtmlTag(str: string, position: number): boolean {
  // Find the last < before position
  const beforePosition = str.substring(0, position);
  const lastOpenBracket = beforePosition.lastIndexOf('<');

  if (lastOpenBracket === -1) return false;

  // Check if there's a > between the last < and position
  const betweenBrackets = str.substring(lastOpenBracket, position);
  return !betweenBrackets.includes('>');
}

/**
 * Check if a position is inside an anchor link
 */
function isInsideLink(str: string, position: number): boolean {
  // Improved check: look for last valid <a ...> before position without closing </a>
  const beforePosition = str.substring(0, position).toLowerCase();

  // Regex to match <a> or <a ...> tags
  const anchorOpenRegex = /<a(?:\s+[^>]*)?>/gi;
  let lastAnchorOpen = -1;
  let match: RegExpExecArray | null;

  while ((match = anchorOpenRegex.exec(beforePosition)) !== null) {
    lastAnchorOpen = match.index;
  }

  if (lastAnchorOpen === -1) return false;

  const lastAnchorClose = beforePosition.lastIndexOf('</a>');

  // If the last anchor open is after the last anchor close, we're inside a link
  return lastAnchorOpen > lastAnchorClose;
}
