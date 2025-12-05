/**
 * SEO Tag Plugin for Jekyll.js
 *
 * Implements jekyll-seo-tag functionality
 * Generates SEO meta tags including Open Graph and Twitter Cards
 *
 * @see https://github.com/jekyll/jekyll-seo-tag
 */

import { Plugin } from './types';
import { Renderer } from '../core/Renderer';
import { Site } from '../core/Site';

/**
 * SEO Tag Plugin implementation
 */
export class SeoTagPlugin implements Plugin {
  name = 'jekyll-seo-tag';

  register(renderer: Renderer, site: Site): void {
    // Register the seo tag
    renderer.getLiquid().registerTag('seo', {
      parse(_token: any) {
        // No arguments needed for seo tag
      },
      render: function (ctx: any) {
        // Access page from the context's environments/scopes
        const page = ctx.environments?.page || ctx.page || ctx.scopes?.[0]?.page;
        return generateSeoTags(page, site);
      },
    });
  }
}

/**
 * Generate SEO meta tags for a page
 */
function generateSeoTags(page: any, site: Site): string {
  const tags: string[] = [];
  const config = site.config;

  // Extract page and site metadata
  const pageTitle = page.title || '';
  const siteTitle = config.title || '';
  const pageDescription = page.description || config.description || '';
  const siteUrl = config.url || '';
  const baseurl = config.baseurl || '';
  const pageUrl = page.url ? `${siteUrl}${baseurl}${page.url}` : '';
  const author = page.author || config.author || '';
  const image = page.image || config.image || '';
  const imageUrl = image ? (image.startsWith('http') ? image : `${siteUrl}${baseurl}${image}`) : '';

  // Page type
  const pageType = page.layout === 'post' || page.date ? 'article' : 'website';

  // Title tag
  const fullTitle =
    pageTitle && siteTitle && pageTitle !== siteTitle
      ? `${pageTitle} | ${siteTitle}`
      : pageTitle || siteTitle;

  if (fullTitle) {
    tags.push(`<title>${escapeHtml(fullTitle)}</title>`);
  }

  // Meta description
  if (pageDescription) {
    tags.push(`<meta name="description" content="${escapeHtml(pageDescription)}">`);
  }

  // Canonical URL
  if (pageUrl) {
    tags.push(`<link rel="canonical" href="${escapeHtml(pageUrl)}">`);
  }

  // Open Graph tags
  if (pageTitle) {
    tags.push(`<meta property="og:title" content="${escapeHtml(pageTitle)}">`);
  }
  if (pageDescription) {
    tags.push(`<meta property="og:description" content="${escapeHtml(pageDescription)}">`);
  }
  if (pageUrl) {
    tags.push(`<meta property="og:url" content="${escapeHtml(pageUrl)}">`);
  }
  if (siteTitle) {
    tags.push(`<meta property="og:site_name" content="${escapeHtml(siteTitle)}">`);
  }
  tags.push(`<meta property="og:type" content="${pageType}">`);
  if (imageUrl) {
    tags.push(`<meta property="og:image" content="${escapeHtml(imageUrl)}">`);
  }

  // Twitter Card tags
  tags.push(`<meta name="twitter:card" content="${imageUrl ? 'summary_large_image' : 'summary'}">`);
  if (pageTitle) {
    tags.push(`<meta name="twitter:title" content="${escapeHtml(pageTitle)}">`);
  }
  if (pageDescription) {
    tags.push(`<meta name="twitter:description" content="${escapeHtml(pageDescription)}">`);
  }
  if (imageUrl) {
    tags.push(`<meta name="twitter:image" content="${escapeHtml(imageUrl)}">`);
  }

  // Twitter handle if specified
  const twitterUsername = config.twitter?.username || config.twitter_username;
  if (twitterUsername) {
    const handle = twitterUsername.startsWith('@') ? twitterUsername : `@${twitterUsername}`;
    tags.push(`<meta name="twitter:site" content="${escapeHtml(handle)}">`);
  }

  // Author meta for articles
  if (pageType === 'article' && author) {
    const authorName = typeof author === 'string' ? author : author.name || '';
    if (authorName) {
      tags.push(`<meta name="author" content="${escapeHtml(authorName)}">`);
    }
  }

  // Article published/modified time
  if (pageType === 'article' && page.date) {
    const date = new Date(page.date);
    tags.push(`<meta property="article:published_time" content="${date.toISOString()}">`);
  }
  if (pageType === 'article' && page.last_modified_at) {
    const modifiedDate = new Date(page.last_modified_at);
    tags.push(`<meta property="article:modified_time" content="${modifiedDate.toISOString()}">`);
  }

  // JSON-LD structured data
  const jsonLd = generateJsonLd(page, site, pageUrl, fullTitle, pageDescription, imageUrl, author);
  if (jsonLd) {
    tags.push(`<script type="application/ld+json">${jsonLd}</script>`);
  }

  return tags.join('\n');
}

/**
 * Generate JSON-LD structured data
 */
function generateJsonLd(
  page: any,
  site: Site,
  pageUrl: string,
  title: string,
  description: string,
  imageUrl: string,
  author: any
): string {
  const config = site.config;
  const data: any = {
    '@context': 'https://schema.org',
  };

  // Determine type based on page
  if (page.layout === 'post' || page.date) {
    data['@type'] = 'BlogPosting';
    data.headline = title;
    if (description) {
      data.description = description;
    }
    if (pageUrl) {
      data.url = pageUrl;
      data.mainEntityOfPage = {
        '@type': 'WebPage',
        '@id': pageUrl,
      };
    }
    if (page.date) {
      data.datePublished = new Date(page.date).toISOString();
    }
    if (page.last_modified_at) {
      data.dateModified = new Date(page.last_modified_at).toISOString();
    }
    if (imageUrl) {
      data.image = imageUrl;
    }

    // Author information
    if (author) {
      const authorName = typeof author === 'string' ? author : author.name || '';
      if (authorName) {
        data.author = {
          '@type': 'Person',
          name: authorName,
        };
      }
    }

    // Publisher information
    if (config.title) {
      data.publisher = {
        '@type': 'Organization',
        name: config.title,
      };
      if (config.logo) {
        const logoUrl = config.logo.startsWith('http')
          ? config.logo
          : `${config.url || ''}${config.baseurl || ''}${config.logo}`;
        data.publisher.logo = {
          '@type': 'ImageObject',
          url: logoUrl,
        };
      }
    }
  } else {
    data['@type'] = 'WebSite';
    data.name = title;
    if (description) {
      data.description = description;
    }
    if (pageUrl) {
      data.url = pageUrl;
    }
  }

  return JSON.stringify(data);
}

/**
 * Escape HTML special characters to prevent XSS
 */
function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
