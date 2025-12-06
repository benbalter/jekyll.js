/**
 * Modern syntax highlighting using Shiki
 *
 * Shiki is a modern, fast syntax highlighter powered by the same engine as VS Code.
 * It provides accurate, beautiful syntax highlighting with minimal runtime overhead.
 *
 * Features:
 * - Uses TextMate grammars (same as VS Code)
 * - Supports 100+ languages out of the box
 * - Multiple themes available
 * - Zero runtime dependencies (pre-generated HTML)
 * - Perfect color accuracy
 *
 * @see https://shiki.matsu.io/
 */

import { createHighlighter, Highlighter, BundledLanguage, BundledTheme } from 'shiki';
import { logger } from '../utils/logger';
import { escapeHtml } from '../utils/html';

/**
 * Configuration options for syntax highlighting
 */
export interface SyntaxHighlightingOptions {
  /** Theme to use for highlighting (default: 'github-light') */
  theme?: BundledTheme | string;

  /** Additional themes to load */
  themes?: BundledTheme[];

  /** Languages to load (default: load on demand) */
  languages?: BundledLanguage[];

  /** Enable line numbers */
  lineNumbers?: boolean;

  /** Enable line highlighting */
  highlightLines?: number[];

  /** Add language label */
  showLanguage?: boolean;
}

/**
 * Singleton highlighter instance for performance
 */
let highlighterInstance: Highlighter | null = null;

/**
 * Initialize the syntax highlighter
 * This should be called once during application startup
 */
export async function initHighlighter(
  options: SyntaxHighlightingOptions = {}
): Promise<Highlighter> {
  if (highlighterInstance) {
    return highlighterInstance;
  }

  try {
    logger.debug('Initializing Shiki syntax highlighter...');

    const theme = options.theme || 'github-light';
    const themes = options.themes || [theme];

    highlighterInstance = await createHighlighter({
      themes: themes,
      langs: options.languages || [], // Load languages on demand if not specified
    });

    logger.debug(`Syntax highlighter initialized with theme: ${theme}`);
    return highlighterInstance;
  } catch (error) {
    logger.warn(
      `Failed to initialize syntax highlighter: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    throw error;
  }
}

/**
 * Get or initialize the highlighter instance
 */
async function getOrInitHighlighter(options?: SyntaxHighlightingOptions): Promise<Highlighter> {
  if (!highlighterInstance) {
    return await initHighlighter(options);
  }
  return highlighterInstance;
}

/**
 * Highlight code with syntax highlighting
 *
 * @param code Source code to highlight
 * @param language Programming language (e.g., 'javascript', 'python', 'typescript')
 * @param options Highlighting options
 * @returns HTML string with syntax highlighting
 *
 * @example
 * ```typescript
 * const html = await highlightCode('const x = 1;', 'javascript');
 * // Returns: <pre class="shiki">...</pre>
 * ```
 */
export async function highlightCode(
  code: string,
  language: string,
  options: SyntaxHighlightingOptions = {}
): Promise<string> {
  try {
    const highlighter = await getOrInitHighlighter(options);
    const theme = options.theme || 'github-light';

    // Normalize language name (handle common aliases)
    const normalizedLang = normalizeLanguage(language);

    // Try to highlight with the specified language
    try {
      // Load the language if not already loaded
      const loadedLangs = highlighter.getLoadedLanguages();
      if (!loadedLangs.includes(normalizedLang as BundledLanguage)) {
        try {
          await highlighter.loadLanguage(normalizedLang as BundledLanguage);
        } catch (_loadError) {
          // Language not available, fall back to plain text
          logger.debug(`Language '${language}' not available in Shiki, falling back to plain text`);
          return `<pre class="shiki"><code>${escapeHtml(code)}</code></pre>`;
        }
      }

      const html = highlighter.codeToHtml(code, {
        lang: normalizedLang as BundledLanguage,
        theme: theme as BundledTheme,
      });

      return html;
    } catch (_langError) {
      // If language is not supported, fall back to plain text
      logger.debug(`Language '${language}' not supported, falling back to plain text`);

      // Return plain HTML without highlighting
      return `<pre class="shiki"><code>${escapeHtml(code)}</code></pre>`;
    }
  } catch (error) {
    logger.warn(
      `Failed to highlight code: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    // Fallback to plain HTML - use language class for consistency with markdown.ts pattern
    return `<pre class="shiki"><code class="language-${escapeHtml(language)}">${escapeHtml(code)}</code></pre>`;
  }
}

/**
 * Normalize language name to Shiki's expected format
 * Handles common aliases and variations
 */
function normalizeLanguage(language: string): string {
  const langMap: Record<string, string> = {
    js: 'javascript',
    ts: 'typescript',
    py: 'python',
    rb: 'ruby',
    sh: 'bash',
    shell: 'bash',
    yml: 'yaml',
    text: 'plaintext',
    txt: 'plaintext',
    '': 'plaintext',
  };

  const lower = language.toLowerCase().trim();
  return langMap[lower] || lower;
}

/**
 * Check if a language is supported by Shiki
 *
 * @param language Language identifier to check
 * @returns true if the language is supported
 */
export async function isLanguageSupported(language: string): Promise<boolean> {
  try {
    const highlighter = await getOrInitHighlighter();
    const loadedLanguages = highlighter.getLoadedLanguages();
    return loadedLanguages.includes(language as BundledLanguage);
  } catch {
    return false;
  }
}

/**
 * Get list of available themes
 */
export function getAvailableThemes(): string[] {
  // Return a subset of popular themes for documentation
  return [
    'github-light',
    'github-dark',
    'monokai',
    'nord',
    'one-dark-pro',
    'solarized-light',
    'solarized-dark',
    'dracula',
    'material-theme',
    'vitesse-light',
    'vitesse-dark',
  ];
}

/**
 * Get list of commonly supported languages
 */
export function getCommonLanguages(): string[] {
  return [
    'javascript',
    'typescript',
    'python',
    'java',
    'ruby',
    'go',
    'rust',
    'cpp',
    'c',
    'csharp',
    'php',
    'html',
    'css',
    'scss',
    'json',
    'yaml',
    'markdown',
    'bash',
    'shell',
    'sql',
  ];
}

/**
 * Dispose of the highlighter instance
 * Call this during application shutdown to free resources
 */
export function disposeHighlighter(): void {
  if (highlighterInstance) {
    highlighterInstance = null;
    logger.debug('Syntax highlighter disposed');
  }
}
