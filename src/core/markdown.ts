/**
 * Markdown processing using Remark
 */

/**
 * Process markdown content to HTML using Remark
 * @param content Markdown content to process
 * @returns HTML output
 */
export async function processMarkdown(content: string): Promise<string> {
  // Dynamic import to handle ESM modules
  const { unified } = await import('unified');
  const { default: remarkParse } = await import('remark-parse');
  const { default: remarkGfm } = await import('remark-gfm');
  const { default: remarkHtml } = await import('remark-html');

  const result = await unified()
    .use(remarkParse) // Parse markdown
    .use(remarkGfm)   // GitHub Flavored Markdown support
    .use(remarkHtml, { sanitize: false }) // Convert to HTML, don't sanitize (Jekyll doesn't)
    .process(content);

  return String(result);
}

/**
 * Process markdown content to HTML synchronously
 * Note: This is not supported due to ESM module limitations
 * @param _content Markdown content to process (unused)
 * @returns HTML output
 */
export function processMarkdownSync(_content: string): string {
  // For sync version, we'll just return the content as-is
  // This is a temporary limitation due to ESM dynamic imports
  // In practice, callers should use the async version
  throw new Error('processMarkdownSync is not supported. Use processMarkdown instead.');
}
