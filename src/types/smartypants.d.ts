/**
 * Type declarations for the smartypants library
 * @see https://github.com/othree/smartypants.js
 */

declare module 'smartypants' {
  /**
   * Attribute value for SmartyPants to control which transformations are applied.
   * - "0" - suppress all transformations
   * - "1" - standard transformations: quotes, backticks, dashes, ellipses
   * - "2" - standard + old-style dashes
   * - "3" - inverted old-style dashes
   * - "-1" - stub for testing
   * - "q" - quotes
   * - "b" - backticks
   * - "B" - double backticks only
   * - "d" - dashes
   * - "D" - old-school dashes
   * - "i" - inverted old-school dashes
   * - "e" - ellipses
   * - "w" - prevent_breaks
   */
  type Attr = string | number;

  /**
   * Convert plain ASCII punctuation characters to "smart" typographic HTML entities.
   * Returns HTML entities for smart characters.
   * @param text - Text to process
   * @param attr - Optional attribute to control transformations
   * @returns Text with HTML entities for smart characters
   */
  export function smartypants(text: string, attr?: Attr): string;

  /**
   * Convert plain ASCII quotes to smart quotes.
   * Returns HTML entities for smart quotes.
   * @param text - Text to process
   * @returns Text with HTML entities for smart quotes
   */
  export function smartquotes(text: string): string;

  /**
   * Convert plain ASCII dashes to smart dashes.
   * Returns HTML entities for smart dashes.
   * @param text - Text to process
   * @param attr - Optional attribute to control transformations
   * @returns Text with HTML entities for smart dashes
   */
  export function smartdashes(text: string, attr?: Attr): string;

  /**
   * Convert plain ASCII ellipses to smart ellipses.
   * Returns HTML entities for smart ellipses.
   * @param text - Text to process
   * @returns Text with HTML entities for smart ellipses
   */
  export function smartellipses(text: string): string;

  /**
   * Convert plain ASCII punctuation characters to "smart" typographic Unicode characters.
   * Returns Unicode characters instead of HTML entities.
   * @param text - Text to process
   * @param attr - Optional attribute to control transformations
   * @returns Text with Unicode smart characters
   */
  export function smartypantsu(text: string, attr?: Attr): string;

  /**
   * Default export is the same as smartypants function.
   */
  export default smartypants;
}
