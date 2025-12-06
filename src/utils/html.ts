/**
 * HTML utility functions for Jekyll.js
 * Common HTML escaping and manipulation utilities
 *
 * Uses the 'html-escaper' library for safe and consistent HTML escaping
 */

import { escape as htmlEscape, unescape as htmlUnescape } from 'html-escaper';

/**
 * Escape HTML special characters to prevent XSS attacks
 * Uses the 'html-escaper' library for safe escaping of &, <, >, ", and '
 * @param str String to escape
 * @returns Escaped string safe for HTML output
 */
export function escapeHtml(str: string): string {
  return htmlEscape(String(str));
}

/**
 * Unescape HTML entities back to their original characters
 * Reverses the escaping done by escapeHtml
 * @param str String with HTML entities to unescape
 * @returns Unescaped string
 */
export function unescapeHtml(str: string): string {
  return htmlUnescape(String(str));
}

/**
 * Escape JavaScript string for use in a script tag
 * @param str String to escape
 * @returns Escaped string safe for JavaScript context
 */
export function escapeJs(str: string): string {
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    .replace(/</g, '\\x3c')
    .replace(/>/g, '\\x3e')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(/\f/g, '\\f');
}

/**
 * Escape XML special characters for use in XML/SVG content
 * Escapes &, <, >, ", and ' for safe XML output
 * @param str String to escape
 * @returns Escaped string safe for XML context
 * Escape XML special characters for safe use in XML/SVG content
 * Escapes &, <, >, ", and ' characters
 * @param str String to escape
 * @returns Escaped string safe for XML output
 */
export function escapeXml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Escape HTML special characters for use in HTML attribute values
 * Similar to escapeXml but uses &#39; for single quote (more compatible with HTML)
 * @param str String to escape
 * @returns Escaped string safe for use in HTML attribute values
 */
export function escapeHtmlAttribute(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Safely stringify an object to JSON for embedding in a <script> tag.
 *
 * JSON.stringify does not escape certain characters that can break out of
 * a <script> tag context, creating XSS vulnerabilities. This function
 * escapes:
 * - `</` to `<\/` to prevent closing script tags (</script>)
 * - `<!--` to `<\!--` to prevent HTML comment injection
 * - U+2028 (Line Separator) and U+2029 (Paragraph Separator) which are
 *   valid in JSON but invalid in JavaScript strings
 *
 * @param data The data to stringify
 * @param indent Optional indentation for pretty printing (number of spaces or string)
 * @returns JSON string safe for embedding in <script> tags
 *
 * @example
 * // Safe to embed in <script type="application/ld+json">
 * const json = safeJsonStringify({ title: '</script><script>alert(1)</script>' });
 * // Returns: {"title":"<\/script><script>alert(1)<\/script>"}
 */
export function safeJsonStringify(data: unknown, indent?: number | string): string {
  const json = JSON.stringify(data, null, indent);
  if (json === undefined) {
    return 'null';
  }
  // Escape sequences that could break out of script context
  return json
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
