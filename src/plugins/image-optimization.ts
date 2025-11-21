/**
 * Modern image optimization using Sharp
 * 
 * Sharp is a high-performance Node.js image processing library.
 * It provides fast, efficient image manipulation and optimization.
 * 
 * Features:
 * - Resize, crop, and transform images
 * - Convert between formats (JPEG, PNG, WebP, AVIF)
 * - Optimize file sizes
 * - Generate responsive images
 * - Extract metadata
 * 
 * @see https://sharp.pixelplumbing.com/
 */

import sharp, { Sharp, ResizeOptions } from 'sharp';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { dirname, basename, extname, join } from 'path';
import { existsSync } from 'fs';
import { logger } from '../utils/logger';

/**
 * Supported image formats for optimization
 */
export type ImageFormat = 'jpeg' | 'png' | 'webp' | 'avif' | 'gif' | 'tiff';

/**
 * Image optimization options
 */
export interface ImageOptimizationOptions {
  /** Target format (default: keep original) */
  format?: ImageFormat;
  
  /** Quality (1-100, default: 80) */
  quality?: number;
  
  /** Width in pixels */
  width?: number;
  
  /** Height in pixels */
  height?: number;
  
  /** Fit mode (default: 'inside') */
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  
  /** Enable progressive/interlaced output */
  progressive?: boolean;
  
  /** Strip metadata (default: true) */
  stripMetadata?: boolean;
  
  /** Generate WebP version alongside original */
  generateWebP?: boolean;
  
  /** Generate AVIF version alongside original */
  generateAVIF?: boolean;
  
  /** Generate responsive sizes */
  responsiveSizes?: number[];
}

/**
 * Image metadata information
 */
export interface ImageMetadata {
  format?: string;
  width?: number;
  height?: number;
  space?: string;
  channels?: number;
  depth?: string;
  density?: number;
  hasAlpha?: boolean;
  orientation?: number;
  size: number;
}

/**
 * Result of image optimization
 */
export interface OptimizationResult {
  /** Original file size in bytes */
  originalSize: number;
  
  /** Optimized file size in bytes */
  optimizedSize: number;
  
  /** Size reduction percentage */
  reduction: number;
  
  /** Output file path */
  outputPath: string;
  
  /** Additional generated files (WebP, AVIF, responsive sizes) */
  additionalFiles?: string[];
}

/**
 * Optimize an image file
 * 
 * @param inputPath Path to input image
 * @param outputPath Path to output image
 * @param options Optimization options
 * @returns Optimization result with size statistics
 * 
 * @example
 * ```typescript
 * const result = await optimizeImage('input.jpg', 'output.jpg', {
 *   quality: 80,
 *   width: 1200,
 *   generateWebP: true
 * });
 * console.log(`Reduced size by ${result.reduction}%`);
 * ```
 */
export async function optimizeImage(
  inputPath: string,
  outputPath: string,
  options: ImageOptimizationOptions = {}
): Promise<OptimizationResult> {
  try {
    logger.debug(`Optimizing image: ${inputPath}`);
    
    // Read input file
    const inputBuffer = await readFile(inputPath);
    const originalSize = inputBuffer.length;
    
    // Create sharp instance
    let image: Sharp = sharp(inputBuffer);
    
    // Strip metadata if requested
    if (options.stripMetadata !== false) {
      image = image.rotate(); // Auto-rotate based on EXIF, then strip
    }
    
    // Resize if dimensions specified
    if (options.width || options.height) {
      const resizeOptions: ResizeOptions = {
        width: options.width,
        height: options.height,
        fit: options.fit || 'inside',
        withoutEnlargement: true, // Don't upscale
      };
      image = image.resize(resizeOptions);
    }
    
    // Convert format if specified
    const targetFormat = options.format || getFormatFromPath(inputPath);
    const quality = options.quality || 80;
    
    switch (targetFormat) {
      case 'jpeg':
        image = image.jpeg({ quality, progressive: options.progressive !== false });
        break;
      case 'png':
        image = image.png({ quality, progressive: options.progressive !== false });
        break;
      case 'webp':
        image = image.webp({ quality });
        break;
      case 'avif':
        image = image.avif({ quality });
        break;
      case 'gif':
        image = image.gif();
        break;
      case 'tiff':
        image = image.tiff({ quality });
        break;
    }
    
    // Ensure output directory exists
    const outputDir = dirname(outputPath);
    if (!existsSync(outputDir)) {
      await mkdir(outputDir, { recursive: true });
    }
    
    // Write optimized image
    const outputBuffer = await image.toBuffer();
    await writeFile(outputPath, outputBuffer);
    
    const optimizedSize = outputBuffer.length;
    const reduction = ((originalSize - optimizedSize) / originalSize) * 100;
    
    const additionalFiles: string[] = [];
    
    // Generate WebP version if requested
    if (options.generateWebP && targetFormat !== 'webp') {
      const webpPath = changeExtension(outputPath, '.webp');
      await sharp(inputBuffer)
        .resize(options.width, options.height, { fit: options.fit || 'inside' })
        .webp({ quality })
        .toFile(webpPath);
      additionalFiles.push(webpPath);
      logger.debug(`Generated WebP version: ${webpPath}`);
    }
    
    // Generate AVIF version if requested
    if (options.generateAVIF && targetFormat !== 'avif') {
      const avifPath = changeExtension(outputPath, '.avif');
      await sharp(inputBuffer)
        .resize(options.width, options.height, { fit: options.fit || 'inside' })
        .avif({ quality })
        .toFile(avifPath);
      additionalFiles.push(avifPath);
      logger.debug(`Generated AVIF version: ${avifPath}`);
    }
    
    // Generate responsive sizes if requested
    if (options.responsiveSizes && options.responsiveSizes.length > 0) {
      for (const width of options.responsiveSizes) {
        const responsivePath = addSizeToFilename(outputPath, width);
        await sharp(inputBuffer)
          .resize(width, undefined, { fit: 'inside', withoutEnlargement: true })
          .toFile(responsivePath);
        additionalFiles.push(responsivePath);
        logger.debug(`Generated responsive size ${width}px: ${responsivePath}`);
      }
    }
    
    logger.debug(`Image optimized: ${inputPath} → ${outputPath} (reduced by ${reduction.toFixed(1)}%)`);
    
    return {
      originalSize,
      optimizedSize,
      reduction,
      outputPath,
      additionalFiles: additionalFiles.length > 0 ? additionalFiles : undefined,
    };
  } catch (error) {
    logger.warn(`Failed to optimize image ${inputPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

/**
 * Get metadata from an image file
 * 
 * @param imagePath Path to image file
 * @returns Image metadata
 */
export async function getImageMetadata(imagePath: string): Promise<ImageMetadata> {
  try {
    const image = sharp(imagePath);
    const metadata = await image.metadata();
    
    // Get file size from metadata
    const size = metadata.size || 0;
    
    return {
      format: metadata.format,
      width: metadata.width,
      height: metadata.height,
      space: metadata.space,
      channels: metadata.channels,
      depth: metadata.depth,
      density: metadata.density,
      hasAlpha: metadata.hasAlpha,
      orientation: metadata.orientation,
      size: size,
    };
  } catch (error) {
    logger.warn(`Failed to read image metadata from ${imagePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

/**
 * Check if a file is an image that can be processed by Sharp
 * 
 * @param filePath Path to check
 * @returns true if the file is a supported image format
 */
export function isSupportedImage(filePath: string): boolean {
  const ext = extname(filePath).toLowerCase();
  return ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.tiff', '.tif', '.svg'].includes(ext);
}

/**
 * Get format from file path extension
 */
function getFormatFromPath(filePath: string): ImageFormat {
  const ext = extname(filePath).toLowerCase();
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'jpeg';
    case '.png':
      return 'png';
    case '.webp':
      return 'webp';
    case '.avif':
      return 'avif';
    case '.gif':
      return 'gif';
    case '.tiff':
    case '.tif':
      return 'tiff';
    default:
      return 'jpeg';
  }
}

/**
 * Change file extension
 */
function changeExtension(filePath: string, newExt: string): string {
  const dir = dirname(filePath);
  const base = basename(filePath, extname(filePath));
  return join(dir, base + newExt);
}

/**
 * Add size suffix to filename
 */
function addSizeToFilename(filePath: string, width: number): string {
  const dir = dirname(filePath);
  const ext = extname(filePath);
  const base = basename(filePath, ext);
  return join(dir, `${base}-${width}w${ext}`);
}

/**
 * Batch optimize multiple images
 * 
 * @param images Array of [inputPath, outputPath] pairs
 * @param options Optimization options
 * @returns Array of optimization results
 */
export async function optimizeImageBatch(
  images: Array<[string, string]>,
  options: ImageOptimizationOptions = {}
): Promise<OptimizationResult[]> {
  const results: OptimizationResult[] = [];
  
  for (const [inputPath, outputPath] of images) {
    try {
      const result = await optimizeImage(inputPath, outputPath, options);
      results.push(result);
    } catch (error) {
      logger.warn(`Failed to optimize ${inputPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  return results;
}
