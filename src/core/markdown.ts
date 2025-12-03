/**
 * Markdown processing using Remark
 */

/**
 * Options for markdown processing
 */
export interface MarkdownOptions {
  /** Enable emoji processing (converts :emoji: to unicode) */
  emoji?: boolean;
  /** Enable GitHub-style mentions and references */
  githubMentions?: boolean | {
    /** GitHub repository (e.g., 'owner/repo') for linking issues/PRs */
    repository?: string;
    /** Base URL for user mentions (default: 'https://github.com') */
    mentionStrong?: boolean;
  };
}

/**
 * Process markdown content to HTML using Remark
 *
 * @param content Markdown content to process
 * @param options Optional markdown processing options
 * @returns HTML output
 *
 * @security WARNING: This function does NOT sanitize HTML output (sanitize: false).
 * Raw HTML in markdown is passed through unchanged to match Jekyll's behavior.
 *
 * **Security Implications:**
 * - If processing user-controlled content, this could expose sites to XSS attacks
 * - Malicious HTML/JavaScript in markdown will be included in the output
 * - Callers are responsible for validating and sanitizing input if needed
 *
 * **Use Cases:**
 * - Safe for trusted content (site authors, static content)
 * - Matches Jekyll's default behavior (no HTML sanitization)
 * - Required for sites that intentionally include raw HTML in markdown
 *
 * **Recommendation:**
 * Only process markdown from trusted sources. If handling user-generated content,
 * implement additional input validation or consider using sanitize: true.
 */
export async function processMarkdown(content: string, options: MarkdownOptions = {}): Promise<string> {
  // Dynamic import to handle ESM modules
  const { unified } = await import('unified');
  const { default: remarkParse } = await import('remark-parse');
  const { default: remarkGfm } = await import('remark-gfm');
  const { default: remarkHtml } = await import('remark-html');

  // Build the processor pipeline
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let processor: any = unified()
    .use(remarkParse) // Parse markdown
    .use(remarkGfm); // GitHub Flavored Markdown support

  // Add emoji support if enabled (jemoji plugin)
  if (options.emoji) {
    const { default: remarkGemoji } = await import('remark-gemoji');
    processor = processor.use(remarkGemoji);
  }

  // Add GitHub mentions/references support if enabled (jekyll-mentions plugin)
  if (options.githubMentions) {
    const { default: remarkGithub } = await import('remark-github');
    const githubOptions = typeof options.githubMentions === 'object' ? options.githubMentions : {};
    processor = processor.use(remarkGithub, githubOptions);
  }

  const result = await processor
    .use(remarkHtml, { sanitize: false }) // SECURITY: No sanitization - matches Jekyll behavior, allows raw HTML
    .process(content);

  return String(result);
}

/**
 * Process markdown content to HTML synchronously
 * Note: This is not supported due to ESM module limitations
 * Always throws an error. Use processMarkdown instead.
 * @deprecated Use processMarkdown instead
 * @param _content Markdown content (unused - function always throws)
 * @throws {Error} Always throws - synchronous processing not supported
 */
export function processMarkdownSync(_content: string): never {
  throw new Error('processMarkdownSync is not supported. Use processMarkdown instead.');
}
