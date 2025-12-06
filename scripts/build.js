#!/usr/bin/env node
/**
 * Build script using esbuild for bundling TypeScript
 * This replaces the previous tsc-only build process with a modern bundler
 */

const esbuild = require('esbuild');
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
      // Skip __tests__ directories
      if (entry.name === '__tests__') {
        continue;
      }
      copyDir(srcPath, destPath);
    } else {
      // Skip test files
      if (
        entry.name.endsWith('.test.ts') ||
        entry.name.endsWith('.test.js')
      ) {
        continue;
      }
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Copy theme files from src to dist
 */
function copyThemes() {
  const srcThemes = path.join(__dirname, '..', 'src', 'themes');
  const destThemes = path.join(__dirname, '..', 'dist', 'themes');

  if (fs.existsSync(srcThemes)) {
    console.log('📦 Copying themes...');
    try {
      copyDir(srcThemes, destThemes);
      console.log('✅ Themes copied successfully.');
    } catch (error) {
      console.error('❌ Failed to copy themes:', error.message);
      process.exit(1);
    }
  } else {
    console.log('ℹ️  No themes directory found, skipping copy.');
  }
}

/**
 * Common esbuild options
 */
const commonOptions = {
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  sourcemap: true,
  external: [
    // Native dependencies that need to stay external
    'sharp',
    'esbuild',
    'typescript',
    // Some modules are better left external for Node.js
    'chokidar',
    'ws',
  ],
  // Minify in production for smaller bundles
  minify: process.env.NODE_ENV === 'production',
  logLevel: 'info',
};

/**
 * Build the CLI entry point
 */
async function buildCLI() {
  console.log('🔨 Building CLI...');
  await esbuild.build({
    ...commonOptions,
    entryPoints: ['src/cli/index.ts'],
    outfile: 'dist/cli.js',
    // esbuild preserves shebangs from source files automatically
  });
  
  // Make CLI executable
  fs.chmodSync('dist/cli.js', 0o755);
  console.log('✅ CLI built successfully.');
}

/**
 * Build the library entry point
 */
async function buildLib() {
  console.log('🔨 Building library...');
  await esbuild.build({
    ...commonOptions,
    entryPoints: ['src/index.ts'],
    outfile: 'dist/index.js',
  });
  console.log('✅ Library built successfully.');
}

/**
 * Generate TypeScript declaration files
 */
async function generateDeclarations() {
  console.log('📝 Generating TypeScript declarations...');
  const { execSync } = require('child_process');
  
  try {
    // Use tsc only for generating declaration files
    execSync('tsc --emitDeclarationOnly', {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
    });
    console.log('✅ TypeScript declarations generated successfully.');
  } catch (error) {
    console.error('❌ Failed to generate declarations:', error.message);
    process.exit(1);
  }
}

/**
 * Clean dist directory
 */
function cleanDist() {
  const distPath = path.join(__dirname, '..', 'dist');
  if (fs.existsSync(distPath)) {
    console.log('🧹 Cleaning dist directory...');
    fs.rmSync(distPath, { recursive: true, force: true });
  }
  fs.mkdirSync(distPath, { recursive: true });
}

/**
 * Main build function
 */
async function build() {
  try {
    const isWatch = process.argv.includes('--watch');
    
    cleanDist();
    
    if (isWatch) {
      console.log('👀 Starting watch mode...\n');
      
      // Build with watch mode enabled
      const cliContext = await esbuild.context({
        ...commonOptions,
        entryPoints: ['src/cli/index.ts'],
        outfile: 'dist/cli.js',
      });
      
      const libContext = await esbuild.context({
        ...commonOptions,
        entryPoints: ['src/index.ts'],
        outfile: 'dist/index.js',
      });
      
      await Promise.all([cliContext.watch(), libContext.watch()]);
      
      // Copy themes once initially
      copyThemes();
      
      // Generate declarations once initially
      await generateDeclarations();
      
      console.log('\n✨ Watching for changes... (Press Ctrl+C to stop)\n');
      
      // Keep the process running indefinitely until interrupted
      process.stdin.resume();
    } else {
      // Build in parallel for speed
      await Promise.all([buildCLI(), buildLib()]);
      
      // Generate declarations after building
      await generateDeclarations();
      
      // Copy theme files
      copyThemes();
      
      console.log('\n✨ Build completed successfully!\n');
    }
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

// Run build
build();
