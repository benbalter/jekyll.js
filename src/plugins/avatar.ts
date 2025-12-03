/**
 * Avatar Plugin for Jekyll.js
 *
 * Implements jekyll-avatar functionality
 * Generates GitHub avatar image tags from usernames
 *
 * @see https://github.com/jekyll/jekyll-avatar
 */

import { Plugin } from './index';
import { Renderer } from '../core/Renderer';
import { Site } from '../core/Site';

/**
 * Avatar Plugin implementation
 */
export class AvatarPlugin implements Plugin {
  name = 'jekyll-avatar';

  register(renderer: Renderer, _site: Site): void {
    // Register the avatar tag
    // Usage: {% avatar username %}
    // Usage: {% avatar username size=80 %}
    renderer.getLiquid().registerTag('avatar', {
      parse(token: any) {
        const args = token.args.trim();
        
        // Parse username and optional size parameter
        // Format: username [size=N]
        const match = args.match(/^(\S+)(?:\s+size\s*=\s*(\d+))?$/i);
        
        if (!match) {
          throw new Error('avatar tag requires a username argument');
        }
        
        this.username = match[1];
        this.size = match[2] ? parseInt(match[2], 10) : 40; // Default size is 40
      },
      render: function (ctx: any) {
        // Resolve username - it might be a variable reference
        let username = this.username;
        
        // Check if username is a variable reference (doesn't start with quote)
        if (!username.startsWith('"') && !username.startsWith("'")) {
          // Try to resolve from context using various methods
          const resolved = ctx.get([username]) || 
                           ctx.environments?.[username] || 
                           ctx.scopes?.[0]?.[username];
          if (resolved) {
            username = String(resolved);
          }
        } else {
          // Remove quotes if present
          username = username.replace(/^["']|["']$/g, '');
        }
        
        // Sanitize username to prevent XSS
        const sanitizedUsername = sanitizeUsername(username);
        const size = this.size;
        
        return generateAvatarTag(sanitizedUsername, size);
      },
    });
  }
}

/**
 * Sanitize username to prevent XSS attacks
 * Only allow alphanumeric characters, hyphens, and underscores
 */
function sanitizeUsername(username: string): string {
  return String(username).replace(/[^a-zA-Z0-9_-]/g, '');
}

/** Multiplier for retina/high-DPI display support */
const RETINA_MULTIPLIER = 2;

/**
 * Generate an avatar image tag for a GitHub user
 * @param username GitHub username
 * @param size Image size in pixels (default: 40)
 * @returns HTML img tag for the avatar
 */
export function generateAvatarTag(username: string, size: number = 40): string {
  const sanitized = sanitizeUsername(username);
  
  if (!sanitized) {
    return '';
  }
  
  // Use GitHub's avatar service
  // The retina size provides a high-DPI version
  const url = `https://avatars.githubusercontent.com/${sanitized}?v=4&s=${size * RETINA_MULTIPLIER}`;
  const escapedUrl = escapeHtml(url);
  const escapedUsername = escapeHtml(sanitized);
  
  return `<img class="avatar avatar-small" src="${escapedUrl}" alt="${escapedUsername}" srcset="${escapedUrl} 2x" width="${size}" height="${size}" />`;
}

/**
 * Get the avatar URL for a GitHub user
 * @param username GitHub username
 * @param size Image size in pixels (default: 40)
 * @returns Avatar URL string
 */
export function getAvatarUrl(username: string, size: number = 40): string {
  const sanitized = sanitizeUsername(username);
  
  if (!sanitized) {
    return '';
  }
  
  return `https://avatars.githubusercontent.com/${sanitized}?v=4&s=${size}`;
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
