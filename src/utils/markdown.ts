/**
 * Markdown utility functions for Jekyll.js
 * Helper functions for processing markdown in various contexts
 */

import { processMarkdown } from '../core/markdown';
import striptags from 'striptags';

/**
 * Process text that may contain markdown by converting to HTML and stripping tags.
 * This matches Jekyll's behavior of processing description fields with markdownify | strip_html.
 *
 * @param text - Text that may contain markdown
 * @param options - Processing options
 * @param options.maxLength - Optional maximum length to truncate to
 * @returns Processed plain text with markdown converted and HTML stripped
 */
export async function processTextWithMarkdown(
  text: string,
  options: { maxLength?: number } = {}
): Promise<string> {
  if (!text) return '';

  try {
    // Convert markdown to HTML
    const html = await processMarkdown(text);
    // Strip HTML tags to get plain text
    let result = striptags(html).trim();

    // Apply length limit if specified, respecting word boundaries
    if (options.maxLength && result.length > options.maxLength) {
      result = result.substring(0, options.maxLength);
      // Find last space before maxLength to avoid cutting words
      const lastSpace = result.lastIndexOf(' ');
      // Only truncate at word boundary if we don't lose too much content (more than 20%)
      if (lastSpace >= options.maxLength * 0.8) {
        result = result.substring(0, lastSpace);
      }
    }

    return result;
  } catch (_error) {
    // If markdown processing fails, return the original text (with optional truncation)
    let result = text.trim();
    if (options.maxLength && result.length > options.maxLength) {
      result = result.substring(0, options.maxLength);
      // Find last space before maxLength to avoid cutting words
      const lastSpace = result.lastIndexOf(' ');
      // Only truncate at word boundary if we don't lose too much content (more than 20%)
      if (lastSpace >= options.maxLength * 0.8) {
        result = result.substring(0, lastSpace);
      }
    }
    return result;
  }
}

/**
 * Process text with markdown and preserve HTML output.
 * Useful for feed content where HTML formatting should be preserved.
 *
 * @param text - Text that may contain markdown
 * @returns Processed HTML with markdown converted
 */
export async function processTextWithMarkdownToHtml(text: string): Promise<string> {
  if (!text) return '';

  try {
    // Convert markdown to HTML and return as-is
    return await processMarkdown(text);
  } catch (_error) {
    // If markdown processing fails, return the original text
    return text;
  }
}
