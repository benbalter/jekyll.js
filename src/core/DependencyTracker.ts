import { Document } from './Document';

/**
 * DependencyTracker manages the dependency graph for documents
 * Tracks which files depend on which other files (layouts, includes, data files)
 */
export class DependencyTracker {
  /** Map of document path to its dependencies */
  private dependencies: Map<string, Set<string>> = new Map();

  /**
   * Record that a document depends on another file
   * @param documentPath Path to the document (relative to source)
   * @param dependencyPath Path to the dependency (relative to source)
   */
  addDependency(documentPath: string, dependencyPath: string): void {
    if (!this.dependencies.has(documentPath)) {
      this.dependencies.set(documentPath, new Set());
    }
    this.dependencies.get(documentPath)!.add(dependencyPath);
  }

  /**
   * Get all dependencies for a document
   * @param documentPath Path to the document (relative to source)
   * @returns Array of dependency paths
   */
  getDependencies(documentPath: string): string[] {
    return Array.from(this.dependencies.get(documentPath) || []);
  }

  /**
   * Find all documents that depend on a given file
   * @param filePath Path to the file (relative to source)
   * @returns Array of document paths that depend on this file
   */
  getReverseDependencies(filePath: string): string[] {
    const dependents: string[] = [];
    
    for (const [docPath, deps] of this.dependencies.entries()) {
      if (deps.has(filePath)) {
        dependents.push(docPath);
      }
    }
    
    return dependents;
  }

  /**
   * Record dependencies for a document based on its layout and data
   * @param doc Document to track
   * @param layoutPath Path to layout file (if used)
   * @param includesPaths Paths to include files used in rendering
   */
  trackDocument(doc: Document, layoutPath?: string, includesPaths: string[] = []): void {
    const docPath = doc.relativePath;

    // Track layout dependency
    if (layoutPath) {
      this.addDependency(docPath, layoutPath);
    }

    // Track include dependencies
    for (const includePath of includesPaths) {
      this.addDependency(docPath, includePath);
    }

    // Track data file dependencies (if document uses site.data)
    // This would require parsing the template, which is expensive
    // For now, we'll handle this through explicit tracking in the renderer
  }

  /**
   * Clear all dependency information
   */
  clear(): void {
    this.dependencies.clear();
  }

  /**
   * Get statistics about the dependency graph
   */
  getStats(): { documentCount: number; totalDependencies: number } {
    let totalDependencies = 0;
    for (const deps of this.dependencies.values()) {
      totalDependencies += deps.size;
    }

    return {
      documentCount: this.dependencies.size,
      totalDependencies,
    };
  }
}
