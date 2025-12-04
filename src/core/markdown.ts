/**
 * Markdown processing using Remark
 *
 * This module provides optimized markdown processing using the Remark ecosystem.
 * Key optimizations:
 * - Module caching: Dynamic imports are cached after first load
 * - Processor caching: Frozen processors are reused for repeated processing
 * - Parallel module loading: Core modules are loaded simultaneously
 * - Processor freezing: Processors are frozen after configuration for optimal performance
 */

/**
 * Options for markdown processing
 */
export interface MarkdownOptions {
  /** Enable emoji processing (converts :emoji: to unicode) */
  emoji?: boolean;
  /** Enable GitHub-style @mentions (links @username to GitHub profiles) */
  githubMentions?:
    | boolean
    | {
        /** GitHub repository (e.g., 'owner/repo') - used by remark-github but mentions are the only references processed */
        repository?: string;
        /** Wrap mentions in strong tags (default: true in remark-github) */
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

// Track in-progress optional module loads to prevent race conditions
let loadingEmoji: Promise<void> | null = null;
let loadingGithub: Promise<void> | null = null;

// Cached frozen processors for different option combinations
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
  // If modules are already loaded, load optional modules if needed and return
  if (cachedModules !== null) {
    await loadOptionalModules(options);
    return cachedModules;
  }

  // Load all core modules in parallel
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

  // Load optional modules if needed
  await loadOptionalModules(options);

  return cachedModules;
}

/**
 * Load optional modules (emoji, GitHub mentions) if needed and not already cached.
 * Uses tracking variables to prevent race conditions when called concurrently.
 */
async function loadOptionalModules(options: MarkdownOptions): Promise<void> {
  if (!cachedModules) return;

  const loadPromises: Promise<void>[] = [];

  // Handle emoji module loading with race condition prevention
  // Keep the promise reference until the module is cached, don't clear it in the handler
  if (options.emoji && !cachedModules.remarkGemoji) {
    if (!loadingEmoji) {
      loadingEmoji = import('remark-gemoji').then(({ default: remarkGemoji }) => {
        cachedModules!.remarkGemoji = remarkGemoji;
      });
    }
    loadPromises.push(loadingEmoji);
  }

  // Handle GitHub module loading with race condition prevention
  if (options.githubMentions && !cachedModules.remarkGithub) {
    if (!loadingGithub) {
      loadingGithub = import('remark-github').then(({ default: remarkGithub, defaultBuildUrl }) => {
        cachedModules!.remarkGithub = remarkGithub;
        cachedModules!.defaultBuildUrl = defaultBuildUrl;
      });
    }
    loadPromises.push(loadingGithub);
  }

  if (loadPromises.length > 0) {
    await Promise.all(loadPromises);
  }
}

/**
 * Get or create a cached, frozen processor for the given options
 * Frozen processors are optimized for repeated use
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
    // Type matches remark-github's BuildUrlValues which has type: 'commit' | 'compare' | 'issue' | 'mention'
    const mentionsOnlyBuildUrl = (values: {
      type: 'commit' | 'compare' | 'issue' | 'mention';
      user: string;
    }): string | false => {
      if (values.type === 'mention') {
        // Type narrowing: when type is 'mention', values matches BuildUrlMentionValues
        return defaultBuildUrl(values as { type: 'mention'; user: string });
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

  // Freeze the processor to optimize for repeated use
  // This tells unified that the processor configuration is complete
  processor.freeze();

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
 * @param _options Markdown options (unused - function always throws)
 * @throws {Error} Always throws - synchronous processing not supported
 */
export function processMarkdownSync(_content: string, _options?: MarkdownOptions): never {
  throw new Error('processMarkdownSync is not supported. Use processMarkdown instead.');
}

/**
 * Pre-initialize the markdown processor for optimal performance.
 * Call this early in application startup to ensure modules are loaded
 * and processor is cached before processing any documents.
 *
 * This function:
 * - Loads all required Remark modules in parallel
 * - Creates and freezes a processor with the given options
 * - Caches the processor for reuse
 *
 * @param options Optional markdown processing options
 * @returns Promise that resolves when initialization is complete
 */
export async function initMarkdownProcessor(options: MarkdownOptions = {}): Promise<void> {
  await getProcessor(options);
}
