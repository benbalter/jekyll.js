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
