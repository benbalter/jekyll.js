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
 * Always throws an error. Use processMarkdown instead.
 * @deprecated Use processMarkdown instead
 * @throws {Error} Always throws - synchronous processing not supported
 */
export function processMarkdownSync(content: string): never {
  throw new Error('processMarkdownSync is not supported. Use processMarkdown instead.');
}
