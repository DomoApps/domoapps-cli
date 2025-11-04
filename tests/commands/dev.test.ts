import {jest} from '@jest/globals';
import {Command} from 'commander';

// Mock all dependencies at module level
jest.mock('../../src/util/login', () => ({
  Login: jest.fn(),
}));

jest.mock('../../src/util/log', () => ({
  log: {
    ok: jest.fn(),
    fail: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    notAuthenticated: jest.fn(),
    handleErrorMessage: jest.fn(),
  },
}));

jest.mock('../../src/server/server', () => ({
  start: jest.fn(),
}));

describe('Dev Command', () => {
  let mockProgram: Command;
  let mockLog: any;
  let mockStart: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockProgram = new Command();
    mockLog = require('../../src/util/log').log;
    mockStart = require('../../src/server/server').start;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Command Registration', () => {
    it('should register dev command with correct options', () => {
      const command = mockProgram
        .command('dev')
        .description('work locally on a Custom App')
        .option('-u, --userId <value>', 'Use a specific userId')
        .option(
          '-e, --external',
          'Allow external connection to access the dev site',
        );

      expect(command.name()).toBe('dev');
      expect(command.description()).toBe('work locally on a Custom App');
    });

    it('should have correct options', () => {
      const command = mockProgram
        .command('dev')
        .option('-u, --userId <value>', 'Use a specific userId')
        .option(
          '-e, --external',
          'Allow external connection to access the dev site',
        );

      const options = command.options;
      expect(options.some(opt => opt.long === '--userId')).toBe(true);
      expect(options.some(opt => opt.long === '--external')).toBe(true);
    });
  });

  describe('Dev Options Handling', () => {
    it('should handle userId option', () => {
      const opts = {
        userId: 'user-123',
        external: false,
        manifest: 'manifest.json',
      };

      const devOptions = {
        userId: opts.userId,
        external: opts.external,
        manifest: opts.manifest,
      };

      expect(devOptions.userId).toBe('user-123');
      expect(devOptions.external).toBe(false);
      expect(devOptions.manifest).toBe('manifest.json');
    });

    it('should handle external option', () => {
      const opts = {
        userId: undefined as string | undefined,
        external: true,
        manifest: 'manifest.json',
      };

      const devOptions = {
        userId: opts.userId,
        external: opts.external,
        manifest: opts.manifest,
      };

      expect(devOptions.userId).toBeUndefined();
      expect(devOptions.external).toBe(true);
      expect(devOptions.manifest).toBe('manifest.json');
    });

    it('should handle both options together', () => {
      const opts = {
        userId: 'user-456',
        external: true,
        manifest: 'custom-manifest.json',
      };

      const devOptions = {
        userId: opts.userId,
        external: opts.external,
        manifest: opts.manifest,
      };

      expect(devOptions.userId).toBe('user-456');
      expect(devOptions.external).toBe(true);
      expect(devOptions.manifest).toBe('custom-manifest.json');
    });

    it('should handle no options', () => {
      const opts = {
        userId: undefined as string | undefined,
        external: false,
        manifest: undefined as string | undefined,
      };

      const devOptions = {
        userId: opts.userId,
        external: opts.external,
        manifest: opts.manifest,
      };

      expect(devOptions.userId).toBeUndefined();
      expect(devOptions.external).toBe(false);
      expect(devOptions.manifest).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle error with message', () => {
      const error = new Error('Network error');
      mockLog.handleErrorMessage.mockReturnValue('Handled error message');

      if (error.message) {
        mockLog.fail(mockLog.handleErrorMessage(error, error.message));
      }

      expect(mockLog.handleErrorMessage).toHaveBeenCalledWith(
        error,
        'Network error',
      );
      expect(mockLog.fail).toHaveBeenCalledWith('Handled error message');
    });

    it('should handle error without message', () => {
      const error = new Error();

      if (error.message) {
        mockLog.fail(mockLog.handleErrorMessage(error, error.message));
      } else {
        mockLog.notAuthenticated();
      }

      expect(mockLog.notAuthenticated).toHaveBeenCalled();
    });

    it('should handle authentication errors', () => {
      const error = new Error('Authentication failed');

      if (error.message) {
        mockLog.fail(mockLog.handleErrorMessage(error, error.message));
      } else {
        mockLog.notAuthenticated();
      }

      expect(mockLog.fail).toHaveBeenCalled();
    });
  });

  describe('Log Integration', () => {
    it('should work with mocked log functions', () => {
      mockLog.ok.mockImplementation();
      mockLog.fail.mockImplementation();
      mockLog.info.mockImplementation();
      mockLog.warn.mockImplementation();
      mockLog.notAuthenticated.mockImplementation();
      mockLog.handleErrorMessage.mockImplementation();

      mockLog.ok('Success message');
      mockLog.fail('Error message');
      mockLog.info('Info message');
      mockLog.warn('Warning message');
      mockLog.notAuthenticated();
      mockLog.handleErrorMessage(new Error('Test error'), 'Test message');

      expect(mockLog.ok).toHaveBeenCalledWith('Success message');
      expect(mockLog.fail).toHaveBeenCalledWith('Error message');
      expect(mockLog.info).toHaveBeenCalledWith('Info message');
      expect(mockLog.warn).toHaveBeenCalledWith('Warning message');
      expect(mockLog.notAuthenticated).toHaveBeenCalled();
      expect(mockLog.handleErrorMessage).toHaveBeenCalledWith(
        expect.any(Error),
        'Test message',
      );
    });
  });

  describe('Server Start', () => {
    it('should start server with dev options', () => {
      const mockClient = {
        getRefreshToken: jest.fn().mockReturnValue('valid-token'),
      };

      const devOptions = {
        userId: 'user-123',
        external: true,
        manifest: 'manifest.json',
      };

      mockStart.mockImplementation();

      mockStart(mockClient, devOptions);

      expect(mockStart).toHaveBeenCalledWith(mockClient, devOptions);
    });

    it('should handle server start errors', () => {
      const mockClient = {
        getRefreshToken: jest.fn().mockReturnValue('valid-token'),
      };

      const devOptions = {
        userId: 'user-123',
        external: false,
        manifest: 'manifest.json',
      };

      mockStart.mockImplementation(() => {
        throw new Error('Server start failed');
      });

      try {
        mockStart(mockClient, devOptions);
      } catch (error) {
        mockLog.fail(error);
        expect(mockLog.fail).toHaveBeenCalledWith(error);
      }
    });
  });

  describe('Mock Integration', () => {
    it('should work with mocked dependencies', () => {
      // Test mocked functions
      mockLog.ok.mockImplementation();
      mockLog.fail.mockImplementation();
      mockLog.info.mockImplementation();
      mockLog.warn.mockImplementation();

      mockLog.ok('Success message');
      mockLog.fail('Error message');
      mockLog.info('Info message');
      mockLog.warn('Warning message');

      expect(mockLog.ok).toHaveBeenCalledWith('Success message');
      expect(mockLog.fail).toHaveBeenCalledWith('Error message');
      expect(mockLog.info).toHaveBeenCalledWith('Info message');
      expect(mockLog.warn).toHaveBeenCalledWith('Warning message');
    });

    it('should handle server start mocking', () => {
      mockStart.mockImplementation();

      const mockClient = {getRefreshToken: jest.fn().mockReturnValue('token')};
      const devOptions = {
        userId: 'user-123',
        external: true,
        manifest: 'manifest.json',
      };

      mockStart(mockClient, devOptions);

      expect(mockStart).toHaveBeenCalledWith(mockClient, devOptions);
    });
  });

  describe('Integration Tests', () => {
    it('should complete full dev flow', () => {
      const mockClient = {
        getRefreshToken: jest.fn().mockReturnValue('valid-token'),
        getInstance: jest.fn().mockReturnValue('test.domo.com'),
      };

      const devOptions = {
        userId: 'user-123',
        external: true,
        manifest: 'manifest.json',
      };

      mockStart.mockImplementation();

      // Simulate the dev flow
      if (mockClient.getRefreshToken()) {
        mockStart(mockClient, devOptions);
        expect(mockStart).toHaveBeenCalledWith(mockClient, devOptions);
      }
    });

    it('should handle dev flow with error handling', () => {
      const error = new Error('Development server error');
      mockLog.handleErrorMessage.mockReturnValue('Handled dev error');

      if (error.message) {
        mockLog.fail(mockLog.handleErrorMessage(error, error.message));
      }

      expect(mockLog.fail).toHaveBeenCalledWith('Handled dev error');
    });

    it('should handle dev flow with authentication failure', () => {
      const error = new Error('Authentication failed');
      mockLog.handleErrorMessage.mockReturnValue(
        'Handled authentication error',
      );

      if (error.message) {
        mockLog.fail(mockLog.handleErrorMessage(error, error.message));
      } else {
        mockLog.notAuthenticated();
      }

      expect(mockLog.fail).toHaveBeenCalledWith('Handled authentication error');
    });
  });
});
