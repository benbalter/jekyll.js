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
  githubMentions?:
    | boolean
    | {
        /** GitHub repository (e.g., 'owner/repo') for linking issues/PRs */
        repository?: string;
        /** Base URL for user mentions (default: 'https://github.com') */
        mentionStrong?: boolean;
      };
}

// Cached module imports to avoid repeated dynamic imports
let cachedModules: {
  unified: typeof import('unified').unified;
  remarkParse: typeof import('remark-parse').default;
  remarkGfm: typeof import('remark-gfm').default;
  remarkHtml: typeof import('remark-html').default;
  remarkGemoji?: typeof import('remark-gemoji').default;
  remarkGithub?: typeof import('remark-github').default;
  defaultBuildUrl?: typeof import('remark-github').defaultBuildUrl;
} | null = null;

// Cached processors for different option combinations
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const processorCache = new Map<string, any>();

/**
 * Generate a cache key for the given options
 */
function getOptionsCacheKey(options: MarkdownOptions): string {
  const emoji = options.emoji ? '1' : '0';
  const github = options.githubMentions
    ? typeof options.githubMentions === 'object'
      ? JSON.stringify(options.githubMentions)
      : '1'
    : '0';
  return `${emoji}:${github}`;
}

/**
 * Load and cache the required modules
 */
async function loadModules(options: MarkdownOptions): Promise<typeof cachedModules> {
  if (cachedModules === null) {
    const [{ unified }, { default: remarkParse }, { default: remarkGfm }, { default: remarkHtml }] =
      await Promise.all([
        import('unified'),
        import('remark-parse'),
        import('remark-gfm'),
        import('remark-html'),
      ]);

    cachedModules = {
      unified,
      remarkParse,
      remarkGfm,
      remarkHtml,
    };
  }

  // Load optional modules if needed and not already cached
  if (options.emoji && !cachedModules.remarkGemoji) {
    const { default: remarkGemoji } = await import('remark-gemoji');
    cachedModules.remarkGemoji = remarkGemoji;
  }

  if (options.githubMentions && !cachedModules.remarkGithub) {
    const { default: remarkGithub, defaultBuildUrl } = await import('remark-github');
    cachedModules.remarkGithub = remarkGithub;
    cachedModules.defaultBuildUrl = defaultBuildUrl;
  }

  return cachedModules;
}

/**
 * Get or create a cached processor for the given options
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getProcessor(options: MarkdownOptions): Promise<any> {
  const cacheKey = getOptionsCacheKey(options);

  if (processorCache.has(cacheKey)) {
    return processorCache.get(cacheKey);
  }

  const modules = await loadModules(options);
  if (!modules) {
    throw new Error('Failed to load markdown modules');
  }

  // Build the processor pipeline
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let processor: any = modules
    .unified()
    .use(modules.remarkParse) // Parse markdown
    .use(modules.remarkGfm); // GitHub Flavored Markdown support

  // Add emoji support if enabled (jemoji plugin)
  if (options.emoji && modules.remarkGemoji) {
    processor = processor.use(modules.remarkGemoji);
  }

  // Add GitHub mentions/references support if enabled (jekyll-mentions plugin)
  // Only handle @mentions, not issues, PRs, commits, or other references
  if (options.githubMentions && modules.remarkGithub && modules.defaultBuildUrl) {
    const githubOptions = typeof options.githubMentions === 'object' ? options.githubMentions : {};
    const defaultBuildUrl = modules.defaultBuildUrl;

    // Custom buildUrl that only handles mentions, returning false for other types
    // This ensures we don't auto-link issues (#123), commits, or other GitHub references
    const mentionsOnlyBuildUrl = (values: { type: string }) => {
      if (values.type === 'mention') {
        return defaultBuildUrl(values as Parameters<typeof defaultBuildUrl>[0]);
      }
      return false;
    };

    processor = processor.use(modules.remarkGithub, {
      ...githubOptions,
      buildUrl: mentionsOnlyBuildUrl,
    });
  }

  // Add HTML output - SECURITY: No sanitization - matches Jekyll behavior, allows raw HTML
  processor = processor.use(modules.remarkHtml, { sanitize: false });

  processorCache.set(cacheKey, processor);
  return processor;
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
export async function processMarkdown(
  content: string,
  options: MarkdownOptions = {}
): Promise<string> {
  const processor = await getProcessor(options);
  const result = await processor.process(content);
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
