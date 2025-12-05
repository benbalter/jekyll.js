/**
 * Feed Plugin for Jekyll.js
 *
 * Implements jekyll-feed functionality
 * Generates an Atom feed (feed.xml) for blog posts
 *
 * @see https://github.com/jekyll/jekyll-feed
 */

import { Plugin, GeneratorPlugin, GeneratorResult, GeneratorPriority } from './types';
import { Renderer } from '../core/Renderer';
import { Site } from '../core/Site';
import { Document } from '../core/Document';

/**
 * Get feed URL configuration from site config
 */
function getFeedUrlInfo(site: Site): { siteUrl: string; feedPath: string; feedUrl: string } {
  const config = site.config;
  const baseUrl = config.url || '';
  const baseurl = config.baseurl || '';
  const siteUrl = `${baseUrl}${baseurl}`;
  const feedPath = config.feed?.path || '/feed.xml';
  // Ensure feedPath starts with /
  const normalizedPath = feedPath.startsWith('/') ? feedPath : '/' + feedPath;
  const feedUrl = `${siteUrl}${normalizedPath}`;
  return { siteUrl, feedPath: normalizedPath, feedUrl };
}

/**
 * Feed Plugin implementation
 * Implements both Plugin (for Liquid tags) and GeneratorPlugin interfaces
 */
export class FeedPlugin implements Plugin, GeneratorPlugin {
  name = 'jekyll-feed';
  priority = GeneratorPriority.LOW; // Run late but before sitemap

  register(renderer: Renderer, site: Site): void {
    // Store a reference for backward compatibility with legacy builder code
    (site as any)._feedPlugin = this;

    // Register the feed_meta tag
    renderer.getLiquid().registerTag('feed_meta', {
      parse(_token: any) {
        // No arguments needed for feed_meta tag
      },
      render: function () {
        return generateFeedMetaTag(site);
      },
    });
  }

  /**
   * Generator interface - generates feed.xml file
   */
  generate(site: Site, _renderer: Renderer): GeneratorResult {
    const { feedPath } = getFeedUrlInfo(site);
    const content = this.generateFeed(site);

    // Remove leading slash for file path (destination expects relative path)
    const filePath = feedPath.replace(/^\//, '');

    return {
      files: [
        {
          path: filePath,
          content,
        },
      ],
    };
  }

  /**
   * Generate the Atom feed XML content
   */
  generateFeed(site: Site): string {
    const config = site.config;
    const { siteUrl, feedUrl } = getFeedUrlInfo(site);

    // Feed metadata
    const title = config.title || 'Feed';
    const description = config.description || '';
    const author = config.author || {};
    const authorName = typeof author === 'string' ? author : author.name || '';
    const authorEmail = typeof author === 'object' ? author.email || '' : '';
    const authorUri = typeof author === 'object' ? author.url || author.uri || '' : '';

    // Get posts to include (only published, sorted by date)
    const posts = site.posts
      .filter((post) => post.published)
      .sort((a, b) => {
        const dateA = a.date?.getTime() || 0;
        const dateB = b.date?.getTime() || 0;
        return dateB - dateA;
      });

    // Limit to recent posts (configurable, default 10)
    const maxPosts = config.feed?.posts_limit || 10;
    const feedPosts = posts.slice(0, maxPosts);

    // Get the most recent post date for feed updated time
    const latestPost = feedPosts[0];
    const updated = latestPost?.date || new Date();

    const lines: string[] = [
      '<?xml version="1.0" encoding="utf-8"?>',
      '<feed xmlns="http://www.w3.org/2005/Atom">',
    ];

    // Feed metadata
    lines.push(`  <title>${escapeXml(title)}</title>`);
    if (description) {
      lines.push(`  <subtitle>${escapeXml(description)}</subtitle>`);
    }
    lines.push(`  <link href="${escapeXml(feedUrl)}" rel="self" type="application/atom+xml"/>`);
    lines.push(`  <link href="${escapeXml(siteUrl)}/" rel="alternate" type="text/html"/>`);
    lines.push(`  <updated>${new Date(updated).toISOString()}</updated>`);
    lines.push(`  <id>${escapeXml(siteUrl)}/</id>`);

    // Author information
    if (authorName) {
      lines.push('  <author>');
      lines.push(`    <name>${escapeXml(authorName)}</name>`);
      if (authorEmail) {
        lines.push(`    <email>${escapeXml(authorEmail)}</email>`);
      }
      if (authorUri) {
        lines.push(`    <uri>${escapeXml(authorUri)}</uri>`);
      }
      lines.push('  </author>');
    }

    // Generator tag
    lines.push(
      '  <generator uri="https://github.com/benbalter/jekyll.js" version="0.1.0">Jekyll.js</generator>'
    );

    // Add entries for each post
    for (const post of feedPosts) {
      lines.push(this.generateEntry(post, site, siteUrl));
    }

    lines.push('</feed>');
    return lines.join('\n');
  }

  /**
   * Generate a single feed entry for a post
   */
  private generateEntry(post: Document, site: Site, siteUrl: string): string {
    const lines: string[] = [];
    const postUrl = `${siteUrl}${post.url || ''}`;
    const postDate = post.date || new Date();
    const postTitle = post.title || 'Untitled';

    // Get post author
    const postAuthor = post.data.author || site.config.author || {};
    const authorName = typeof postAuthor === 'string' ? postAuthor : postAuthor.name || '';
    const authorEmail = typeof postAuthor === 'object' ? postAuthor.email || '' : '';
    const authorUri = typeof postAuthor === 'object' ? postAuthor.url || postAuthor.uri || '' : '';

    // Get post excerpt or description
    const excerpt = post.data.excerpt || post.data.description || '';

    lines.push('  <entry>');
    lines.push(`    <title type="html">${escapeXml(postTitle)}</title>`);
    lines.push(
      `    <link href="${escapeXml(postUrl)}" rel="alternate" type="text/html" title="${escapeXml(postTitle)}"/>`
    );
    lines.push(`    <published>${new Date(postDate).toISOString()}</published>`);

    // Use last_modified_at if available, otherwise use date
    const updatedDate = post.data.last_modified_at || postDate;
    lines.push(`    <updated>${new Date(updatedDate).toISOString()}</updated>`);

    lines.push(`    <id>${escapeXml(postUrl)}</id>`);

    // Content - use excerpt or full content
    if (excerpt) {
      lines.push(`    <content type="html">${escapeXml(excerpt)}</content>`);
    }

    // Author for this entry
    if (authorName) {
      lines.push('    <author>');
      lines.push(`      <name>${escapeXml(authorName)}</name>`);
      if (authorEmail) {
        lines.push(`      <email>${escapeXml(authorEmail)}</email>`);
      }
      if (authorUri) {
        lines.push(`      <uri>${escapeXml(authorUri)}</uri>`);
      }
      lines.push('    </author>');
    }

    // Categories
    for (const category of post.categories) {
      lines.push(`    <category term="${escapeXml(category)}"/>`);
    }

    // Summary/excerpt
    if (excerpt) {
      lines.push(`    <summary type="html">${escapeXml(excerpt)}</summary>`);
    }

    lines.push('  </entry>');
    return lines.join('\n');
  }
}

/**
 * Generate the feed_meta link tag for the HTML head
 * @see https://github.com/jekyll/jekyll-feed/blob/master/lib/jekyll-feed/meta-tag.rb
 */
function generateFeedMetaTag(site: Site): string {
  const config = site.config;
  const { feedUrl } = getFeedUrlInfo(site);
  const title = config.title || config.name || '';

  // Build the link tag attributes
  const attributes: string[] = [
    'type="application/atom+xml"',
    'rel="alternate"',
    `href="${escapeXml(feedUrl)}"`,
  ];

  // Add title attribute if available
  if (title) {
    attributes.push(`title="${escapeXml(title)}"`);
  }

  return `<link ${attributes.join(' ')} />`;
}

/**
 * Escape XML special characters
 */
function escapeXml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
