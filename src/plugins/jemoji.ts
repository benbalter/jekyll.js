/**
 * Jemoji Plugin for Jekyll.js
 *
 * Implements jemoji functionality using the node-emoji library
 * Converts GitHub-style emoji codes (e.g., :smile:) to emoji characters
 *
 * @see https://github.com/jekyll/jemoji
 * @see https://github.com/omnidan/node-emoji
 */

import { Plugin } from './index';
import { Renderer } from '../core/Renderer';
import { Site } from '../core/Site';
import * as nodeEmoji from 'node-emoji';

/**
 * Jemoji Plugin implementation
 *
 * Uses the node-emoji library for comprehensive emoji support
 */
export class JemojiPlugin implements Plugin {
  name = 'jemoji';

  register(renderer: Renderer, _site: Site): void {
    // Register the emojify filter
    renderer.getLiquid().registerFilter('emojify', (input: string) => {
      return emojify(input);
    });
  }
}

/**
 * Convert GitHub-style emoji codes to actual emoji characters
 * Uses node-emoji library for comprehensive emoji support
 *
 * @param input String containing emoji codes like :smile:
 * @returns String with emoji codes replaced by actual emoji
 */
export function emojify(input: string): string {
  if (!input) return '';

  // Use node-emoji's emojify function with fallback to preserve unknown codes
  return nodeEmoji.emojify(String(input), {
    fallback: (name: string) => `:${name}:`,
  });
}

/**
 * Get the emoji character for a given emoji name
 * @param name Emoji name without colons (e.g., 'smile')
 * @returns Emoji character or undefined if not found
 */
export function getEmoji(name: string): string | undefined {
  return nodeEmoji.get(name);
}

/**
 * Check if a given emoji name exists
 * @param name Emoji name to check
 * @returns True if emoji exists
 */
export function hasEmoji(name: string): boolean {
  return nodeEmoji.has(name);
}

/**
 * Find emoji information by name or emoji character
 * @param codeOrName Emoji name or character
 * @returns Object with emoji and key, or undefined if not found
 */
export function findEmoji(codeOrName: string): { emoji: string; key: string } | undefined {
  return nodeEmoji.find(codeOrName);
}
