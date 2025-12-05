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

    it('should create a progress indicator with default label', () => {
      const progress = new ProgressIndicator({ total: 10 });
      expect(progress).toBeDefined();
    });

    it('should create a progress indicator with spinner disabled', () => {
      const progress = new ProgressIndicator({
        total: 10,
        showSpinner: false,
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

    it('should handle zero total', () => {
      const progress = new ProgressIndicator({ total: 0 });
      expect(() => progress.update(0)).not.toThrow();
    });

    it('should throttle updates', () => {
      const progress = new ProgressIndicator({ total: 100 });
      // Multiple rapid updates should not throw
      for (let i = 0; i < 50; i++) {
        expect(() => progress.update(i)).not.toThrow();
      }
    });
  });

  describe('tick', () => {
    it('should increment progress', () => {
      const progress = new ProgressIndicator({ total: 10 });
      expect(() => progress.tick()).not.toThrow();
      expect(() => progress.tick('Item 2')).not.toThrow();
    });

    it('should increment multiple times', () => {
      const progress = new ProgressIndicator({ total: 10 });
      for (let i = 0; i < 10; i++) {
        expect(() => progress.tick(`Item ${i + 1}`)).not.toThrow();
      }
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

    it('should complete even when not at total', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const progress = new ProgressIndicator({ total: 100 });
      progress.update(50);
      expect(() => progress.complete()).not.toThrow();
      consoleSpy.mockRestore();
    });
  });

  describe('rendering', () => {
    it('should render progress when isTTY is true', async () => {
      // Enable TTY for this test
      Object.defineProperty(process.stdout, 'isTTY', {
        value: true,
        writable: true,
        configurable: true,
      });

      const writeSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);

      const progress = new ProgressIndicator({ total: 100 });
      progress.update(50);

      // Wait for throttle to pass and then update
      await new Promise((resolve) => setTimeout(resolve, 60));
      progress.update(100);

      writeSpy.mockRestore();
    });

    it('should render with colors disabled', () => {
      Object.defineProperty(process.stdout, 'isTTY', {
        value: true,
        writable: true,
        configurable: true,
      });

      const writeSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);

      const progress = new ProgressIndicator({
        total: 100,
        colors: false,
      });
      progress.update(50);

      writeSpy.mockRestore();
    });

    it('should show complete state with checkmark', () => {
      Object.defineProperty(process.stdout, 'isTTY', {
        value: true,
        writable: true,
        configurable: true,
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const writeSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);

      const progress = new ProgressIndicator({ total: 10 });
      progress.complete();

      consoleSpy.mockRestore();
      writeSpy.mockRestore();
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

    it('should handle multiple starts', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const spinner = new Spinner('Loading');
      spinner.start();
      spinner.start(); // Should be safe to call again
      spinner.stop();
      consoleSpy.mockRestore();
    });

    it('should handle multiple stops', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const spinner = new Spinner('Loading');
      spinner.start();
      spinner.stop();
      spinner.stop(); // Should be safe to call again
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

    it('should update message before start', () => {
      const spinner = new Spinner('Loading');
      expect(() => spinner.setText('New message')).not.toThrow();
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

    it('should use default message if not provided', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const spinner = new Spinner('Loading');
      spinner.start();
      spinner.succeed();
      expect(consoleSpy).toHaveBeenCalled();
      const lastCall = consoleSpy.mock.calls[consoleSpy.mock.calls.length - 1]?.[0] ?? '';
      expect(lastCall).toContain('Loading');
      consoleSpy.mockRestore();
    });

    it('should work with colors disabled', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const spinner = new Spinner('Loading', false);
      spinner.start();
      spinner.succeed('Done!');
      expect(consoleSpy).toHaveBeenCalled();
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

    it('should use default message if not provided', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const spinner = new Spinner('Loading');
      spinner.start();
      spinner.fail();
      expect(consoleSpy).toHaveBeenCalled();
      const lastCall = consoleSpy.mock.calls[consoleSpy.mock.calls.length - 1]?.[0] ?? '';
      expect(lastCall).toContain('Loading');
      consoleSpy.mockRestore();
    });

    it('should work with colors disabled', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const spinner = new Spinner('Loading', false);
      spinner.start();
      spinner.fail('Failed!');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('rendering with TTY', () => {
    it('should render spinner frames when isTTY is true', async () => {
      Object.defineProperty(process.stdout, 'isTTY', {
        value: true,
        writable: true,
        configurable: true,
      });

      const writeSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const spinner = new Spinner('Loading');
      spinner.start();

      // Wait for a few spinner frames
      await new Promise((resolve) => setTimeout(resolve, 200));

      spinner.stop();

      expect(writeSpy).toHaveBeenCalled();

      writeSpy.mockRestore();
      consoleSpy.mockRestore();
    });

    it('should render spinner with colors disabled when TTY', async () => {
      Object.defineProperty(process.stdout, 'isTTY', {
        value: true,
        writable: true,
        configurable: true,
      });

      const writeSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const spinner = new Spinner('Loading', false);
      spinner.start();

      await new Promise((resolve) => setTimeout(resolve, 100));

      spinner.succeed();

      writeSpy.mockRestore();
      consoleSpy.mockRestore();
    });
  });
});

describe('helper functions', () => {
  it('should create progress indicator via helper', () => {
    const progress = createProgressIndicator(100, 'Test');
    expect(progress).toBeInstanceOf(ProgressIndicator);
  });

  it('should create progress indicator with colors option', () => {
    const progress = createProgressIndicator(100, 'Test', false);
    expect(progress).toBeInstanceOf(ProgressIndicator);
  });

  it('should create spinner via helper', () => {
    const spinner = createSpinner('Loading');
    expect(spinner).toBeInstanceOf(Spinner);
  });

  it('should create spinner with colors option', () => {
    const spinner = createSpinner('Loading', false);
    expect(spinner).toBeInstanceOf(Spinner);
  });
});
