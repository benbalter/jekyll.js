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

import { escape as escapeHtml } from 'html-escaper';

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
  /** Enable syntax highlighting for code blocks */
  syntaxHighlighting?:
    | boolean
    | {
        /** Theme to use for highlighting (default: 'github-light') */
        theme?: string;
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
  let html = String(result);

  // Post-process to handle Kramdown-style attribute lists
  // This supports syntax like {: .class #id attr="value" }
  html = processKramdownAttributes(html);

  // Apply syntax highlighting to code blocks if enabled
  if (options.syntaxHighlighting) {
    const theme =
      typeof options.syntaxHighlighting === 'object'
        ? options.syntaxHighlighting.theme || 'github-light'
        : 'github-light';
    html = await applySyntaxHighlighting(html, theme);
  }

  return html;
}

/**
 * Process Kramdown-style attribute lists in HTML output.
 *
 * Kramdown's Inline Attribute Lists (IAL) syntax allows adding classes, IDs,
 * and other attributes to elements. The syntax is:
 * - {: .class } - adds a class
 * - {: #id } - adds an ID
 * - {: attr="value" } - adds a custom attribute
 * - Multiple can be combined: {: .class1 .class2 #myid data-foo="bar" }
 *
 * The IAL can appear:
 * 1. On a separate line after a block element (paragraph, heading, list, etc.)
 * 2. Inline immediately after an element
 *
 * ## Implementation Approach
 *
 * This implementation uses HTML post-processing rather than integrating into
 * the remark AST pipeline. This approach was chosen because:
 *
 * 1. **Syntax incompatibility**: The `remark-attr` plugin exists but uses
 *    different syntax (`{.class}`) than Kramdown (`{: .class }` with colon).
 *
 * 2. **Reliability**: Post-processing operates on final HTML, avoiding AST
 *    complexity and edge cases with nested elements.
 *
 * 3. **Jekyll compatibility**: Matches Jekyll/Kramdown output exactly for
 *    common use cases.
 *
 * ## Known Limitations
 *
 * **1. Indented HTML in Liquid loops is treated as code blocks**
 *
 * When HTML is indented inside Liquid `{% for %}` loops or conditionals,
 * the markdown processor (remark) may treat the indented content as a
 * fenced code block due to CommonMark/GFM rules.
 *
 * Example that may not render correctly:
 * ```liquid
 * {% for item in items %}
 *     <div class="item">{{ item.name }}</div>
 * {% endfor %}
 * ```
 *
 * Workaround: Remove indentation or use `{% raw %}{% endraw %}` blocks:
 * ```liquid
 * {% for item in items %}
 * <div class="item">{{ item.name }}</div>
 * {% endfor %}
 * ```
 *
 * **2. Attributes on elements spanning multiple paragraphs**
 *
 * IAL attributes only apply to the immediately preceding element. Kramdown
 * has similar limitations with complex multi-block structures.
 *
 * **3. Inline IAL position**
 *
 * Inline attributes must immediately follow the closing tag with no
 * whitespace: `*text*{: .class }` works, `*text* {: .class }` does not.
 *
 * ## Security
 *
 * Event handler attributes (onclick, onload, etc.) are blocked to prevent
 * XSS attacks. See DANGEROUS_ATTRS constant below.
 *
 * @param html The HTML content to process
 * @returns HTML with Kramdown attributes applied
 *
 * @example
 * // Input markdown (after remark processing):
 * // <p>Hello world</p>\n<p>{: .highlight }</p>
 * // Output:
 * // <p class="highlight">Hello world</p>
 */

// Constants for tag lists to improve readability and maintainability
const BLOCK_TAGS =
  'p|h[1-6]|li|blockquote|div|pre|ul|ol|dl|dt|dd|table|tr|td|th|figure|figcaption|section|article|aside|header|footer|nav|main';
const INLINE_TAGS =
  'span|a|em|strong|code|mark|del|ins|sub|sup|abbr|cite|q|kbd|samp|var|time|small|s|u|b|i';

/**
 * Maximum length for Kramdown attribute strings.
 * This limit prevents ReDoS attacks by bounding the regex match length.
 */
const MAX_KRAMDOWN_ATTR_LENGTH = 500;

/**
 * Pre-compiled regex patterns for Kramdown attribute processing.
 * These are compiled once at module load time to avoid repeated compilation overhead.
 * When using global ('g') flag patterns with replace(), the lastIndex is automatically
 * reset by the replace method, so no manual reset is needed.
 */
const KRAMDOWN_BLOCK_PATTERN = new RegExp(
  `(<(?:${BLOCK_TAGS})[^>]*>)([\\s\\S]*?)(<\\/(?:${BLOCK_TAGS})>)\\s*\\n?<p>\\{:\\s*([^}]{1,${MAX_KRAMDOWN_ATTR_LENGTH}})\\s*\\}<\\/p>`,
  'gi'
);
const KRAMDOWN_INLINE_PATTERN = new RegExp(
  `(<(?:${INLINE_TAGS})[^>]*>)([\\s\\S]*?)(<\\/(?:${INLINE_TAGS})>)\\{:\\s*([^}]{1,${MAX_KRAMDOWN_ATTR_LENGTH}})\\s*\\}`,
  'gi'
);
const KRAMDOWN_STANDALONE_PATTERN = new RegExp(
  `<p>\\{:\\s*[^}]{1,${MAX_KRAMDOWN_ATTR_LENGTH}}\\s*\\}<\\/p>\\s*\\n?`,
  'gi'
);

// Dangerous event handler attributes that should be blocked to prevent XSS
const DANGEROUS_ATTRS = new Set([
  'onabort',
  'onafterprint',
  'onbeforeprint',
  'onbeforeunload',
  'onblur',
  'oncanplay',
  'oncanplaythrough',
  'onchange',
  'onclick',
  'oncontextmenu',
  'oncopy',
  'oncuechange',
  'oncut',
  'ondblclick',
  'ondrag',
  'ondragend',
  'ondragenter',
  'ondragleave',
  'ondragover',
  'ondragstart',
  'ondrop',
  'ondurationchange',
  'onemptied',
  'onended',
  'onerror',
  'onfocus',
  'onhashchange',
  'oninput',
  'oninvalid',
  'onkeydown',
  'onkeypress',
  'onkeyup',
  'onload',
  'onloadeddata',
  'onloadedmetadata',
  'onloadstart',
  'onmessage',
  'onmousedown',
  'onmousemove',
  'onmouseout',
  'onmouseover',
  'onmouseup',
  'onmousewheel',
  'onoffline',
  'ononline',
  'onpagehide',
  'onpageshow',
  'onpaste',
  'onpause',
  'onplay',
  'onplaying',
  'onpopstate',
  'onprogress',
  'onratechange',
  'onreset',
  'onresize',
  'onscroll',
  'onsearch',
  'onseeked',
  'onseeking',
  'onselect',
  'onstalled',
  'onstorage',
  'onsubmit',
  'onsuspend',
  'ontimeupdate',
  'ontoggle',
  'onunload',
  'onvolumechange',
  'onwaiting',
  'onwheel',
  'formaction',
  'xlink:href',
]);

function processKramdownAttributes(html: string): string {
  // Handle block-level attributes (on separate lines wrapped in <p> tags)
  // Note: String.replace() automatically resets lastIndex for global regex patterns
  html = html.replace(KRAMDOWN_BLOCK_PATTERN, (match, openTag, content, closeTag, attrs) => {
    const attributes = parseKramdownAttributes(attrs);
    if (!attributes) return match;
    return applyAttributesToTag(openTag, attributes) + content + closeTag;
  });

  // Handle inline Kramdown attributes that appear immediately after a closing tag
  html = html.replace(KRAMDOWN_INLINE_PATTERN, (match, openTag, content, closeTag, attrs) => {
    const attributes = parseKramdownAttributes(attrs);
    if (!attributes) return match;
    return applyAttributesToTag(openTag, attributes) + content + closeTag;
  });

  // Remove any remaining standalone Kramdown attribute blocks that weren't matched
  html = html.replace(KRAMDOWN_STANDALONE_PATTERN, '');

  return html;
}

/**
 * Parse Kramdown attribute string into an object.
 * @param attrString The attribute string (e.g., ".class1 .class2 #myid data-attr='value'")
 * @returns Object with classes, id, and other attributes, or null if invalid
 */
function parseKramdownAttributes(
  attrString: string
): { classes: string[]; id?: string; attrs: Record<string, string> } | null {
  if (!attrString || attrString.length > MAX_KRAMDOWN_ATTR_LENGTH) return null;

  const result: { classes: string[]; id?: string; attrs: Record<string, string> } = {
    classes: [],
    attrs: {},
  };

  // Tokenize the attribute string
  // Match classes (.classname), IDs (#idname), and key="value" or key='value' pairs
  // Safe patterns with limited length and restricted character sets
  // Attribute values only allow alphanumeric, spaces, hyphens, underscores, and common punctuation
  const tokens = attrString.match(
    /\.[a-zA-Z_][a-zA-Z0-9_-]{0,100}|#[a-zA-Z_][a-zA-Z0-9_-]{0,100}|[a-zA-Z_][a-zA-Z0-9_-]{0,50}=["'][a-zA-Z0-9 _.,:;!?@#$%^&*()+=/-]{0,200}["']/g
  );

  if (!tokens || tokens.length === 0) return null;

  for (const token of tokens) {
    if (token.startsWith('.')) {
      // Class: .classname
      result.classes.push(token.substring(1));
    } else if (token.startsWith('#')) {
      // ID: #idname
      result.id = token.substring(1);
    } else if (token.includes('=')) {
      // Attribute: key="value" or key='value'
      const [key, ...valueParts] = token.split('=');
      if (key) {
        let value = valueParts.join('=');
        // Remove quotes
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        // Sanitize attribute name to prevent XSS
        const sanitizedKey = key.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
        // Block dangerous event handler attributes
        if (sanitizedKey && !DANGEROUS_ATTRS.has(sanitizedKey)) {
          result.attrs[sanitizedKey] = value;
        }
      }
    }
  }

  // Return null if no valid attributes were parsed
  if (result.classes.length === 0 && !result.id && Object.keys(result.attrs).length === 0) {
    return null;
  }

  return result;
}

/**
 * Apply parsed attributes to an HTML opening tag.
 * @param tag The opening tag (e.g., "<p>" or "<p class='existing'>")
 * @param attributes The parsed Kramdown attributes
 * @returns The modified opening tag with attributes applied
 */
function applyAttributesToTag(
  tag: string,
  attributes: { classes: string[]; id?: string; attrs: Record<string, string> }
): string {
  // Extract the tag name
  const tagMatch = tag.match(/^<([a-zA-Z][a-zA-Z0-9]*)/);
  if (!tagMatch) return tag;

  const tagName = tagMatch[1];

  // Parse existing attributes from the tag
  const existingClassMatch = tag.match(/class=["']([^"']*)["']/i);
  const existingIdMatch = tag.match(/id=["']([^"']*)["']/i);

  // Merge classes
  let classes: string[] = [];
  if (existingClassMatch && existingClassMatch[1]) {
    classes = existingClassMatch[1].split(/\s+/).filter(Boolean);
  }
  classes = [...new Set([...classes, ...attributes.classes])]; // Deduplicate

  // Determine final ID (Kramdown attributes override existing)
  const finalId = attributes.id || (existingIdMatch ? existingIdMatch[1] : undefined);

  // Build the new tag
  let newTag = `<${tagName}`;

  // Add ID if present
  if (finalId) {
    // Escape the ID to prevent XSS using html-escaper library
    const escapedId = escapeHtml(finalId);
    newTag += ` id="${escapedId}"`;
  }

  // Add classes if present
  if (classes.length > 0) {
    // Escape each class to prevent XSS using html-escaper library
    const escapedClasses = classes.map(escapeHtml).join(' ');
    newTag += ` class="${escapedClasses}"`;
  }

  // Add custom attributes
  for (const [key, value] of Object.entries(attributes.attrs)) {
    // Skip class and id as they're handled above
    if (key.toLowerCase() === 'class' || key.toLowerCase() === 'id') continue;
    // Escape the value to prevent XSS using html-escaper library
    const escapedValue = escapeHtml(value);
    newTag += ` ${key}="${escapedValue}"`;
  }

  // Preserve any other attributes from the original tag that we didn't process
  // Remove the existing class and id attributes as we've already handled them
  let remainingAttrs = tag
    .replace(/^<[a-zA-Z][a-zA-Z0-9]*/, '')
    .replace(/class=["'][^"']*["']/gi, '')
    .replace(/id=["'][^"']*["']/gi, '')
    .replace(/>$/, '')
    .trim();

  if (remainingAttrs) {
    newTag += ' ' + remainingAttrs;
  }

  newTag += '>';
  return newTag;
}

/**
 * Apply syntax highlighting to code blocks in HTML.
 * This function finds <pre><code> blocks and applies Shiki syntax highlighting.
 *
 * @param html The HTML content to process
 * @param theme The theme to use for syntax highlighting
 * @returns HTML with syntax highlighted code blocks
 */
async function applySyntaxHighlighting(html: string, theme: string): Promise<string> {
  // Dynamically import the syntax highlighting module to avoid ESM issues
  const { highlightCode } = await import('../plugins/syntax-highlighting');

  // Pattern to match code blocks: <pre><code class="language-xxx">...</code></pre>
  // Also matches without the language class: <pre><code>...</code></pre>
  const codeBlockPattern = /<pre><code(?:\s+class="language-([^"]*)")?>([\s\S]*?)<\/code><\/pre>/gi;

  // Collect all matches and their replacements
  const matches: Array<{ match: string; index: number; replacement: Promise<string> }> = [];
  let match: RegExpExecArray | null;

  while ((match = codeBlockPattern.exec(html)) !== null) {
    const fullMatch = match[0];
    const language = match[1] || 'text';
    const code = match[2] || '';

    // Decode HTML entities in the code content
    const decodedCode = code
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    matches.push({
      match: fullMatch,
      index: match.index,
      replacement: highlightCode(decodedCode, language, { theme: theme as any }),
    });
  }

  // If no code blocks found, return original HTML
  if (matches.length === 0) {
    return html;
  }

  // Wait for all highlighting to complete
  const replacements = await Promise.all(matches.map((m) => m.replacement));

  // Replace code blocks from end to start to maintain correct indices
  let result = html;
  for (let i = matches.length - 1; i >= 0; i--) {
    const m = matches[i];
    if (m) {
      result = result.slice(0, m.index) + replacements[i] + result.slice(m.index + m.match.length);
    }
  }

  return result;
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
