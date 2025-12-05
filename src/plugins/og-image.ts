/**
 * OG Image Plugin for Jekyll.js
 *
 * Automatically generates Open Graph images for posts.
 * Port of jekyll-og-image Ruby plugin.
 *
 * @see https://github.com/benbalter/jekyll-og-image
 */

import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import sharp from 'sharp';
import striptags from 'striptags';
import { Plugin, GeneratorPlugin, GeneratorResult, GeneratorPriority } from './types';
import { Renderer } from '../core/Renderer';
import { Site } from '../core/Site';
import { Document } from '../core/Document';
import { logger } from '../utils/logger';

/**
 * Canvas configuration options
 */
export interface CanvasConfig {
  background_color?: string;
  background_image?: string;
}

/**
 * Header/title text configuration
 */
export interface HeaderConfig {
  font_family?: string;
  color?: string;
}

/**
 * Content/description text configuration
 */
export interface ContentConfig {
  font_family?: string;
  color?: string;
}

/**
 * Border configuration
 */
export interface BorderConfig {
  width?: number;
  fill?: string | string[];
}

/**
 * OG Image plugin configuration
 */
export interface OgImageConfig {
  /** Output directory for generated images */
  output_dir?: string;
  /** Force regeneration even if image exists */
  force?: boolean;
  /** Enable verbose logging */
  verbose?: boolean;
  /** Skip draft posts */
  skip_drafts?: boolean;
  /** Canvas configuration */
  canvas?: CanvasConfig;
  /** Header text configuration */
  header?: HeaderConfig;
  /** Content text configuration */
  content?: ContentConfig;
  /** Border configuration */
  border_bottom?: BorderConfig;
  /** Domain name to display */
  domain?: string;
  /** Path to logo image */
  image?: string;
}

/**
 * Resolved OG Image configuration with defaults applied
 * All nested objects are guaranteed to exist, but domain/image/background_image may be undefined
 */
interface ResolvedOgImageConfig {
  output_dir: string;
  force: boolean;
  verbose: boolean;
  skip_drafts: boolean;
  canvas: {
    background_color: string;
    background_image?: string;
  };
  header: {
    font_family: string;
    color: string;
  };
  content: {
    font_family: string;
    color: string;
  };
  border_bottom: {
    width: number;
    fill: string | string[];
  };
  domain?: string;
  image?: string;
}

// Default configuration values
const DEFAULT_CANVAS = {
  background_color: '#FFFFFF',
  background_image: undefined as string | undefined,
};

const DEFAULT_HEADER = {
  font_family: 'sans-serif',
  color: '#2f313d',
};

const DEFAULT_CONTENT = {
  font_family: 'sans-serif',
  color: '#535358',
};

const DEFAULT_BORDER = {
  width: 0,
  fill: '#000000' as string | string[],
};

// Image dimensions (following Ruby plugin convention)
const IMAGE_WIDTH = 1200;
const IMAGE_HEIGHT = 600;

/**
 * OG Image Plugin implementation
 * Generates Open Graph images for posts automatically
 */
export class OgImagePlugin implements Plugin, GeneratorPlugin {
  name = 'jekyll-og-image';
  priority = GeneratorPriority.HIGH; // Run early so SEO tags can use generated images

  register(_renderer: Renderer, site: Site): void {
    // Store a reference for backward compatibility
    (site as any)._ogImagePlugin = this;
  }

  /**
   * Generator interface - generates OG images for all posts
   */
  async generate(site: Site, _renderer: Renderer): Promise<GeneratorResult> {
    const globalConfig = this.getConfig(site);
    const basePath = join(globalConfig.output_dir, 'posts');
    const absoluteBasePath = join(site.source, basePath);

    // Ensure output directory exists
    if (!existsSync(absoluteBasePath)) {
      mkdirSync(absoluteBasePath, { recursive: true });
    }

    // Process each post
    for (const post of site.posts) {
      // Skip drafts if configured
      if (!post.published && globalConfig.skip_drafts) {
        continue;
      }

      // Merge post-level og_image config with global config
      const postConfig = this.mergePostConfig(globalConfig, post.data.og_image);
      const slug = this.getSlug(post);
      const imagePath = join(basePath, `${slug}.png`);
      const absoluteImagePath = join(site.source, imagePath);

      // Check if image already exists
      if (existsSync(absoluteImagePath) && !postConfig.force) {
        if (postConfig.verbose) {
          logger.info(`OG Image: Skipping ${imagePath} (already exists)`);
        }
      } else {
        if (postConfig.verbose) {
          logger.info(`OG Image: Generating ${imagePath}`);
        }
        await this.generateImageForPost(site, post, absoluteImagePath, postConfig);
      }

      // Set image metadata on post (if not already set)
      if (!post.data.image) {
        const description = this.getDescription(post);
        post.data.image = {
          path: imagePath,
          width: IMAGE_WIDTH,
          height: IMAGE_HEIGHT,
          alt: `${post.title}: ${description}`,
        };
      }
    }

    // No files returned - images are written directly to source directory
    return {};
  }

  /**
   * Get configuration from site config
   */
  private getConfig(site: Site): ResolvedOgImageConfig {
    const siteConfig = site.config.og_image || {};
    return this.mergeConfig(siteConfig);
  }

  /**
   * Merge configuration with defaults
   */
  private mergeConfig(override: Partial<OgImageConfig>): ResolvedOgImageConfig {
    return {
      output_dir: override.output_dir ?? 'assets/images/og',
      force: override.force ?? false,
      verbose: override.verbose ?? false,
      skip_drafts: override.skip_drafts ?? true,
      canvas: {
        background_color: override.canvas?.background_color ?? DEFAULT_CANVAS.background_color,
        background_image: override.canvas?.background_image ?? DEFAULT_CANVAS.background_image,
      },
      header: {
        font_family: override.header?.font_family ?? DEFAULT_HEADER.font_family,
        color: override.header?.color ?? DEFAULT_HEADER.color,
      },
      content: {
        font_family: override.content?.font_family ?? DEFAULT_CONTENT.font_family,
        color: override.content?.color ?? DEFAULT_CONTENT.color,
      },
      border_bottom: {
        width: override.border_bottom?.width ?? DEFAULT_BORDER.width,
        fill: override.border_bottom?.fill ?? DEFAULT_BORDER.fill,
      },
      domain: override.domain,
      image: override.image,
    };
  }

  /**
   * Merge post-level config with site-level config
   */
  private mergePostConfig(
    base: ResolvedOgImageConfig,
    postOverride: Partial<OgImageConfig> | undefined
  ): ResolvedOgImageConfig {
    if (!postOverride) return base;
    return {
      output_dir: postOverride.output_dir ?? base.output_dir,
      force: postOverride.force ?? base.force,
      verbose: postOverride.verbose ?? base.verbose,
      skip_drafts: postOverride.skip_drafts ?? base.skip_drafts,
      canvas: {
        background_color: postOverride.canvas?.background_color ?? base.canvas.background_color,
        background_image: postOverride.canvas?.background_image ?? base.canvas.background_image,
      },
      header: {
        font_family: postOverride.header?.font_family ?? base.header.font_family,
        color: postOverride.header?.color ?? base.header.color,
      },
      content: {
        font_family: postOverride.content?.font_family ?? base.content.font_family,
        color: postOverride.content?.color ?? base.content.color,
      },
      border_bottom: {
        width: postOverride.border_bottom?.width ?? base.border_bottom.width,
        fill: postOverride.border_bottom?.fill ?? base.border_bottom.fill,
      },
      domain: postOverride.domain ?? base.domain,
      image: postOverride.image ?? base.image,
    };
  }

  /**
   * Generate an OG image for a single post
   */
  private async generateImageForPost(
    site: Site,
    post: Document,
    outputPath: string,
    config: ResolvedOgImageConfig
  ): Promise<void> {
    // Ensure output directory exists
    const outputDir = dirname(outputPath);
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    // Create canvas with background
    let canvas = await this.createCanvas(site, config);

    // Add border if configured
    if (config.border_bottom.width && config.border_bottom.width > 0) {
      canvas = await this.addBorder(canvas, config);
    }

    // Add logo image if configured
    if (config.image) {
      canvas = await this.addLogoImage(site, canvas, config);
    }

    // Add title text
    canvas = await this.addTitle(canvas, post.title, config);

    // Add description if available
    const description = this.getDescription(post);
    if (description) {
      canvas = await this.addDescription(canvas, description, config);
    }

    // Add domain if configured
    if (config.domain) {
      canvas = await this.addDomain(canvas, config);
    }

    // Write output
    await canvas.toFile(outputPath);
  }

  /**
   * Create the base canvas with background color or image
   */
  private async createCanvas(site: Site, config: ResolvedOgImageConfig): Promise<sharp.Sharp> {
    const bgColor = config.canvas.background_color || '#FFFFFF';

    if (config.canvas.background_image) {
      // Use background image
      const bgImagePath = join(site.source, config.canvas.background_image);
      if (existsSync(bgImagePath)) {
        const bgImage = sharp(bgImagePath);
        const metadata = await bgImage.metadata();

        // Calculate resize dimensions to cover the canvas
        const widthRatio = IMAGE_WIDTH / (metadata.width || IMAGE_WIDTH);
        const heightRatio = IMAGE_HEIGHT / (metadata.height || IMAGE_HEIGHT);
        const ratio = Math.max(widthRatio, heightRatio);

        return bgImage
          .resize(
            Math.ceil((metadata.width || IMAGE_WIDTH) * ratio),
            Math.ceil((metadata.height || IMAGE_HEIGHT) * ratio)
          )
          .extract({ left: 0, top: 0, width: IMAGE_WIDTH, height: IMAGE_HEIGHT });
      }
    }

    // Solid color background
    const rgb = this.hexToRgb(bgColor);
    return sharp({
      create: {
        width: IMAGE_WIDTH,
        height: IMAGE_HEIGHT,
        channels: 3,
        background: { r: rgb.r, g: rgb.g, b: rgb.b },
      },
    });
  }

  /**
   * Add border at the bottom of the image
   */
  private async addBorder(
    canvas: sharp.Sharp,
    config: ResolvedOgImageConfig
  ): Promise<sharp.Sharp> {
    const borderWidth = config.border_bottom.width || 0;
    if (borderWidth <= 0) return canvas;

    const fills = Array.isArray(config.border_bottom.fill)
      ? config.border_bottom.fill
      : [config.border_bottom.fill || '#000000'];

    // Calculate stripe width for multi-color borders
    const stripeWidth = Math.ceil(IMAGE_WIDTH / fills.length);

    // Create border stripes SVG
    const stripes = fills
      .map((color, index) => {
        const x = index * stripeWidth;
        return `<rect x="${x}" y="0" width="${stripeWidth}" height="${borderWidth}" fill="${color}" />`;
      })
      .join('');

    const borderSvg = Buffer.from(`
      <svg width="${IMAGE_WIDTH}" height="${borderWidth}">
        ${stripes}
      </svg>
    `);

    const borderImage = await sharp(borderSvg).png().toBuffer();

    // Composite border onto canvas
    const canvasBuffer = await canvas.png().toBuffer();
    return sharp(canvasBuffer).composite([
      {
        input: borderImage,
        top: IMAGE_HEIGHT - borderWidth,
        left: 0,
      },
    ]);
  }

  /**
   * Add logo image to the canvas
   */
  private async addLogoImage(
    site: Site,
    canvas: sharp.Sharp,
    config: ResolvedOgImageConfig
  ): Promise<sharp.Sharp> {
    if (!config.image) return canvas;

    const imagePath = join(site.source, config.image);
    if (!existsSync(imagePath)) {
      logger.warn(`OG Image: Logo image not found: ${config.image}`);
      return canvas;
    }

    const logoSize = 150;
    const padding = 80;
    const borderRadius = 50;

    // Load and resize logo
    const logo = sharp(imagePath);
    const resizedLogo = await logo.resize(logoSize, logoSize, { fit: 'cover' }).png().toBuffer();

    // Create rounded corner mask
    const roundedMask = Buffer.from(`
      <svg width="${logoSize}" height="${logoSize}">
        <rect x="0" y="0" width="${logoSize}" height="${logoSize}" rx="${borderRadius}" ry="${borderRadius}" fill="white"/>
      </svg>
    `);

    // Apply rounded corners
    const maskedLogo = await sharp(resizedLogo)
      .composite([
        {
          input: await sharp(roundedMask).png().toBuffer(),
          blend: 'dest-in',
        },
      ])
      .png()
      .toBuffer();

    // Composite logo onto canvas (top-right position)
    const canvasBuffer = await canvas.png().toBuffer();
    return sharp(canvasBuffer).composite([
      {
        input: maskedLogo,
        top: padding + 20,
        left: IMAGE_WIDTH - logoSize - padding,
      },
    ]);
  }

  /**
   * Add title text to the canvas
   */
  private async addTitle(
    canvas: sharp.Sharp,
    title: string,
    config: ResolvedOgImageConfig
  ): Promise<sharp.Sharp> {
    const padding = 80;
    const maxWidth = config.image ? 870 : 1040;
    const fontSize = 48;
    const color = config.header.color || '#2f313d';

    // Wrap text to fit within maxWidth
    const lines = this.wrapText(title, maxWidth, fontSize);
    const lineHeight = Math.round(fontSize * 1.3);
    const textHeight = lines.length * lineHeight;

    // Create SVG with text
    const textLines = lines
      .map((line, index) => {
        const y = fontSize + index * lineHeight;
        return `<text x="0" y="${y}" font-size="${fontSize}" font-weight="bold" fill="${color}" font-family="sans-serif">${this.escapeXml(line)}</text>`;
      })
      .join('');

    const textSvg = Buffer.from(`
      <svg width="${maxWidth}" height="${Math.round(textHeight + fontSize)}">
        ${textLines}
      </svg>
    `);

    const textImage = await sharp(textSvg).png().toBuffer();

    // Composite text onto canvas
    const canvasBuffer = await canvas.png().toBuffer();
    return sharp(canvasBuffer).composite([
      {
        input: textImage,
        top: padding,
        left: padding,
      },
    ]);
  }

  /**
   * Add description text to the canvas
   */
  private async addDescription(
    canvas: sharp.Sharp,
    description: string,
    config: ResolvedOgImageConfig
  ): Promise<sharp.Sharp> {
    const padding = 80;
    const maxWidth = config.domain ? 850 : 1040;
    const fontSize = 24;
    const color = config.content.color || '#535358';
    const marginBottom = this.getMarginBottom(config);

    // Wrap text
    const lines = this.wrapText(description, maxWidth, fontSize);
    // Limit to 3 lines
    const displayLines = lines.slice(0, 3);
    if (lines.length > 3 && displayLines[2]) {
      // Safely truncate the third line and add ellipsis
      const lastLine = displayLines[2];
      displayLines[2] = lastLine.length > 3 ? lastLine.slice(0, -3) + '...' : '...';
    }

    const lineHeight = Math.round(fontSize * 1.4);
    const textHeight = displayLines.length * lineHeight;

    // Create SVG with text
    const textLines = displayLines
      .map((line, index) => {
        const y = fontSize + index * lineHeight;
        return `<text x="0" y="${y}" font-size="${fontSize}" fill="${color}" font-family="sans-serif">${this.escapeXml(line)}</text>`;
      })
      .join('');

    const textSvg = Buffer.from(`
      <svg width="${maxWidth}" height="${Math.round(textHeight + fontSize)}">
        ${textLines}
      </svg>
    `);

    const textImage = await sharp(textSvg).png().toBuffer();

    // Position at bottom left
    const top = Math.round(IMAGE_HEIGHT - marginBottom - textHeight - fontSize);

    // Composite text onto canvas
    const canvasBuffer = await canvas.png().toBuffer();
    return sharp(canvasBuffer).composite([
      {
        input: textImage,
        top: Math.max(padding, top),
        left: padding,
      },
    ]);
  }

  /**
   * Add domain text to the canvas
   */
  private async addDomain(
    canvas: sharp.Sharp,
    config: ResolvedOgImageConfig
  ): Promise<sharp.Sharp> {
    if (!config.domain) return canvas;

    const padding = 80;
    const fontSize = 20;
    const color = config.content.color || '#535358';
    const marginBottom = this.getMarginBottom(config);

    // Create SVG with text
    const textSvg = Buffer.from(`
      <svg width="400" height="${fontSize * 2}">
        <text x="0" y="${fontSize}" font-size="${fontSize}" fill="${color}" font-family="sans-serif" text-anchor="end">${this.escapeXml(config.domain)}</text>
      </svg>
    `);

    const textImage = await sharp(textSvg).png().toBuffer();
    const textMetadata = await sharp(textImage).metadata();

    // Position at bottom right
    const top = Math.round(IMAGE_HEIGHT - marginBottom - fontSize * 2);

    // Composite text onto canvas
    const canvasBuffer = await canvas.png().toBuffer();
    return sharp(canvasBuffer).composite([
      {
        input: textImage,
        top: Math.max(padding, top),
        left: Math.round(IMAGE_WIDTH - padding - (textMetadata.width || 400)),
      },
    ]);
  }

  /**
   * Get bottom margin accounting for border
   */
  private getMarginBottom(config: ResolvedOgImageConfig): number {
    return 80 + (config.border_bottom.width || 0);
  }

  /**
   * Get slug from post
   * Uses post.data.slug if available, otherwise extracts from basename
   * by removing the date prefix (YYYY-MM-DD-)
   */
  private getSlug(post: Document): string {
    if (post.data.slug) {
      return post.data.slug;
    }
    // Remove date prefix from basename (YYYY-MM-DD-)
    const match = post.basename.match(/^\d{4}-\d{2}-\d{2}-(.+)$/);
    if (match && match[1]) {
      return match[1];
    }
    return post.basename;
  }

  /**
   * Get description from post, stripping HTML
   */
  private getDescription(post: Document): string {
    const desc = post.data.description || post.data.excerpt || '';
    return striptags(String(desc)).trim().substring(0, 200);
  }

  /**
   * Simple text wrapping based on character count
   * This is a simplified version - in production you'd want proper text measurement
   */
  private wrapText(text: string, maxWidth: number, fontSize: number): string[] {
    // Approximate characters per line based on font size and width
    // Average character width is roughly 0.5 * fontSize for most fonts
    const charsPerLine = Math.floor(maxWidth / (fontSize * 0.5));
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (testLine.length > charsPerLine && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  /**
   * Convert hex color to RGB object
   */
  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result && result[1] && result[2] && result[3]) {
      return {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      };
    }
    return { r: 255, g: 255, b: 255 };
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(str: string): string {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
