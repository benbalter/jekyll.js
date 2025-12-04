/**
 * Modern resource hints plugin for preload/prefetch link generation
 *
 * This plugin generates resource hints (preload, prefetch, preconnect, dns-prefetch)
 * to improve page load performance. These hints tell browsers to fetch critical
 * resources earlier in the page load lifecycle.
 *
 * Features:
 * - Automatic detection of critical resources (CSS, fonts, hero images)
 * - Preload links for render-blocking resources
 * - Prefetch links for likely next-page resources
 * - Preconnect hints for third-party origins
 * - DNS prefetch for external domains
 * - Fully opt-in to maintain backwards compatibility
 *
 * @see https://web.dev/preload-critical-assets/
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/rel/preload
 */

import { logger } from '../utils/logger';
import { escapeHtml } from '../utils/html';

/**
 * Resource hint types
 */
export type ResourceHintType = 'preload' | 'prefetch' | 'preconnect' | 'dns-prefetch';

/**
 * Resource types for preload
 */
export type ResourceType = 'style' | 'script' | 'font' | 'image' | 'fetch' | 'document';

/**
 * Resource hint configuration
 */
export interface ResourceHint {
  /** URL of the resource */
  href: string;

  /** Type of hint */
  rel: ResourceHintType;

  /** Resource type (for preload) */
  as?: ResourceType;

  /** MIME type (for fonts) */
  type?: string;

  /** Crossorigin attribute */
  crossorigin?: 'anonymous' | 'use-credentials' | '';

  /** Media query (for responsive preloads) */
  media?: string;
}

/**
 * Configuration options for resource hints
 */
export interface ResourceHintsOptions {
  /** Enable resource hints generation (default: false) */
  enabled?: boolean;

  /** Automatically detect and preload CSS files (default: true) */
  preloadStyles?: boolean;

  /** Automatically detect and preload fonts (default: true) */
  preloadFonts?: boolean;

  /** Automatically detect and preload hero images (default: false) */
  preloadHeroImages?: boolean;

  /** Origins to preconnect to */
  preconnectOrigins?: string[];

  /** URLs to prefetch for next-page resources */
  prefetchUrls?: string[];

  /** Custom preload resources */
  customPreloads?: ResourceHint[];

  /** DNS prefetch domains */
  dnsPrefetchDomains?: string[];
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: ResourceHintsOptions = {
  enabled: false,
  preloadStyles: true,
  preloadFonts: true,
  preloadHeroImages: false,
  preconnectOrigins: [],
  prefetchUrls: [],
  customPreloads: [],
  dnsPrefetchDomains: [],
};

/**
 * Common CDN and third-party origins that benefit from preconnect
 */
const COMMON_PRECONNECT_ORIGINS = [
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com',
  'https://cdnjs.cloudflare.com',
  'https://unpkg.com',
  'https://cdn.jsdelivr.net',
];

/**
 * Generate resource hint HTML link element
 *
 * @param hint Resource hint configuration
 * @returns HTML link element string
 */
export function generateHintTag(hint: ResourceHint): string {
  const parts = [`<link rel="${hint.rel}" href="${escapeHtml(hint.href)}"`];

  if (hint.as) {
    parts.push(`as="${hint.as}"`);
  }

  if (hint.type) {
    parts.push(`type="${escapeHtml(hint.type)}"`);
  }

  if (hint.crossorigin !== undefined) {
    if (hint.crossorigin === '') {
      parts.push('crossorigin');
    } else {
      parts.push(`crossorigin="${hint.crossorigin}"`);
    }
  }

  if (hint.media) {
    parts.push(`media="${escapeHtml(hint.media)}"`);
  }

  parts.push('>');
  return parts.join(' ');
}

/**
 * Extract stylesheets from HTML content
 *
 * @param html HTML content
 * @returns Array of stylesheet URLs
 */
export function extractStylesheets(html: string): string[] {
  // First, find all <link> tags using a simple pattern to avoid ReDoS
  const linkTagRegex = /<link\s[^>]{0,500}>/gi;
  const stylesheets: string[] = [];

  let linkMatch;
  while ((linkMatch = linkTagRegex.exec(html)) !== null) {
    const linkTag = linkMatch[0];

    // Check if this link tag is a stylesheet
    if (!/rel\s*=\s*["']stylesheet["']/i.test(linkTag)) {
      continue;
    }

    // Extract href value with a simple pattern
    const hrefMatch = linkTag.match(/href\s*=\s*["']([^"']{0,500})["']/i);
    if (hrefMatch?.[1]) {
      stylesheets.push(hrefMatch[1]);
    }
  }

  return [...new Set(stylesheets)]; // Remove duplicates
}

/**
 * Extract font URLs from HTML and CSS content
 *
 * @param html HTML content
 * @returns Array of font URLs
 */
export function extractFonts(html: string): string[] {
  const fonts: string[] = [];

  // Match preload links for fonts using a two-step approach to avoid ReDoS
  // First find all <link> tags
  const linkTagRegex = /<link\s[^>]{0,500}>/gi;

  let linkMatch;
  while ((linkMatch = linkTagRegex.exec(html)) !== null) {
    const linkTag = linkMatch[0];

    // Check if this is a font preload link
    if (/rel\s*=\s*["']preload["']/i.test(linkTag) && /as\s*=\s*["']font["']/i.test(linkTag)) {
      // Extract href value
      const hrefMatch = linkTag.match(/href\s*=\s*["']([^"']{0,500})["']/i);
      if (hrefMatch?.[1]) {
        fonts.push(hrefMatch[1]);
      }
    }
  }

  // Match font URLs in inline styles - safe pattern with bounded quantifier
  const fontFaceRegex = /url\(["']?([^"')]{0,500}\.(?:woff2?|ttf|otf|eot))["']?\)/gi;

  let fontMatch;
  while ((fontMatch = fontFaceRegex.exec(html)) !== null) {
    if (fontMatch[1]) {
      fonts.push(fontMatch[1]);
    }
  }

  return [...new Set(fonts)];
}

/**
 * Extract hero image (first large image in content)
 *
 * @param html HTML content
 * @returns Hero image URL or undefined
 */
export function extractHeroImage(html: string): string | undefined {
  // Look for first image that's likely to be a hero image
  // Priority: images with loading="eager", images in header/hero sections, first large image

  // Find all <img> tags using a bounded pattern to avoid ReDoS
  const imgTagRegex = /<img\s[^>]{0,1000}>/gi;

  let imgMatch;
  while ((imgMatch = imgTagRegex.exec(html)) !== null) {
    const imgTag = imgMatch[0];

    // Extract src value
    const srcMatch = imgTag.match(/src\s*=\s*["']([^"']{0,500})["']/i);
    if (!srcMatch?.[1]) {
      continue;
    }
    const srcValue = srcMatch[1];

    // Check for hero class
    const classMatch = imgTag.match(/class\s*=\s*["']([^"']{0,500})["']/i);
    if (classMatch?.[1] && /(?:hero|banner|cover|featured)/i.test(classMatch[1])) {
      return srcValue;
    }

    // Check for loading="eager"
    if (/loading\s*=\s*["']eager["']/i.test(imgTag)) {
      return srcValue;
    }
  }

  // Check for images inside header or main tags
  // Use a simpler approach: find header/main opening tags, then look for first img after
  const headerMainRegex = /<(?:header|main)[\s>]/i;
  const headerMatch = html.match(headerMainRegex);
  if (headerMatch && headerMatch.index !== undefined) {
    const afterHeader = html.slice(headerMatch.index);
    const firstImgMatch = afterHeader.match(/<img\s[^>]{0,1000}>/i);
    if (firstImgMatch) {
      const srcMatch = firstImgMatch[0].match(/src\s*=\s*["']([^"']{0,500})["']/i);
      if (srcMatch?.[1]) {
        return srcMatch[1];
      }
    }
  }

  return undefined;
}

/**
 * Extract external origins from HTML content
 *
 * @param html HTML content
 * @returns Array of external origin URLs
 */
export function extractExternalOrigins(html: string): string[] {
  const urlRegex = /(?:href|src)=["'](https?:\/\/[^/"']+)/gi;
  const origins = new Set<string>();

  let match;
  while ((match = urlRegex.exec(html)) !== null) {
    if (match[1]) {
      try {
        const url = new URL(match[1]);
        origins.add(url.origin);
      } catch {
        // Invalid URL, skip
      }
    }
  }

  return Array.from(origins);
}

/**
 * Generate resource hints for HTML content
 *
 * @param html HTML content to analyze
 * @param options Resource hints options
 * @returns Array of resource hints
 */
export function generateResourceHints(
  html: string,
  options: ResourceHintsOptions = {}
): ResourceHint[] {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  if (!mergedOptions.enabled) {
    return [];
  }

  const hints: ResourceHint[] = [];

  // Add custom preloads
  if (mergedOptions.customPreloads) {
    hints.push(...mergedOptions.customPreloads);
  }

  // Preload stylesheets
  if (mergedOptions.preloadStyles) {
    const stylesheets = extractStylesheets(html);
    for (const href of stylesheets.slice(0, 3)) {
      // Limit to first 3 stylesheets
      hints.push({
        href,
        rel: 'preload',
        as: 'style',
      });
    }
  }

  // Preload fonts
  if (mergedOptions.preloadFonts) {
    const fonts = extractFonts(html);
    for (const href of fonts.slice(0, 5)) {
      // Limit to first 5 fonts
      const isWoff2 = href.endsWith('.woff2');
      hints.push({
        href,
        rel: 'preload',
        as: 'font',
        type: isWoff2 ? 'font/woff2' : undefined,
        crossorigin: 'anonymous',
      });
    }
  }

  // Preload hero image
  if (mergedOptions.preloadHeroImages) {
    const heroImage = extractHeroImage(html);
    if (heroImage) {
      hints.push({
        href: heroImage,
        rel: 'preload',
        as: 'image',
      });
    }
  }

  // Add preconnect hints
  if (mergedOptions.preconnectOrigins && mergedOptions.preconnectOrigins.length > 0) {
    for (const origin of mergedOptions.preconnectOrigins) {
      hints.push({
        href: origin,
        rel: 'preconnect',
        crossorigin: '',
      });
    }
  }

  // Add prefetch hints
  if (mergedOptions.prefetchUrls && mergedOptions.prefetchUrls.length > 0) {
    for (const url of mergedOptions.prefetchUrls) {
      hints.push({
        href: url,
        rel: 'prefetch',
      });
    }
  }

  // Add DNS prefetch hints
  if (mergedOptions.dnsPrefetchDomains && mergedOptions.dnsPrefetchDomains.length > 0) {
    for (const domain of mergedOptions.dnsPrefetchDomains) {
      hints.push({
        href: domain,
        rel: 'dns-prefetch',
      });
    }
  }

  // Auto-detect external origins for preconnect (if no manual list provided)
  if (
    (!mergedOptions.preconnectOrigins || mergedOptions.preconnectOrigins.length === 0) &&
    (!mergedOptions.dnsPrefetchDomains || mergedOptions.dnsPrefetchDomains.length === 0)
  ) {
    const externalOrigins = extractExternalOrigins(html);
    const commonOrigins = externalOrigins.filter((o) => COMMON_PRECONNECT_ORIGINS.includes(o));

    for (const origin of commonOrigins.slice(0, 3)) {
      hints.push({
        href: origin,
        rel: 'preconnect',
        crossorigin: '',
      });
    }
  }

  return hints;
}

/**
 * Generate resource hints HTML block
 *
 * @param html HTML content to analyze
 * @param options Resource hints options
 * @returns HTML string with resource hint link elements
 */
export function generateResourceHintsHtml(
  html: string,
  options: ResourceHintsOptions = {}
): string {
  const hints = generateResourceHints(html, options);

  if (hints.length === 0) {
    return '';
  }

  const lines = hints.map((hint) => `  ${generateHintTag(hint)}`);
  return `<!-- Resource Hints -->\n${lines.join('\n')}\n`;
}

/**
 * Inject resource hints into HTML <head>
 *
 * @param html HTML content
 * @param options Resource hints options
 * @returns HTML with resource hints injected
 */
export function injectResourceHints(html: string, options: ResourceHintsOptions = {}): string {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  if (!mergedOptions.enabled) {
    return html;
  }

  const hintsHtml = generateResourceHintsHtml(html, options);

  if (!hintsHtml) {
    return html;
  }

  // Try to inject after <head> tag - use bounded pattern to avoid ReDoS
  const headMatch = html.match(/<head[\s>][^>]{0,200}>/i) || html.match(/<head>/i);
  if (headMatch) {
    const insertPos = (headMatch.index ?? 0) + headMatch[0].length;
    return html.slice(0, insertPos) + '\n' + hintsHtml + html.slice(insertPos);
  }

  // If no head tag, prepend to HTML
  logger.debug('No <head> tag found, prepending resource hints');
  return hintsHtml + html;
}

/**
 * Check if resource hints are enabled in config
 *
 * @param config Site configuration
 * @returns true if resource hints are enabled
 */
export function isResourceHintsEnabled(config: {
  modern?: { resourceHints?: ResourceHintsOptions };
}): boolean {
  return config.modern?.resourceHints?.enabled === true;
}

/**
 * Get resource hints options from config
 *
 * @param config Site configuration
 * @returns Merged resource hints options
 */
export function getResourceHintsOptions(config: {
  modern?: { resourceHints?: ResourceHintsOptions };
}): ResourceHintsOptions {
  return {
    ...DEFAULT_OPTIONS,
    ...config.modern?.resourceHints,
  };
}
