/**
 * Tests for progress indicator utility
 */

import { ProgressIndicator, Spinner, createProgressIndicator, createSpinner } from '../progress';

// Store original isTTY value
const originalIsTTY = process.stdout.isTTY;

describe('ProgressIndicator', () => {
  beforeEach(() => {
    // Set process.stdout.isTTY to false to avoid actual terminal output during tests
    Object.defineProperty(process.stdout, 'isTTY', {
      value: false,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    // Restore original isTTY value
    Object.defineProperty(process.stdout, 'isTTY', {
      value: originalIsTTY,
      writable: true,
      configurable: true,
    });
  });

  describe('constructor', () => {
    it('should create a progress indicator with required options', () => {
      const progress = new ProgressIndicator({ total: 100 });
      expect(progress).toBeDefined();
    });

    it('should create a progress indicator with all options', () => {
      const progress = new ProgressIndicator({
        total: 50,
        label: 'Test',
        colors: false,
        width: 40,
        showSpinner: true,
      });
      expect(progress).toBeDefined();
    });
  });

  describe('update', () => {
    it('should update progress without error', () => {
      const progress = new ProgressIndicator({ total: 100 });
      expect(() => progress.update(10)).not.toThrow();
      expect(() => progress.update(50, 'Processing...')).not.toThrow();
      expect(() => progress.update(100)).not.toThrow();
    });
  });

  describe('tick', () => {
    it('should increment progress', () => {
      const progress = new ProgressIndicator({ total: 10 });
      expect(() => progress.tick()).not.toThrow();
      expect(() => progress.tick('Item 2')).not.toThrow();
    });
  });

  describe('complete', () => {
    it('should mark progress as complete', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const progress = new ProgressIndicator({ total: 10 });
      progress.update(5);
      expect(() => progress.complete()).not.toThrow();
      consoleSpy.mockRestore();
    });
  });
});

describe('Spinner', () => {
  beforeEach(() => {
    // Set process.stdout.isTTY to false to avoid actual terminal output during tests
    Object.defineProperty(process.stdout, 'isTTY', {
      value: false,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    // Restore original isTTY value
    Object.defineProperty(process.stdout, 'isTTY', {
      value: originalIsTTY,
      writable: true,
      configurable: true,
    });
  });

  describe('constructor', () => {
    it('should create a spinner with message', () => {
      const spinner = new Spinner('Loading');
      expect(spinner).toBeDefined();
    });

    it('should create a spinner with colors disabled', () => {
      const spinner = new Spinner('Loading', false);
      expect(spinner).toBeDefined();
    });
  });

  describe('start and stop', () => {
    it('should start and stop without error', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const spinner = new Spinner('Loading');
      spinner.start();
      spinner.stop();
      consoleSpy.mockRestore();
    });
  });

  describe('setText', () => {
    it('should update message without error', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const spinner = new Spinner('Loading');
      spinner.start();
      spinner.setText('Still loading...');
      spinner.stop();
      consoleSpy.mockRestore();
    });
  });

  describe('succeed', () => {
    it('should stop with success message', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const spinner = new Spinner('Loading');
      spinner.start();
      spinner.succeed('Done!');
      expect(consoleSpy).toHaveBeenCalled();
      const lastCall = consoleSpy.mock.calls[consoleSpy.mock.calls.length - 1]?.[0] ?? '';
      expect(lastCall).toContain('Done!');
      consoleSpy.mockRestore();
    });
  });

  describe('fail', () => {
    it('should stop with failure message', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const spinner = new Spinner('Loading');
      spinner.start();
      spinner.fail('Failed!');
      expect(consoleSpy).toHaveBeenCalled();
      const lastCall = consoleSpy.mock.calls[consoleSpy.mock.calls.length - 1]?.[0] ?? '';
      expect(lastCall).toContain('Failed!');
      consoleSpy.mockRestore();
    });
  });
});

describe('helper functions', () => {
  it('should create progress indicator via helper', () => {
    const progress = createProgressIndicator(100, 'Test');
    expect(progress).toBeInstanceOf(ProgressIndicator);
  });

  it('should create spinner via helper', () => {
    const spinner = createSpinner('Loading');
    expect(spinner).toBeInstanceOf(Spinner);
  });
});
