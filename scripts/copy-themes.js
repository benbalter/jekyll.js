#!/usr/bin/env node
/**
 * Script to copy theme files from src/themes to dist/themes
 * This is necessary because theme files (HTML, SCSS, etc.) are not
 * compiled by TypeScript and need to be copied separately.
 */

const fs = require('fs');
const path = require('path');

/**
 * Recursively copy a directory
 * @param {string} src - Source directory path
 * @param {string} dest - Destination directory path
 */
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

const srcThemes = path.join(__dirname, '..', 'src', 'themes');
const destThemes = path.join(__dirname, '..', 'dist', 'themes');

// Check if source themes directory exists
if (fs.existsSync(srcThemes)) {
  console.log(`Copying themes from ${srcThemes} to ${destThemes}`);
  try {
    copyDir(srcThemes, destThemes);
    console.log('Themes copied successfully.');
  } catch (error) {
    console.error('Failed to copy themes:', error.message);
    process.exit(1);
  }
} else {
  console.log('No themes directory found, skipping copy.');
}
