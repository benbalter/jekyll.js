/**
 * Tests for image optimization plugin
 */

import {
  optimizeImage,
  getImageMetadata,
  isSupportedImage,
  optimizeImageBatch,
  ImageOptimizationOptions,
} from '../image-optimization';
import { mkdirSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import sharp from 'sharp';

describe('ImageOptimization', () => {
  const testDir = join(__dirname, '../../../../../tmp/test-image-optimization');
  const inputDir = join(testDir, 'input');
  const outputDir = join(testDir, 'output');

  // Create a simple test image using sharp
  async function createTestImage(
    filepath: string,
    width: number = 100,
    height: number = 100,
    format: 'png' | 'jpeg' | 'webp' | 'gif' = 'png'
  ): Promise<void> {
    const image = sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 1 },
      },
    });

    switch (format) {
      case 'jpeg':
        await image.jpeg().toFile(filepath);
        break;
      case 'webp':
        await image.webp().toFile(filepath);
        break;
      case 'gif':
        await image.gif().toFile(filepath);
        break;
      default:
        await image.png().toFile(filepath);
    }
  }

  beforeEach(() => {
    // Clean up and create test directories
    rmSync(testDir, { recursive: true, force: true });
    mkdirSync(inputDir, { recursive: true });
    mkdirSync(outputDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directories
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('isSupportedImage', () => {
    it('should return true for supported image formats', () => {
      expect(isSupportedImage('image.jpg')).toBe(true);
      expect(isSupportedImage('image.jpeg')).toBe(true);
      expect(isSupportedImage('image.png')).toBe(true);
      expect(isSupportedImage('image.webp')).toBe(true);
      expect(isSupportedImage('image.avif')).toBe(true);
      expect(isSupportedImage('image.gif')).toBe(true);
      expect(isSupportedImage('image.tiff')).toBe(true);
      expect(isSupportedImage('image.tif')).toBe(true);
      expect(isSupportedImage('image.svg')).toBe(true);
    });

    it('should return true for uppercase extensions', () => {
      expect(isSupportedImage('IMAGE.JPG')).toBe(true);
      expect(isSupportedImage('IMAGE.PNG')).toBe(true);
      expect(isSupportedImage('IMAGE.WEBP')).toBe(true);
    });

    it('should return false for non-image formats', () => {
      expect(isSupportedImage('document.pdf')).toBe(false);
      expect(isSupportedImage('style.css')).toBe(false);
      expect(isSupportedImage('script.js')).toBe(false);
      expect(isSupportedImage('data.json')).toBe(false);
      expect(isSupportedImage('readme.txt')).toBe(false);
    });

    it('should return false for files without extension', () => {
      expect(isSupportedImage('noextension')).toBe(false);
    });
  });

  describe('getImageMetadata', () => {
    it('should return metadata for a PNG image', async () => {
      const inputPath = join(inputDir, 'test.png');
      await createTestImage(inputPath, 200, 150, 'png');

      const metadata = await getImageMetadata(inputPath);

      expect(metadata.format).toBe('png');
      expect(metadata.width).toBe(200);
      expect(metadata.height).toBe(150);
      expect(metadata.channels).toBe(4);
    });

    it('should return metadata for a JPEG image', async () => {
      const inputPath = join(inputDir, 'test.jpg');
      await createTestImage(inputPath, 300, 200, 'jpeg');

      const metadata = await getImageMetadata(inputPath);

      expect(metadata.format).toBe('jpeg');
      expect(metadata.width).toBe(300);
      expect(metadata.height).toBe(200);
    });

    it('should return metadata for a WebP image', async () => {
      const inputPath = join(inputDir, 'test.webp');
      await createTestImage(inputPath, 150, 150, 'webp');

      const metadata = await getImageMetadata(inputPath);

      expect(metadata.format).toBe('webp');
      expect(metadata.width).toBe(150);
      expect(metadata.height).toBe(150);
    });

    it('should throw an error for non-existent file', async () => {
      const nonExistentPath = join(inputDir, 'does-not-exist.png');

      await expect(getImageMetadata(nonExistentPath)).rejects.toThrow();
    });
  });

  describe('optimizeImage', () => {
    it('should optimize a PNG image', async () => {
      const inputPath = join(inputDir, 'test.png');
      const outputPath = join(outputDir, 'optimized.png');
      await createTestImage(inputPath, 200, 200, 'png');

      const result = await optimizeImage(inputPath, outputPath);

      expect(existsSync(outputPath)).toBe(true);
      expect(result.originalSize).toBeGreaterThan(0);
      expect(result.optimizedSize).toBeGreaterThan(0);
      expect(result.outputPath).toBe(outputPath);
      expect(typeof result.reduction).toBe('number');
    });

    it('should optimize a JPEG image', async () => {
      const inputPath = join(inputDir, 'test.jpg');
      const outputPath = join(outputDir, 'optimized.jpg');
      await createTestImage(inputPath, 200, 200, 'jpeg');

      const result = await optimizeImage(inputPath, outputPath);

      expect(existsSync(outputPath)).toBe(true);
      expect(result.outputPath).toBe(outputPath);
    });

    it('should resize image when dimensions are specified', async () => {
      const inputPath = join(inputDir, 'test.png');
      const outputPath = join(outputDir, 'resized.png');
      await createTestImage(inputPath, 400, 400, 'png');

      const options: ImageOptimizationOptions = {
        width: 200,
        height: 200,
      };

      await optimizeImage(inputPath, outputPath, options);

      const metadata = await getImageMetadata(outputPath);
      expect(metadata.width).toBeLessThanOrEqual(200);
      expect(metadata.height).toBeLessThanOrEqual(200);
    });

    it('should respect quality setting', async () => {
      const inputPath = join(inputDir, 'test.jpg');
      const outputHighQuality = join(outputDir, 'high-quality.jpg');
      const outputLowQuality = join(outputDir, 'low-quality.jpg');
      await createTestImage(inputPath, 200, 200, 'jpeg');

      await optimizeImage(inputPath, outputHighQuality, { quality: 100 });
      await optimizeImage(inputPath, outputLowQuality, { quality: 10 });

      const highQualitySize = readFileSync(outputHighQuality).length;
      const lowQualitySize = readFileSync(outputLowQuality).length;

      expect(highQualitySize).toBeGreaterThan(lowQualitySize);
    });

    it('should convert format when specified', async () => {
      const inputPath = join(inputDir, 'test.png');
      const outputPath = join(outputDir, 'converted.jpg');
      await createTestImage(inputPath, 100, 100, 'png');

      await optimizeImage(inputPath, outputPath, { format: 'jpeg' });

      const metadata = await getImageMetadata(outputPath);
      expect(metadata.format).toBe('jpeg');
    });

    it('should generate WebP version when requested', async () => {
      const inputPath = join(inputDir, 'test.png');
      const outputPath = join(outputDir, 'optimized.png');
      await createTestImage(inputPath, 100, 100, 'png');

      const result = await optimizeImage(inputPath, outputPath, {
        generateWebP: true,
      });

      const webpPath = join(outputDir, 'optimized.webp');
      expect(existsSync(webpPath)).toBe(true);
      expect(result.additionalFiles).toContain(webpPath);
    });

    it('should generate AVIF version when requested', async () => {
      const inputPath = join(inputDir, 'test.png');
      const outputPath = join(outputDir, 'optimized.png');
      await createTestImage(inputPath, 100, 100, 'png');

      const result = await optimizeImage(inputPath, outputPath, {
        generateAVIF: true,
      });

      const avifPath = join(outputDir, 'optimized.avif');
      expect(existsSync(avifPath)).toBe(true);
      expect(result.additionalFiles).toContain(avifPath);
    });

    it('should generate responsive sizes when requested', async () => {
      const inputPath = join(inputDir, 'test.png');
      const outputPath = join(outputDir, 'optimized.png');
      await createTestImage(inputPath, 400, 400, 'png');

      const result = await optimizeImage(inputPath, outputPath, {
        responsiveSizes: [200, 100],
      });

      const size200Path = join(outputDir, 'optimized-200w.png');
      const size100Path = join(outputDir, 'optimized-100w.png');

      expect(existsSync(size200Path)).toBe(true);
      expect(existsSync(size100Path)).toBe(true);
      expect(result.additionalFiles).toContain(size200Path);
      expect(result.additionalFiles).toContain(size100Path);
    });

    it('should create output directory if it does not exist', async () => {
      const inputPath = join(inputDir, 'test.png');
      const nestedOutputDir = join(outputDir, 'nested', 'deep');
      const outputPath = join(nestedOutputDir, 'optimized.png');
      await createTestImage(inputPath, 100, 100, 'png');

      await optimizeImage(inputPath, outputPath);

      expect(existsSync(outputPath)).toBe(true);
    });

    it('should handle fit option correctly', async () => {
      const inputPath = join(inputDir, 'test.png');
      const outputPath = join(outputDir, 'fitted.png');
      await createTestImage(inputPath, 400, 200, 'png');

      await optimizeImage(inputPath, outputPath, {
        width: 100,
        height: 100,
        fit: 'cover',
      });

      const metadata = await getImageMetadata(outputPath);
      expect(metadata.width).toBe(100);
      expect(metadata.height).toBe(100);
    });

    it('should throw error for non-existent input file', async () => {
      const inputPath = join(inputDir, 'does-not-exist.png');
      const outputPath = join(outputDir, 'output.png');

      await expect(optimizeImage(inputPath, outputPath)).rejects.toThrow();
    });
  });

  describe('optimizeImageBatch', () => {
    it('should optimize multiple images', async () => {
      // Create test images
      const images: Array<[string, string]> = [];
      for (let i = 1; i <= 3; i++) {
        const inputPath = join(inputDir, `test${i}.png`);
        const outputPath = join(outputDir, `optimized${i}.png`);
        await createTestImage(inputPath, 100, 100, 'png');
        images.push([inputPath, outputPath]);
      }

      const results = await optimizeImageBatch(images);

      expect(results.length).toBe(3);
      for (let i = 1; i <= 3; i++) {
        expect(existsSync(join(outputDir, `optimized${i}.png`))).toBe(true);
      }
    });

    it('should continue processing if one image fails', async () => {
      // Create test images
      const inputPath1 = join(inputDir, 'test1.png');
      const inputPath3 = join(inputDir, 'test3.png');
      await createTestImage(inputPath1, 100, 100, 'png');
      await createTestImage(inputPath3, 100, 100, 'png');

      const images: Array<[string, string]> = [
        [inputPath1, join(outputDir, 'optimized1.png')],
        [join(inputDir, 'nonexistent.png'), join(outputDir, 'optimized2.png')],
        [inputPath3, join(outputDir, 'optimized3.png')],
      ];

      const results = await optimizeImageBatch(images);

      // Should have results for the 2 successful images
      expect(results.length).toBe(2);
      expect(existsSync(join(outputDir, 'optimized1.png'))).toBe(true);
      expect(existsSync(join(outputDir, 'optimized3.png'))).toBe(true);
    });

    it('should apply options to all images in batch', async () => {
      const images: Array<[string, string]> = [];
      for (let i = 1; i <= 2; i++) {
        const inputPath = join(inputDir, `test${i}.png`);
        const outputPath = join(outputDir, `optimized${i}.png`);
        await createTestImage(inputPath, 300, 300, 'png');
        images.push([inputPath, outputPath]);
      }

      const results = await optimizeImageBatch(images, {
        width: 100,
        height: 100,
      });

      expect(results.length).toBe(2);
      for (const result of results) {
        const metadata = await getImageMetadata(result.outputPath);
        expect(metadata.width).toBeLessThanOrEqual(100);
        expect(metadata.height).toBeLessThanOrEqual(100);
      }
    });

    it('should return empty array for empty input', async () => {
      const results = await optimizeImageBatch([]);
      expect(results).toEqual([]);
    });
  });

  describe('format conversion', () => {
    it('should convert PNG to WebP', async () => {
      const inputPath = join(inputDir, 'test.png');
      const outputPath = join(outputDir, 'converted.webp');
      await createTestImage(inputPath, 100, 100, 'png');

      await optimizeImage(inputPath, outputPath, { format: 'webp' });

      const metadata = await getImageMetadata(outputPath);
      expect(metadata.format).toBe('webp');
    });

    it('should convert JPEG to PNG', async () => {
      const inputPath = join(inputDir, 'test.jpg');
      const outputPath = join(outputDir, 'converted.png');
      await createTestImage(inputPath, 100, 100, 'jpeg');

      await optimizeImage(inputPath, outputPath, { format: 'png' });

      const metadata = await getImageMetadata(outputPath);
      expect(metadata.format).toBe('png');
    });

    it('should convert to AVIF format', async () => {
      const inputPath = join(inputDir, 'test.png');
      const outputPath = join(outputDir, 'converted.avif');
      await createTestImage(inputPath, 100, 100, 'png');

      await optimizeImage(inputPath, outputPath, { format: 'avif' });

      const metadata = await getImageMetadata(outputPath);
      expect(metadata.format).toBe('heif');
    });

    it('should handle GIF format', async () => {
      const inputPath = join(inputDir, 'test.gif');
      const outputPath = join(outputDir, 'optimized.gif');
      await createTestImage(inputPath, 100, 100, 'gif');

      await optimizeImage(inputPath, outputPath, { format: 'gif' });

      const metadata = await getImageMetadata(outputPath);
      expect(metadata.format).toBe('gif');
    });
  });
});
