/**
 * Tests for logger utility
 */

import { logger } from '../logger';
import { JekyllError } from '../errors';

describe('Logger', () => {
  // Mock console methods
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    // Ensure DEBUG env var doesn't interfere
    delete process.env.DEBUG;
    
    // Reset logger configuration
    logger.configure({
      verbose: false,
      quiet: false,
      colors: false, // Disable colors for easier testing
    });

    // Create spies
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    // Restore original console methods
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe('basic logging', () => {
    it('should log info messages', () => {
      logger.info('Test info message');
      
      expect(consoleLogSpy).toHaveBeenCalled();
      const logCall = consoleLogSpy.mock.calls[0][0];
      expect(logCall).toContain('Test info message');
    });

    it('should log error messages', () => {
      logger.error('Test error message');
      
      expect(consoleErrorSpy).toHaveBeenCalled();
      const errorCall = consoleErrorSpy.mock.calls[0][0];
      expect(errorCall).toContain('Test error message');
    });

    it('should log warning messages', () => {
      logger.warn('Test warning message');
      
      expect(consoleWarnSpy).toHaveBeenCalled();
      const warnCall = consoleWarnSpy.mock.calls[0][0];
      expect(warnCall).toContain('Test warning message');
    });

    it('should log success messages', () => {
      logger.success('Test success message');
      
      expect(consoleLogSpy).toHaveBeenCalled();
      const logCall = consoleLogSpy.mock.calls[0][0];
      expect(logCall).toContain('Test success message');
    });
  });

  describe('verbose mode', () => {
    it('should not show debug messages by default', () => {
      logger.debug('Debug message');
      
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should show debug messages when verbose is enabled', () => {
      logger.setVerbose(true);
      logger.debug('Debug message');
      
      expect(consoleLogSpy).toHaveBeenCalled();
      const logCall = consoleLogSpy.mock.calls[0][0];
      expect(logCall).toContain('Debug message');
    });

    it('should include context in verbose mode', () => {
      logger.setVerbose(true);
      logger.info('Test message', { key: 'value' });
      
      expect(consoleLogSpy).toHaveBeenCalled();
      // Context should be included in verbose mode
      const allCalls = consoleLogSpy.mock.calls.flat().join(' ');
      expect(allCalls).toContain('key');
      expect(allCalls).toContain('value');
    });
  });

  describe('quiet mode', () => {
    it('should suppress info messages in quiet mode', () => {
      logger.setQuiet(true);
      logger.info('Test info');
      
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should still show errors in quiet mode', () => {
      logger.setQuiet(true);
      logger.error('Test error');
      
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should suppress warnings in quiet mode', () => {
      logger.setQuiet(true);
      logger.warn('Test warning');
      
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });

  describe('logError', () => {
    it('should log a standard Error', () => {
      const error = new Error('Standard error');
      logger.logError(error);
      
      expect(consoleErrorSpy).toHaveBeenCalled();
      const errorCall = consoleErrorSpy.mock.calls[0][0];
      expect(errorCall).toContain('Standard error');
    });

    it('should log a JekyllError with file context', () => {
      const error = new JekyllError('Jekyll error', {
        file: 'test.md',
        line: 10,
        column: 5,
      });
      
      logger.logError(error);
      
      expect(consoleErrorSpy).toHaveBeenCalled();
      const allCalls = consoleErrorSpy.mock.calls.flat().join(' ');
      expect(allCalls).toContain('test.md');
      expect(allCalls).toContain('10');
      expect(allCalls).toContain('5');
    });

    it('should include stack trace in verbose mode', () => {
      logger.setVerbose(true);
      const error = new Error('Error with stack');
      
      logger.logError(error);
      
      expect(consoleErrorSpy).toHaveBeenCalled();
      // Check that stack trace is included
      const allCalls = consoleErrorSpy.mock.calls.flat().join('\n');
      expect(allCalls).toContain('Stack trace');
    });

    it('should include additional context', () => {
      logger.setVerbose(true);
      const error = new Error('Test error');
      
      logger.logError(error, { context: 'additional info' });
      
      const allCalls = consoleErrorSpy.mock.calls.flat().join(' ');
      expect(allCalls).toContain('context');
      expect(allCalls).toContain('additional info');
    });
  });

  describe('section', () => {
    it('should create a section header', () => {
      logger.section('Test Section');
      
      expect(consoleLogSpy).toHaveBeenCalled();
      const allCalls = consoleLogSpy.mock.calls.flat().join(' ');
      expect(allCalls).toContain('Test Section');
    });

    it('should not show section in quiet mode', () => {
      logger.setQuiet(true);
      logger.section('Test Section');
      
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('plain', () => {
    it('should log plain message without formatting', () => {
      logger.plain('Plain message');
      
      expect(consoleLogSpy).toHaveBeenCalledWith('Plain message');
    });

    it('should not show plain message in quiet mode', () => {
      logger.setQuiet(true);
      logger.plain('Plain message');
      
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });
});
