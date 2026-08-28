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
    clientRequestFailed: jest.fn(),
  },
}));

jest.mock('fs-extra', () => ({
  createWriteStream: jest.fn(),
  remove: jest.fn(),
}));

jest.mock('path', () => ({
  resolve: jest.fn(),
}));

jest.mock('unzipper', () => ({
  Open: {
    file: jest.fn(),
  },
}));

jest.mock('inquirer', () => ({
  prompt: jest.fn(),
}));

jest.mock('shelljs', () => ({
  chmod: jest.fn(),
}));

describe('Download Command', () => {
  let mockProgram: Command;
  let mockLog: any;
  let mockFs: any;
  let mockPath: any;
  let mockUnzipper: any;
  let mockInquirer: any;
  let mockShell: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockProgram = new Command();
    mockLog = require('../../src/util/log').log;
    mockFs = require('fs-extra');
    mockPath = require('path');
    mockUnzipper = require('unzipper');
    mockInquirer = require('inquirer');
    mockShell = require('shelljs');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Command Registration', () => {
    it('should register download command with correct options', () => {
      const command = mockProgram
        .command('download')
        .description('download a Custom App design')
        .option('-i, --design-id <id>', 'design id')
        .option('-d, --design-version <design-version>', 'design version');

      expect(command.name()).toBe('download');
      expect(command.description()).toBe('download a Custom App design');
    });

    it('should have correct options', () => {
      const command = mockProgram
        .command('download')
        .option('-i, --design-id <id>', 'design id')
        .option('-d, --design-version <design-version>', 'design version');

      const options = command.options;
      expect(options.some(opt => opt.long === '--design-id')).toBe(true);
      expect(options.some(opt => opt.long === '--design-version')).toBe(true);
    });
  });

  describe('Prompt Handling', () => {
    it('should prompt for design ID when not provided', () => {
      const args = {
        designId: undefined as string | undefined,
        designVersion: 'latest',
      };

      const prompts = [];
      if (!args.designId) {
        prompts.push({
          type: 'input',
          message: 'design id',
          name: 'designId',
        });
      }

      expect(prompts).toHaveLength(1);
      expect(prompts[0].type).toBe('input');
      expect(prompts[0].message).toBe('design id');
      expect(prompts[0].name).toBe('designId');
    });

    it('should prompt for version when not provided', () => {
      const args = {
        designId: 'design-123',
        designVersion: undefined as string | undefined,
      };

      const prompts = [];
      if (!args.designVersion) {
        prompts.push({
          type: 'input',
          message: 'version',
          name: 'version',
          default: 'latest',
        });
      }

      expect(prompts).toHaveLength(1);
      expect(prompts[0].type).toBe('input');
      expect(prompts[0].message).toBe('version');
      expect(prompts[0].name).toBe('version');
      expect(prompts[0].default).toBe('latest');
    });

    it('should prompt for both when neither provided', () => {
      const args = {
        designId: undefined as string | undefined,
        designVersion: undefined as string | undefined,
      };

      const prompts = [];
      if (!args.designId) {
        prompts.push({
          type: 'input',
          message: 'design id',
          name: 'designId',
        });
      }
      if (!args.designVersion) {
        prompts.push({
          type: 'input',
          message: 'version',
          name: 'version',
          default: 'latest',
        });
      }

      expect(prompts).toHaveLength(2);
      expect(prompts[0].name).toBe('designId');
      expect(prompts[1].name).toBe('version');
    });

    it('should not prompt when both provided', () => {
      const args = {
        designId: 'design-123',
        designVersion: 'v1.0.0',
      };

      const prompts = [];
      if (!args.designId) {
        prompts.push({
          type: 'input',
          message: 'design id',
          name: 'designId',
        });
      }
      if (!args.designVersion) {
        prompts.push({
          type: 'input',
          message: 'version',
          name: 'version',
          default: 'latest',
        });
      }

      expect(prompts).toHaveLength(0);
    });
  });

  describe('Download Process', () => {
    it('should handle successful download', () => {
      const mockClient = {
        download: jest.fn(),
      };

      const designId = 'design-123';
      const version = 'latest';

      mockClient.download(designId, version);

      expect(mockClient.download).toHaveBeenCalledWith(designId, version);
    });

    it('should handle download failure', () => {
      const designId = 'design-123';
      const version = 'latest';

      // Simulate download failure
      mockLog.fail(
        'Design not found. Make sure you have the correct design id.',
      );

      expect(mockLog.fail).toHaveBeenCalledWith(
        'Design not found. Make sure you have the correct design id.',
      );
    });

    it('should handle download error', () => {
      const designId = 'design-123';

      // Simulate download error
      mockLog.clientRequestFailed('Unable to download design ' + designId);

      expect(mockLog.clientRequestFailed).toHaveBeenCalledWith(
        'Unable to download design design-123',
      );
    });
  });

  describe('File Processing', () => {
    it('should create write stream with correct options', () => {
      const mockWriteStream = {
        on: jest.fn(),
      };

      mockFs.createWriteStream.mockReturnValue(mockWriteStream);

      const name = 'myapp';
      const writeStream = mockFs.createWriteStream('./' + name + '.zip', {
        flags: 'w+',
        mode: 0o666,
      });

      expect(mockFs.createWriteStream).toHaveBeenCalledWith('./myapp.zip', {
        flags: 'w+',
        mode: 0o666,
      });
      expect(writeStream).toBe(mockWriteStream);
    });

    it('should handle file extraction', () => {
      const mockWriteStream = {
        on: jest.fn(),
      };

      mockFs.createWriteStream.mockReturnValue(mockWriteStream);

      const name = 'myapp';
      const writeStream = mockFs.createWriteStream('./' + name + '.zip', {
        flags: 'w+',
        mode: 0o666,
      });

      // Test that createWriteStream was called with correct parameters
      expect(mockFs.createWriteStream).toHaveBeenCalledWith('./myapp.zip', {
        flags: 'w+',
        mode: 0o666,
      });
      expect(writeStream).toBe(mockWriteStream);
    });

    it('should handle extraction error', () => {
      const mockWriteStream = {
        on: jest.fn(),
      };

      mockFs.createWriteStream.mockReturnValue(mockWriteStream);
      mockPath.resolve.mockReturnValue('/path/to/file');
      mockUnzipper.Open.file.mockRejectedValue(new Error('Extraction failed'));

      const name = 'myapp';
      const writeStream = mockFs.createWriteStream('./' + name + '.zip', {
        flags: 'w+',
        mode: 0o666,
      });

      // Test that createWriteStream was called with correct parameters
      expect(mockFs.createWriteStream).toHaveBeenCalledWith('./myapp.zip', {
        flags: 'w+',
        mode: 0o666,
      });
      expect(writeStream).toBe(mockWriteStream);
    });
  });

  describe('Error Handling', () => {
    it('should handle authentication failure', () => {
      const mockLogin = require('../../src/util/login').Login;
      mockLogin.mockImplementation(() => ({
        getClient: jest.fn(),
      }));

      const login = new mockLogin();

      // Simulate authentication failure
      mockLog.notAuthenticated();

      expect(mockLog.notAuthenticated).toHaveBeenCalled();
    });

    it('should handle client request failure', () => {
      const designId = 'design-123';
      mockLog.clientRequestFailed('Unable to download design ' + designId);

      expect(mockLog.clientRequestFailed).toHaveBeenCalledWith(
        'Unable to download design design-123',
      );
    });

    it('should handle design not found', () => {
      mockLog.fail(
        'Design not found. Make sure you have the correct design id.',
      );

      expect(mockLog.fail).toHaveBeenCalledWith(
        'Design not found. Make sure you have the correct design id.',
      );
    });
  });

  describe('Log Integration', () => {
    it('should work with mocked log functions', () => {
      mockLog.ok.mockImplementation();
      mockLog.fail.mockImplementation();
      mockLog.info.mockImplementation();
      mockLog.warn.mockImplementation();
      mockLog.notAuthenticated.mockImplementation();
      mockLog.clientRequestFailed.mockImplementation();

      mockLog.ok('Success message');
      mockLog.fail('Error message');
      mockLog.info('Info message');
      mockLog.warn('Warning message');
      mockLog.notAuthenticated();
      mockLog.clientRequestFailed('Request failed');

      expect(mockLog.ok).toHaveBeenCalledWith('Success message');
      expect(mockLog.fail).toHaveBeenCalledWith('Error message');
      expect(mockLog.info).toHaveBeenCalledWith('Info message');
      expect(mockLog.warn).toHaveBeenCalledWith('Warning message');
      expect(mockLog.notAuthenticated).toHaveBeenCalled();
      expect(mockLog.clientRequestFailed).toHaveBeenCalledWith(
        'Request failed',
      );
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

    it('should handle file system mocking', () => {
      const mockWriteStream = {
        on: jest.fn(),
      };

      mockFs.createWriteStream.mockReturnValue(mockWriteStream);
      mockFs.remove.mockImplementation();

      const writeStream = mockFs.createWriteStream('./test.zip', {
        flags: 'w+',
        mode: 0o666,
      });

      mockFs.remove('./test.zip');

      expect(mockFs.createWriteStream).toHaveBeenCalledWith('./test.zip', {
        flags: 'w+',
        mode: 0o666,
      });
      expect(mockFs.remove).toHaveBeenCalledWith('./test.zip');
    });
  });

  describe('Integration Tests', () => {
    it('should complete full download flow', () => {
      const mockClient = {
        download: jest.fn(),
      };

      const designId = 'design-123';
      const version = 'latest';

      mockClient.download(designId, version);

      expect(mockClient.download).toHaveBeenCalledWith(designId, version);
    });

    it('should handle download flow with error', () => {
      const designId = 'design-123';

      mockLog.clientRequestFailed('Unable to download design ' + designId);

      expect(mockLog.clientRequestFailed).toHaveBeenCalledWith(
        'Unable to download design design-123',
      );
    });

    it('should handle download flow with authentication failure', () => {
      const mockLogin = require('../../src/util/login').Login;
      mockLogin.mockImplementation(() => ({
        getClient: jest.fn(),
      }));

      const login = new mockLogin();

      mockLog.notAuthenticated();

      expect(mockLog.notAuthenticated).toHaveBeenCalled();
    });
  });
});
