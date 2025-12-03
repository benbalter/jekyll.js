/**
 * Performance timer utility for tracking operation timings
 * This module provides a simple way to measure execution time of operations
 */

/**
 * Represents a single timed operation
 */
export interface TimedOperation {
  /** Name of the operation */
  name: string;
  /** Duration in milliseconds */
  duration: number;
  /** Optional details about the operation (e.g., number of files processed) */
  details?: string;
}

/**
 * Build timing statistics
 */
export interface BuildTimings {
  /** Individual operation timings */
  operations: TimedOperation[];
  /** Total build duration */
  totalDuration: number;
  /** Get operations sorted by duration (most costly first) */
  getMostCostlyOperations: () => TimedOperation[];
}

/**
 * Performance timer for tracking build operation timings
 */
export class PerformanceTimer {
  private operations: TimedOperation[] = [];
  private startTime: number = 0;
  private currentOperation: { name: string; startTime: number } | null = null;

  /**
   * Start the overall timer
   */
  start(): void {
    this.startTime = Date.now();
    this.operations = [];
  }

  /**
   * Start timing a specific operation
   * @param name Name of the operation
   */
  startOperation(name: string): void {
    if (this.currentOperation) {
      console.warn(
        `[PerformanceTimer] startOperation('${name}') called while '${this.currentOperation.name}' is still active. ` +
          `The previous operation will be lost. This may indicate a bug in timing instrumentation.`
      );
    }
    this.currentOperation = {
      name,
      startTime: Date.now(),
    };
  }

  /**
   * End timing the current operation
   * @param details Optional details about the operation
   */
  endOperation(details?: string): void {
    if (this.currentOperation) {
      const duration = Date.now() - this.currentOperation.startTime;
      this.operations.push({
        name: this.currentOperation.name,
        duration,
        details,
      });
      this.currentOperation = null;
    } else {
      console.warn(
        '[PerformanceTimer] endOperation called without a matching startOperation. ' +
          'This may indicate a bug in timing instrumentation.'
      );
    }
  }

  /**
   * Time an async operation
   * @param name Name of the operation
   * @param fn Async function to time
   * @param getDetails Optional function to get details from the result
   * @returns The result of the async function
   */
  async timeAsync<T>(
    name: string,
    fn: () => Promise<T>,
    getDetails?: (result: T) => string
  ): Promise<T> {
    this.startOperation(name);
    try {
      const result = await fn();
      const details = getDetails ? getDetails(result) : undefined;
      this.endOperation(details);
      return result;
    } catch (error) {
      this.endOperation('failed');
      throw error;
    }
  }

  /**
   * Time a synchronous operation
   * @param name Name of the operation
   * @param fn Function to time
   * @param getDetails Optional function to get details from the result
   * @returns The result of the function
   */
  timeSync<T>(name: string, fn: () => T, getDetails?: (result: T) => string): T {
    this.startOperation(name);
    try {
      const result = fn();
      const details = getDetails ? getDetails(result) : undefined;
      this.endOperation(details);
      return result;
    } catch (error) {
      this.endOperation('failed');
      throw error;
    }
  }

  /**
   * Get the build timing statistics
   * @returns Build timing statistics with getMostCostlyOperations method
   */
  getTimings(): BuildTimings {
    const totalDuration = Date.now() - this.startTime;
    const operations = [...this.operations];
    return {
      operations,
      totalDuration,
      getMostCostlyOperations: () => [...operations].sort((a, b) => b.duration - a.duration),
    };
  }

  /**
   * Get operations sorted by duration (most costly first)
   * @returns Sorted array of timed operations
   */
  getMostCostlyOperations(): TimedOperation[] {
    return [...this.operations].sort((a, b) => b.duration - a.duration);
  }

  /**
   * Reset the timer
   */
  reset(): void {
    this.operations = [];
    this.startTime = 0;
    this.currentOperation = null;
  }
}
