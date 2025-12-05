/**
 * Feed Plugin for Jekyll.js
 *
 * Implements jekyll-feed functionality
 * Generates an Atom feed (feed.xml) for blog posts
 * Uses the 'feed' npm package for feed generation
 *
 * @see https://github.com/jekyll/jekyll-feed
 * @see https://github.com/jpmonette/feed
 */

import { Feed } from 'feed';
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
   * Generate the Atom feed XML content using the feed library
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

    // Create Feed using the feed library
    const feed = new Feed({
      title: title,
      description: description || undefined,
      id: `${siteUrl}/`,
      link: `${siteUrl}/`,
      updated: new Date(updated),
      generator: 'Jekyll.js',
      copyright: '', // Empty string as copyright is optional for Jekyll-style feeds
      feedLinks: {
        atom: feedUrl,
      },
      author: authorName
        ? {
            name: authorName,
            email: authorEmail || undefined,
            link: authorUri || undefined,
          }
        : undefined,
    });

    // Add entries for each post
    for (const post of feedPosts) {
      this.addFeedEntry(feed, post, site, siteUrl);
    }

    // Generate Atom 1.0 feed
    return feed.atom1();
  }

  /**
   * Add a single feed entry for a post using the feed library
   */
  private addFeedEntry(feed: Feed, post: Document, site: Site, siteUrl: string): void {
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

    feed.addItem({
      title: postTitle,
      id: postUrl,
      link: postUrl,
      description: excerpt || undefined,
      content: excerpt || undefined,
      date: new Date(postDate),
      published: new Date(postDate),
      author: authorName
        ? [
            {
              name: authorName,
              email: authorEmail || undefined,
              link: authorUri || undefined,
            },
          ]
        : undefined,
      category: post.categories.map((cat) => ({ name: cat })),
    });

    // Note: The feed library doesn't have a direct 'updated' field per item in atom1()
    // but it handles the main feed's updated time based on items
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
