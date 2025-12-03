/**
 * Jemoji Plugin for Jekyll.js
 *
 * Implements jemoji functionality using the node-emoji library and remark-gemoji
 * Converts GitHub-style emoji codes (e.g., :smile:) to emoji characters
 *
 * @see https://github.com/jekyll/jemoji
 * @see https://github.com/omnidan/node-emoji
 */

import { Plugin } from './index';
import { Renderer } from '../core/Renderer';
import { Site } from '../core/Site';
import {
  emojify as nodeEmojiEmojify,
  get as nodeEmojiGet,
  has as nodeEmojiHas,
  find as nodeEmojiFind,
} from 'node-emoji';

/**
 * Jemoji Plugin implementation
 *
 * Uses remark-gemoji for automatic emoji conversion in markdown content,
 * and provides the emojify filter for use in Liquid templates
 */
export class JemojiPlugin implements Plugin {
  name = 'jemoji';

  register(renderer: Renderer, _site: Site): void {
    // Enable emoji processing in markdown (converts :emoji: to unicode automatically)
    renderer.enableEmojiProcessing();

    // Register the emojify filter for Liquid templates (for non-markdown content)
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
  return nodeEmojiEmojify(String(input), {
    fallback: (name: string) => `:${name}:`,
  });
}

/**
 * Get the emoji character for a given emoji name
 * @param name Emoji name without colons (e.g., 'smile')
 * @returns Emoji character or undefined if not found
 */
export function getEmoji(name: string): string | undefined {
  return nodeEmojiGet(name);
}

/**
 * Check if a given emoji name exists
 * @param name Emoji name to check
 * @returns True if emoji exists
 */
export function hasEmoji(name: string): boolean {
  return nodeEmojiHas(name);
}

/**
 * Find emoji information by name or emoji character
 * @param codeOrName Emoji name or character
 * @returns Object with emoji and key, or undefined if not found
 */
export function findEmoji(codeOrName: string): { emoji: string; key: string } | undefined {
  return nodeEmojiFind(codeOrName);
}
