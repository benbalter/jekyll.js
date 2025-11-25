import { compileString, Exception, OutputStyle } from 'sass';
import { readFileSync, existsSync } from 'fs';
import { join, dirname, resolve, relative } from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger';
import { JekyllConfig } from '../config';
import { FileSystemError } from '../utils/errors';

/**
 * SASS/SCSS Processor configuration
 */
export interface SassProcessorOptions {
  /** Source directory */
  source: string;
  
  /** Site configuration */
  config: JekyllConfig;
}

/**
 * SASS/SCSS Processor for Jekyll sites
 * 
 * Handles compilation of .scss and .sass files with front matter.
 * Supports @import from _sass directory.
 */
export class SassProcessor {
  private source: string;
  private sassDir: string;
  private style: OutputStyle;
  private sourceComments: boolean;

  constructor(options: SassProcessorOptions) {
    this.source = options.source;
    
    // Get SASS configuration from site config
    const sassConfig = options.config.sass || {};
    this.sassDir = resolve(this.source, sassConfig.sass_dir || '_sass');
    
    /**
     * Map Jekyll-compatible style names to Dart Sass output styles.
     * 
     * Jekyll originally supported four styles from Ruby Sass: nested, expanded, compact, compressed.
     * Modern Dart Sass (used by this implementation) only supports two: 'expanded' and 'compressed'.
     * For compatibility with existing Jekyll configurations:
     * - 'nested' → 'expanded' (closest equivalent for readable output)
     * - 'compact' → 'compressed' (closest equivalent for minified output)
     */
    const styleMap: Record<string, OutputStyle> = {
      'nested': 'expanded',      // Dart Sass doesn't support nested, use expanded
      'expanded': 'expanded',
      'compact': 'compressed',   // Dart Sass doesn't support compact, use compressed
      'compressed': 'compressed',
    };
    this.style = styleMap[sassConfig.style as string] || 'expanded';
    this.sourceComments = sassConfig.source_comments === true;
  }

  /**
   * Check if a file has a SASS/SCSS extension
   * @param filePath Path to the file
   * @returns True if file is .scss or .sass
   */
  isSassFile(filePath: string): boolean {
    const ext = filePath.toLowerCase();
    return ext.endsWith('.scss') || ext.endsWith('.sass');
  }

  /**
   * Process a SASS/SCSS file and return the compiled CSS
   * @param filePath Path to the SASS/SCSS file
   * @param content Content of the file (with front matter already removed)
   * @returns Compiled CSS string
   */
  process(filePath: string, content: string): string {
    try {
      const isSass = filePath.toLowerCase().endsWith('.sass');
      
      // Compile the SASS/SCSS content
      const result = compileString(content, {
        syntax: isSass ? 'indented' : 'scss',
        style: this.style,
        sourceMap: this.sourceComments,
        loadPaths: [this.sassDir, dirname(filePath)],
        url: new URL(`file://${filePath}`),
        importer: {
          canonicalize: (url: string) => {
            // Handle sass partial imports (files starting with underscore)
            if (!url.startsWith('file://')) {
              // Try to find the file in load paths
              const paths = [this.sassDir, dirname(filePath)];
              
              for (const loadPath of paths) {
                // Try with underscore prefix first (partial)
                const partialPath = join(loadPath, `_${url}.scss`);
                if (existsSync(partialPath)) {
                  return new URL(`file://${partialPath}`);
                }
                
                const partialSassPath = join(loadPath, `_${url}.sass`);
                if (existsSync(partialSassPath)) {
                  return new URL(`file://${partialSassPath}`);
                }
                
                // Try without underscore
                const normalPath = join(loadPath, `${url}.scss`);
                if (existsSync(normalPath)) {
                  return new URL(`file://${normalPath}`);
                }
                
                const normalSassPath = join(loadPath, `${url}.sass`);
                if (existsSync(normalSassPath)) {
                  return new URL(`file://${normalSassPath}`);
                }
              }
            }
            
            return null;
          },
          load: (canonicalUrl: URL) => {
            // Convert URL pathname to file path, handling Windows paths correctly
            const filePath = fileURLToPath(canonicalUrl);
            try {
              const contents = readFileSync(filePath, 'utf-8');
              const syntax = filePath.endsWith('.sass') ? 'indented' : 'scss';
              return { contents, syntax };
            } catch (error) {
              throw new FileSystemError(`Failed to load SASS file: ${filePath}`, {
                file: filePath,
                cause: error instanceof Error ? error : undefined,
              });
            }
          },
        },
      });

      return result.css;
    } catch (error) {
      if (error && typeof error === 'object' && 'sassMessage' in error) {
        const sassError = error as Exception;
        logger.error(`SASS compilation error in ${relative(this.source, filePath)}:`, {
          message: sassError.sassMessage,
          line: sassError.span?.start.line,
          column: sassError.span?.start.column,
        });
      }
      
      throw new Error(
        `Failed to compile SASS file: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get the SASS directory path
   */
  getSassDir(): string {
    return this.sassDir;
  }
}
