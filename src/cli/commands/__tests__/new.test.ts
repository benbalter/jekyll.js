import { newCommand } from '../new';
import { existsSync, rmSync } from 'fs';
import { join } from 'path';

describe('newCommand', () => {
  const testPath = join(__dirname, '../../../../tmp/test-new-site');

  beforeEach(() => {
    // Clean up test directory
    if (existsSync(testPath)) {
      rmSync(testPath, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(testPath)) {
      rmSync(testPath, { recursive: true, force: true });
    }
  });

  it('should create a new site with default structure', async () => {
    await newCommand(testPath, {});

    // Check that key directories were created
    expect(existsSync(testPath)).toBe(true);
    expect(existsSync(join(testPath, '_posts'))).toBe(true);
    expect(existsSync(join(testPath, '_drafts'))).toBe(true);
    expect(existsSync(join(testPath, '_layouts'))).toBe(true);
    expect(existsSync(join(testPath, '_includes'))).toBe(true);
    expect(existsSync(join(testPath, '_data'))).toBe(true);

    // Check that key files were created
    expect(existsSync(join(testPath, '_config.yml'))).toBe(true);
    expect(existsSync(join(testPath, 'index.md'))).toBe(true);
    expect(existsSync(join(testPath, '_layouts', 'default.html'))).toBe(true);
    expect(existsSync(join(testPath, '.gitignore'))).toBe(true);
  });

  it('should create a blank site when --blank flag is used', async () => {
    await newCommand(testPath, { blank: true });

    // Check that site was created
    expect(existsSync(testPath)).toBe(true);
    expect(existsSync(join(testPath, '_config.yml'))).toBe(true);

    // Blank site should not have full directory structure
    expect(existsSync(join(testPath, '_posts'))).toBe(false);
    expect(existsSync(join(testPath, 'index.md'))).toBe(false);
  });

  it('should throw error if path exists without --force flag', async () => {
    // Create the directory first
    await newCommand(testPath, {});

    // Try to create again without force
    await expect(newCommand(testPath, {})).rejects.toThrow(
      /already exists/
    );
  });

  it('should succeed if path exists with --force flag', async () => {
    // Create the directory first
    await newCommand(testPath, {});

    // Should not throw with force flag
    await expect(newCommand(testPath, { force: true })).resolves.not.toThrow();
  });
});
