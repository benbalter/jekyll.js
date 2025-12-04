/**
 * Tests for PerformanceTimer utility
 */

import { PerformanceTimer } from '../timer';

describe('PerformanceTimer', () => {
  let timer: PerformanceTimer;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    timer = new PerformanceTimer();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  describe('start', () => {
    it('should initialize the timer', () => {
      timer.start();
      const timings = timer.getTimings();

      expect(timings.operations).toEqual([]);
      expect(timings.totalDuration).toBeGreaterThanOrEqual(0);
    });

    it('should reset operations when called', () => {
      timer.start();
      timer.startOperation('test');
      timer.endOperation();

      // Start again should reset
      timer.start();
      const timings = timer.getTimings();

      expect(timings.operations).toEqual([]);
    });
  });

  describe('startOperation and endOperation', () => {
    beforeEach(() => {
      timer.start();
    });

    it('should track a single operation', () => {
      timer.startOperation('test-op');
      timer.endOperation();

      const timings = timer.getTimings();

      expect(timings.operations).toHaveLength(1);
      expect(timings.operations[0]!.name).toBe('test-op');
      expect(timings.operations[0]!.duration).toBeGreaterThanOrEqual(0);
    });

    it('should track operation with details', () => {
      timer.startOperation('test-op');
      timer.endOperation('3 files');

      const timings = timer.getTimings();

      expect(timings.operations[0]!.details).toBe('3 files');
    });

    it('should track multiple sequential operations', () => {
      timer.startOperation('op1');
      timer.endOperation();

      timer.startOperation('op2');
      timer.endOperation();

      const timings = timer.getTimings();

      expect(timings.operations).toHaveLength(2);
      expect(timings.operations[0]!.name).toBe('op1');
      expect(timings.operations[1]!.name).toBe('op2');
    });

    it('should warn when startOperation is called with active operation', () => {
      timer.startOperation('op1');
      timer.startOperation('op2'); // Should warn

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy.mock.calls[0]![0]).toContain("startOperation('op2')");
      expect(consoleWarnSpy.mock.calls[0]![0]).toContain("'op1' is still active");
    });

    it('should warn when endOperation is called without startOperation', () => {
      timer.endOperation(); // Should warn

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy.mock.calls[0]![0]).toContain(
        'endOperation called without a matching startOperation'
      );
    });
  });

  describe('timeAsync', () => {
    beforeEach(() => {
      timer.start();
    });

    it('should time an async operation', async () => {
      const result = await timer.timeAsync('async-op', async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return 'result';
      });

      expect(result).toBe('result');

      const timings = timer.getTimings();
      expect(timings.operations).toHaveLength(1);
      expect(timings.operations[0]!.name).toBe('async-op');
      expect(timings.operations[0]!.duration).toBeGreaterThan(0);
    });

    it('should include details from getDetails function', async () => {
      await timer.timeAsync(
        'async-op',
        async () => ['a', 'b', 'c'],
        (result) => `${result.length} items`
      );

      const timings = timer.getTimings();
      expect(timings.operations[0]!.details).toBe('3 items');
    });

    it('should record failed status and rethrow on error', async () => {
      const error = new Error('Test error');

      await expect(
        timer.timeAsync('failing-op', async () => {
          throw error;
        })
      ).rejects.toThrow('Test error');

      const timings = timer.getTimings();
      expect(timings.operations[0]!.name).toBe('failing-op');
      expect(timings.operations[0]!.details).toBe('failed');
    });
  });

  describe('timeSync', () => {
    beforeEach(() => {
      timer.start();
    });

    it('should time a sync operation', () => {
      const result = timer.timeSync('sync-op', () => {
        let sum = 0;
        for (let i = 0; i < 1000; i++) sum += i;
        return sum;
      });

      expect(result).toBe(499500);

      const timings = timer.getTimings();
      expect(timings.operations).toHaveLength(1);
      expect(timings.operations[0]!.name).toBe('sync-op');
    });

    it('should include details from getDetails function', () => {
      timer.timeSync(
        'sync-op',
        () => ({ count: 5 }),
        (result) => `${result.count} processed`
      );

      const timings = timer.getTimings();
      expect(timings.operations[0]!.details).toBe('5 processed');
    });

    it('should record failed status and rethrow on error', () => {
      const error = new Error('Test error');

      expect(() =>
        timer.timeSync('failing-op', () => {
          throw error;
        })
      ).toThrow('Test error');

      const timings = timer.getTimings();
      expect(timings.operations[0]!.name).toBe('failing-op');
      expect(timings.operations[0]!.details).toBe('failed');
    });
  });

  describe('getTimings', () => {
    it('should return operations and total duration', () => {
      timer.start();
      timer.startOperation('op1');
      timer.endOperation();

      const timings = timer.getTimings();

      expect(timings).toHaveProperty('operations');
      expect(timings).toHaveProperty('totalDuration');
      expect(timings).toHaveProperty('getMostCostlyOperations');
      expect(typeof timings.getMostCostlyOperations).toBe('function');
    });

    it('should return a copy of operations array', () => {
      timer.start();
      timer.startOperation('op1');
      timer.endOperation();

      const timings1 = timer.getTimings();
      const timings2 = timer.getTimings();

      expect(timings1.operations).not.toBe(timings2.operations);
      expect(timings1.operations).toEqual(timings2.operations);
    });
  });

  describe('getMostCostlyOperations', () => {
    beforeEach(() => {
      timer.start();
    });

    it('should return operations sorted by duration descending', async () => {
      // Create operations with different durations
      await timer.timeAsync('fast', async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
      });

      await timer.timeAsync('slow', async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
      });

      await timer.timeAsync('medium', async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      const sorted = timer.getMostCostlyOperations();

      expect(sorted).toHaveLength(3);
      expect(sorted[0]!.name).toBe('slow');
      expect(sorted[1]!.name).toBe('medium');
      expect(sorted[2]!.name).toBe('fast');
    });

    it('should be accessible from getTimings result', async () => {
      await timer.timeAsync('op1', async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
      });

      await timer.timeAsync('op2', async () => {
        await new Promise((resolve) => setTimeout(resolve, 15));
      });

      const timings = timer.getTimings();
      const sorted = timings.getMostCostlyOperations();

      expect(sorted[0]!.name).toBe('op2');
      expect(sorted[1]!.name).toBe('op1');
    });

    it('should return a copy of operations array', () => {
      timer.startOperation('op1');
      timer.endOperation();

      const sorted1 = timer.getMostCostlyOperations();
      const sorted2 = timer.getMostCostlyOperations();

      expect(sorted1).not.toBe(sorted2);
      expect(sorted1).toEqual(sorted2);
    });
  });

  describe('reset', () => {
    it('should clear all state', () => {
      timer.start();
      timer.startOperation('op1');
      timer.endOperation();

      timer.reset();
      const timings = timer.getTimings();

      expect(timings.operations).toEqual([]);
    });
  });
});
