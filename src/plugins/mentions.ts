/**
 * Mentions Plugin for Jekyll.js
 *
 * Implements jekyll-mentions functionality using remark-github
 * Converts @mentions to GitHub profile links automatically in markdown
 * Note: Only @mentions are processed, not issues (#123), PRs, or commits
 *
 * @see https://github.com/jekyll/jekyll-mentions
 */

import { Plugin } from './types';
import { Renderer } from '../core/Renderer';
import { Site } from '../core/Site';
import { escapeHtml } from '../utils/html';

/**
 * Mentions Plugin implementation
 *
 * Uses remark-github for automatic @mention conversion in markdown content,
 * and provides the mentionify filter for use in Liquid templates.
 * Only @mentions are converted to links - issues, PRs, and commits are not processed.
 */
export class MentionsPlugin implements Plugin {
  name = 'jekyll-mentions';

  register(renderer: Renderer, site: Site): void {
    // Get base URL for mentions from config, default to GitHub
    const baseUrl =
      site.config.jekyll_mentions?.base_url ||
      site.config.mentions?.base_url ||
      'https://github.com';

    // Enable @mention processing in markdown (issues, PRs, commits are not linked)
    renderer.enableGitHubMentions({
      mentionStrong: false,
    });

    // Register the mentions filter for Liquid templates (for non-markdown content)
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
 * Uses character-by-character parsing to avoid ReDoS vulnerabilities
 */
function isInsideLink(str: string, position: number): boolean {
  const beforePosition = str.substring(0, position).toLowerCase();

  // Find last anchor open and close positions using character-by-character parsing
  let lastAnchorOpen = -1;
  let lastAnchorClose = -1;

  let i = 0;
  while (i < beforePosition.length) {
    // Look for '<a' (case-insensitive, already lowercased)
    if (
      beforePosition[i] === '<' &&
      i + 1 < beforePosition.length &&
      beforePosition[i + 1] === 'a' &&
      i + 2 < beforePosition.length
    ) {
      // Check if it's '<a>' or '<a ' (anchor tag start, not <abbr> etc.)
      const nextChar = beforePosition[i + 2];
      if (nextChar === '>' || nextChar === ' ' || nextChar === '\t' || nextChar === '\n') {
        // Find the closing '>' of this tag
        let tagEnd = i + 2;
        while (tagEnd < beforePosition.length && beforePosition[tagEnd] !== '>') {
          tagEnd++;
        }
        if (tagEnd < beforePosition.length) {
          lastAnchorOpen = i;
          i = tagEnd + 1;
          continue;
        }
      }
    }

    // Look for '</a>'
    if (
      beforePosition[i] === '<' &&
      i + 3 < beforePosition.length &&
      beforePosition[i + 1] === '/' &&
      beforePosition[i + 2] === 'a' &&
      beforePosition[i + 3] === '>'
    ) {
      lastAnchorClose = i;
      i += 4;
      continue;
    }

    i++;
  }

  if (lastAnchorOpen === -1) return false;

  // If the last anchor open is after the last anchor close, we're inside a link
  return lastAnchorOpen > lastAnchorClose;
}
