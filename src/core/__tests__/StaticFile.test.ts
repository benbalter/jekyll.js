import { StaticFile } from '../StaticFile';
import { mkdirSync, writeFileSync, rmSync, utimesSync } from 'fs';
import { join } from 'path';

describe('StaticFile', () => {
  const testDir = join(__dirname, '../../../../tmp/test-static-file');
  const sourcePath = testDir;

  beforeEach(() => {
    // Clean up and create fresh test directory
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch (error) {
      // Directory may not exist, which is fine
    }
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch (error) {
      // Directory may not exist, which is fine
    }
  });

  describe('constructor', () => {
    it('should create a StaticFile instance with correct properties', () => {
      const filePath = join(testDir, 'image.png');
      writeFileSync(filePath, 'fake-image-data');

      const staticFile = new StaticFile(filePath, sourcePath);

      expect(staticFile.path).toBe(filePath);
      expect(staticFile.relativePath).toBe('image.png');
      expect(staticFile.name).toBe('image.png');
      expect(staticFile.basename).toBe('image');
      expect(staticFile.extname).toBe('.png');
      expect(staticFile.modified_time).toBeDefined();
      expect(staticFile.modified_time.getTime()).toBeGreaterThan(0);
      expect(staticFile.size).toBeGreaterThan(0);
    });

    it('should handle nested files', () => {
      const nestedDir = join(testDir, 'assets/images');
      mkdirSync(nestedDir, { recursive: true });
      const filePath = join(nestedDir, 'logo.png');
      writeFileSync(filePath, 'fake-image-data');

      const staticFile = new StaticFile(filePath, sourcePath);

      expect(staticFile.relativePath).toBe('assets/images/logo.png');
      expect(staticFile.name).toBe('logo.png');
      expect(staticFile.basename).toBe('logo');
      expect(staticFile.directory).toBe('assets/images');
    });

    it('should handle files in root directory', () => {
      const filePath = join(testDir, 'favicon.ico');
      writeFileSync(filePath, 'fake-icon-data');

      const staticFile = new StaticFile(filePath, sourcePath);

      expect(staticFile.directory).toBe('');
    });

    it('should throw error for non-existent file', () => {
      const filePath = join(testDir, 'non-existent.png');

      expect(() => new StaticFile(filePath, sourcePath)).toThrow();
    });
  });

  describe('url property', () => {
    it('should return url with leading slash', () => {
      const filePath = join(testDir, 'style.css');
      writeFileSync(filePath, 'body { margin: 0; }');

      const staticFile = new StaticFile(filePath, sourcePath);

      expect(staticFile.url).toBe('/style.css');
    });

    it('should use forward slashes in URL path', () => {
      const nestedDir = join(testDir, 'assets/css');
      mkdirSync(nestedDir, { recursive: true });
      const filePath = join(nestedDir, 'main.css');
      writeFileSync(filePath, 'body { margin: 0; }');

      const staticFile = new StaticFile(filePath, sourcePath);

      expect(staticFile.url).toBe('/assets/css/main.css');
    });
  });

  describe('destinationRelativePath property', () => {
    it('should return the same as relativePath', () => {
      const filePath = join(testDir, 'script.js');
      writeFileSync(filePath, 'console.log("hello");');

      const staticFile = new StaticFile(filePath, sourcePath);

      expect(staticFile.destinationRelativePath).toBe(staticFile.relativePath);
    });
  });

  describe('toJSON', () => {
    it('should return JSON representation', () => {
      const filePath = join(testDir, 'document.pdf');
      writeFileSync(filePath, 'fake-pdf-data');

      const staticFile = new StaticFile(filePath, sourcePath);
      const json = staticFile.toJSON();

      expect(json.path).toBe('/document.pdf');
      expect(json.name).toBe('document.pdf');
      expect(json.basename).toBe('document');
      expect(json.extname).toBe('.pdf');
      expect(typeof json.modified_time).toBe('string');
      expect(json.collection).toBeUndefined();
    });

    it('should include collection if specified', () => {
      const filePath = join(testDir, 'gallery-photo.jpg');
      writeFileSync(filePath, 'fake-image-data');

      const staticFile = new StaticFile(filePath, sourcePath, 'gallery');
      const json = staticFile.toJSON();

      expect(json.collection).toBe('gallery');
    });
  });

  describe('file types', () => {
    it('should handle images', () => {
      const filePath = join(testDir, 'photo.jpg');
      writeFileSync(filePath, 'fake-jpg-data');

      const staticFile = new StaticFile(filePath, sourcePath);

      expect(staticFile.extname).toBe('.jpg');
    });

    it('should handle fonts', () => {
      const filePath = join(testDir, 'font.woff2');
      writeFileSync(filePath, 'fake-font-data');

      const staticFile = new StaticFile(filePath, sourcePath);

      expect(staticFile.extname).toBe('.woff2');
    });

    it('should handle CSS files', () => {
      const filePath = join(testDir, 'styles.css');
      writeFileSync(filePath, 'body { color: red; }');

      const staticFile = new StaticFile(filePath, sourcePath);

      expect(staticFile.extname).toBe('.css');
    });

    it('should handle JavaScript files', () => {
      const filePath = join(testDir, 'app.js');
      writeFileSync(filePath, 'console.log("hello");');

      const staticFile = new StaticFile(filePath, sourcePath);

      expect(staticFile.extname).toBe('.js');
    });

    it('should handle binary files', () => {
      const filePath = join(testDir, 'data.bin');
      // Write actual binary data
      const binaryData = Buffer.from([0x00, 0x01, 0x02, 0x03, 0xFF, 0xFE]);
      writeFileSync(filePath, binaryData);

      const staticFile = new StaticFile(filePath, sourcePath);

      expect(staticFile.size).toBe(6);
      expect(staticFile.extname).toBe('.bin');
    });
  });

  describe('modification time', () => {
    it('should capture correct modification time', () => {
      const filePath = join(testDir, 'test.txt');
      writeFileSync(filePath, 'test content');

      // Set a specific modification time
      const specificTime = new Date('2024-01-15T10:30:00Z');
      utimesSync(filePath, specificTime, specificTime);

      const staticFile = new StaticFile(filePath, sourcePath);

      expect(staticFile.modified_time.getTime()).toBe(specificTime.getTime());
    });
  });
});
