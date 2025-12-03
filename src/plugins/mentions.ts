/**
 * Mentions Plugin for Jekyll.js
 *
 * Implements jekyll-mentions functionality
 * Converts @mentions to GitHub profile links
 *
 * @see https://github.com/jekyll/jekyll-mentions
 */

import { Plugin } from './index';
import { Renderer } from '../core/Renderer';
import { Site } from '../core/Site';

/**
 * Mentions Plugin implementation
 */
export class MentionsPlugin implements Plugin {
  name = 'jekyll-mentions';

  register(renderer: Renderer, site: Site): void {
    // Get base URL for mentions from config, default to GitHub
    const baseUrl = site.config.jekyll_mentions?.base_url || 
                    site.config.mentions?.base_url ||
                    'https://github.com';
    
    // Register the mentions filter
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
  // Must be preceded by whitespace, start of string, or certain punctuation
  // Must not be inside a link already
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
  // Simple check: look for <a before position without closing </a>
  const beforePosition = str.substring(0, position).toLowerCase();
  const lastAnchorOpen = beforePosition.lastIndexOf('<a');
  
  if (lastAnchorOpen === -1) return false;
  
  const lastAnchorClose = beforePosition.lastIndexOf('</a>');
  
  // If the last anchor open is after the last anchor close, we're inside a link
  return lastAnchorOpen > lastAnchorClose;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
