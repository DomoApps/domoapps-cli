import {jest} from '@jest/globals';
const chalk = require('chalk');
import {log} from '../../src/util/log';

// Mock chalk
jest.mock('chalk', () => ({
  red: jest.fn((text: string) => `RED:${text}`),
  green: jest.fn((text: string) => `GREEN:${text}`),
  yellow: jest.fn((text: string) => `YELLOW:${text}`),
  blue: jest.fn((text: string) => `BLUE:${text}`),
  cyan: jest.fn((text: string) => `CYAN:${text}`),
  magenta: jest.fn((text: string) => `MAGENTA:${text}`),
  gray: jest.fn((text: string) => `GRAY:${text}`),
  grey: jest.fn((text: string) => `GREY:${text}`),
  dim: jest.fn((text: string) => `DIM:${text}`),
  bold: jest.fn((text: string) => `BOLD:${text}`),
}));

describe('Log Utility', () => {
  let mockConsole: any;
  let mockChalk: jest.Mocked<typeof chalk>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockConsole = jest.spyOn(console, 'log').mockImplementation(() => {
      // Mock implementation
    });
    mockChalk = chalk as jest.Mocked<typeof chalk>;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Success Logging', () => {
    it('should log success messages with green color', () => {
      const message = 'Operation completed successfully';
      log.ok(message);

      expect(mockChalk.green).toHaveBeenCalledWith('✓');
      expect(mockConsole).toHaveBeenCalledWith('GREEN:✓', message);
    });

    it('should log success with submessage', () => {
      const message = 'File uploaded';
      const submessage = 'File size: 1.2MB';
      log.ok(message, submessage);

      expect(mockChalk.green).toHaveBeenCalledWith('✓');
      expect(mockConsole).toHaveBeenCalledTimes(2);
    });
  });

  describe('Info Logging', () => {
    it('should log info messages with cyan color', () => {
      const message = 'This is information';
      log.info(message);

      expect(mockChalk.cyan).toHaveBeenCalledWith(message);
      expect(mockConsole).toHaveBeenCalledWith(`CYAN:${message}`);
    });

    it('should log info with submessage', () => {
      const message = 'Processing data';
      const submessage = 'Step 1 of 3';
      log.info(message, submessage);

      expect(mockChalk.cyan).toHaveBeenCalledWith(message);
      expect(mockConsole).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Logging', () => {
    it('should log error messages with red color', () => {
      const message = 'Operation failed';
      log.fail(message);

      expect(mockChalk.red).toHaveBeenCalledWith('X');
      expect(mockConsole).toHaveBeenCalledWith('RED:X', message);
    });

    it('should log error with submessage', () => {
      const message = 'Upload failed';
      const submessage = 'Network timeout';
      log.fail(message, submessage);

      expect(mockChalk.red).toHaveBeenCalledWith('X');
      expect(mockConsole).toHaveBeenCalledTimes(2);
    });
  });

  describe('Warning Logging', () => {
    it('should log warning messages with yellow color', () => {
      const message = 'This is a warning';
      log.warn(message);

      expect(mockChalk.yellow).toHaveBeenCalledWith(message);
      expect(mockConsole).toHaveBeenCalledWith(`YELLOW:${message}`);
    });

    it('should log warning with submessage', () => {
      const message = 'Deprecated feature';
      const submessage = 'Will be removed in v2.0';
      log.warn(message, submessage);

      expect(mockChalk.yellow).toHaveBeenCalledWith(message);
      expect(mockConsole).toHaveBeenCalledTimes(2);
    });
  });

  describe('Authentication Status', () => {
    it('should log not authenticated message', () => {
      log.notAuthenticated();

      expect(mockChalk.red).toHaveBeenCalledWith('X');
      expect(mockConsole).toHaveBeenCalledWith(
        'RED:X',
        'Failure to authenticate',
      );
      expect(mockConsole).toHaveBeenCalledWith(
        'Missing refresh token, please login using `domo login`',
      );
    });
  });

  describe('Chalk Integration', () => {
    it('should use chalk for all color methods', () => {
      const testMessage = 'Test message';

      log.ok(testMessage);
      log.fail(testMessage);
      log.warn(testMessage);
      log.info(testMessage);

      expect(mockChalk.green).toHaveBeenCalledWith('✓');
      expect(mockChalk.red).toHaveBeenCalledWith('X');
      expect(mockChalk.yellow).toHaveBeenCalledWith(testMessage);
      expect(mockChalk.cyan).toHaveBeenCalledWith(testMessage);
    });
  });

  describe('Message Formatting', () => {
    it('should handle string interpolation', () => {
      const name = 'test-app';
      const version = '1.0.0';
      const message = `Application ${name} version ${version} deployed successfully`;

      log.ok(message);

      expect(mockChalk.green).toHaveBeenCalledWith('✓');
      expect(mockConsole).toHaveBeenCalledWith('GREEN:✓', message);
    });

    it('should handle multiple arguments', () => {
      const message = 'Operation';
      const details = 'completed';
      const status = 'successfully';

      log.ok(message, details);

      expect(mockChalk.green).toHaveBeenCalledWith('✓');
      expect(mockConsole).toHaveBeenCalledWith('GREEN:✓', message);
    });
  });

  describe('Error Handling', () => {
    it('should handle undefined messages gracefully', () => {
      expect(() => {
        log.ok(undefined as any);
      }).not.toThrow();
    });

    it('should handle null messages gracefully', () => {
      expect(() => {
        log.fail(null as any);
      }).not.toThrow();
    });

    it('should handle empty strings', () => {
      log.ok('');
      expect(mockChalk.green).toHaveBeenCalledWith('✓');
    });
  });

  describe('Console Output', () => {
    it('should always call console.log', () => {
      log.ok('test');
      log.fail('test');
      log.warn('test');
      log.info('test');

      expect(mockConsole).toHaveBeenCalledTimes(4);
    });
  });

  describe('Performance', () => {
    it('should handle high frequency logging', () => {
      const startTime = Date.now();

      for (let i = 0; i < 100; i++) {
        log.ok(`Message ${i}`);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1000); // Should complete in less than 1 second
      expect(mockConsole).toHaveBeenCalledTimes(100);
    });
  });
});
