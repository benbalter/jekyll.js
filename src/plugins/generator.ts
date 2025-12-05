/**
 * Generator Plugin Interface for Jekyll.js
 *
 * Generator plugins create additional content during site generation.
 * Examples: sitemap generator, feed generator, archive pages, tag pages
 *
 * @see https://jekyllrb.com/docs/plugins/generators/
 */

// Re-export all generator types from the central types module
export {
  GeneratorPlugin,
  GeneratedFile,
  GeneratedDocument,
  GeneratorResult,
  isGeneratorPlugin,
  GeneratorPriority,
} from './types';
