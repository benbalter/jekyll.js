/**
 * HTML utility functions for Jekyll.js
 * Common HTML escaping and manipulation utilities
 */

/**
 * Escape HTML special characters to prevent XSS attacks
 * @param str String to escape
 * @returns Escaped string safe for HTML output
 */
export function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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
    .replace(/\r/g, '\\r');
}
