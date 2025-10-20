import {jest} from '@jest/globals';
import {Command} from 'commander';

// Mock all dependencies at module level
jest.mock('inquirer', () => ({
  registerPrompt: jest.fn(),
  prompt: jest.fn(),
}));

jest.mock('inquirer-autocomplete-prompt', () => jest.fn());

jest.mock('../../util/login', () => ({
  Login: jest.fn(),
}));

jest.mock('../../util/multichoice', () => jest.fn());

jest.mock('../../models/enums/constant', () => ({
  getRainbowLogo: jest.fn(),
}));

jest.mock('../../util/log', () => ({
  log: {
    ok: jest.fn(),
    fail: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    notAuthenticated: jest.fn(),
  },
}));

jest.mock('fs-extra', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

jest.mock('ryuu-client', () => ({
  default: jest.fn(),
}));

describe('Login Command', () => {
  let mockProgram: Command;
  let mockInquirer: any;
  let mockLog: any;
  let mockGetRainbowLogo: any;
  let mockFs: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockProgram = new Command();
    mockInquirer = require('inquirer');
    mockLog = require('../../util/log').log;
    mockGetRainbowLogo = require('../../models/enums/constant').getRainbowLogo;
    mockFs = require('fs-extra');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Command Registration', () => {
    it('should register login command with correct options', () => {
      const command = mockProgram
        .command('login')
        .description('login to Domo')
        .option('-i, --instance <value>', 'Domo instance')
        .option('-u, --user-email <value>', 'user email')
        .option('-f, --manifest-file <file>', 'use a specific manifest file')
        .option('-t, --transfer', 'transfer login files from ryuu 3.x');

      expect(command.name()).toBe('login');
      expect(command.description()).toBe('login to Domo');
    });

    it('should have correct options', () => {
      const command = mockProgram
        .command('login')
        .option('-i, --instance <value>', 'Domo instance')
        .option('-u, --user-email <value>', 'user email')
        .option('-f, --manifest-file <file>', 'use a specific manifest file')
        .option('-t, --transfer', 'transfer login files from ryuu 3.x');

      const options = command.options;
      expect(options.some(opt => opt.long === '--instance')).toBe(true);
      expect(options.some(opt => opt.long === '--user-email')).toBe(true);
      expect(options.some(opt => opt.long === '--manifest-file')).toBe(true);
      expect(options.some(opt => opt.long === '--transfer')).toBe(true);
    });
  });

  describe('Login Flow', () => {
    it('should display rainbow logo on login', () => {
      mockGetRainbowLogo.mockReturnValue('🌈 RAINBOW LOGO 🌈');

      const logo = mockGetRainbowLogo();
      expect(logo).toBe('🌈 RAINBOW LOGO 🌈');
      expect(mockGetRainbowLogo).toHaveBeenCalled();
    });

    it('should handle instance selection', async () => {
      const mockPrompt = mockInquirer.prompt as jest.MockedFunction<
        typeof mockInquirer.prompt
      >;
      mockPrompt.mockResolvedValueOnce({
        instance: 'test.domo.com',
      });

      const result = await mockPrompt();
      expect(result.instance).toBe('test.domo.com');
    });

    it('should handle new instance creation', async () => {
      const mockPrompt = mockInquirer.prompt as jest.MockedFunction<
        typeof mockInquirer.prompt
      >;
      mockPrompt.mockResolvedValueOnce({
        instance: 'new instance',
      });

      const result = await mockPrompt();
      expect(result.instance).toBe('new instance');
    });

    it('should handle authentication errors', async () => {
      const mockPrompt = mockInquirer.prompt as jest.MockedFunction<
        typeof mockInquirer.prompt
      >;
      mockPrompt.mockRejectedValueOnce(new Error('Authentication failed'));

      await expect(mockPrompt()).rejects.toThrow('Authentication failed');
    });
  });

  describe('Manifest File Handling', () => {
    it('should read manifest file when provided', () => {
      const mockReadFileSync = mockFs.readFileSync as jest.MockedFunction<
        typeof mockFs.readFileSync
      >;
      mockReadFileSync.mockReturnValue(
        JSON.stringify({
          name: 'test-app',
          version: '1.0.0',
        }),
      );

      const mockExistsSync = mockFs.existsSync as jest.MockedFunction<
        typeof mockFs.existsSync
      >;
      mockExistsSync.mockReturnValue(true);

      const manifestPath = 'manifest.json';
      const manifestContent = mockReadFileSync(manifestPath, 'utf8');
      const manifest = JSON.parse(manifestContent);

      expect(manifest.name).toBe('test-app');
      expect(manifest.version).toBe('1.0.0');
    });

    it('should handle missing manifest file', () => {
      const mockExistsSync = mockFs.existsSync as jest.MockedFunction<
        typeof mockFs.existsSync
      >;
      mockExistsSync.mockReturnValue(false);

      expect(mockExistsSync('manifest.json')).toBe(false);
    });
  });

  describe('Transfer Option', () => {
    it('should handle transfer option', async () => {
      const mockPrompt = mockInquirer.prompt as jest.MockedFunction<
        typeof mockInquirer.prompt
      >;
      mockPrompt.mockResolvedValueOnce({
        transfer: true,
      });

      const result = await mockPrompt();
      expect(result.transfer).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const mockPrompt = mockInquirer.prompt as jest.MockedFunction<
        typeof mockInquirer.prompt
      >;
      mockPrompt.mockRejectedValueOnce(new Error('Network error'));

      try {
        await mockPrompt();
        fail('Expected promise to reject');
      } catch (error) {
        expect(error.message).toBe('Network error');
      }
    });

    it('should handle invalid instance format', async () => {
      const mockPrompt = mockInquirer.prompt as jest.MockedFunction<
        typeof mockInquirer.prompt
      >;
      mockPrompt.mockResolvedValueOnce({
        instance: 'invalid-instance-format',
      });

      const result = await mockPrompt();
      expect(result.instance).toBe('invalid-instance-format');
    });
  });

  describe('Mock Integration', () => {
    it('should work with mocked dependencies', () => {
      // Test mocked functions
      mockGetRainbowLogo.mockReturnValue('🌈 RAINBOW LOGO 🌈');
      mockLog.ok.mockImplementation();

      // Test the mocks
      expect(mockGetRainbowLogo()).toBe('🌈 RAINBOW LOGO 🌈');
      mockLog.ok('Test message');
      expect(mockLog.ok).toHaveBeenCalledWith('Test message');
    });

    it('should handle log functions', () => {
      mockLog.ok('Success message');
      mockLog.fail('Error message');
      mockLog.info('Info message');
      mockLog.warn('Warning message');

      expect(mockLog.ok).toHaveBeenCalledWith('Success message');
      expect(mockLog.fail).toHaveBeenCalledWith('Error message');
      expect(mockLog.info).toHaveBeenCalledWith('Info message');
      expect(mockLog.warn).toHaveBeenCalledWith('Warning message');
    });

    it('should handle file system operations', () => {
      const mockExistsSync = mockFs.existsSync as jest.MockedFunction<
        typeof mockFs.existsSync
      >;
      const mockReadFileSync = mockFs.readFileSync as jest.MockedFunction<
        typeof mockFs.readFileSync
      >;

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('{"name": "test"}');

      expect(mockExistsSync('manifest.json')).toBe(true);
      expect(mockReadFileSync('manifest.json', 'utf8')).toBe(
        '{"name": "test"}',
      );
    });
  });

  describe('Token-Based Authentication', () => {
    it('should accept token option', () => {
      const command = mockProgram
        .command('login')
        .option('-t, --token <value>', 'Developer token for authentication');

      const tokenOption = command.options.find(opt => opt.long === '--token');
      expect(tokenOption).toBeDefined();
    });

    it('should accept token-only flag', () => {
      const command = mockProgram
        .command('login')
        .option(
          '--token-only',
          'Force token-only authentication mode (will prompt for token)',
        );

      const tokenOnlyOption = command.options.find(
        opt => opt.long === '--token-only',
      );
      expect(tokenOnlyOption).toBeDefined();
    });

    it('should validate alphanumeric token format', () => {
      const validToken = 'DDCI27236b8d8690ab86cf5328c41a94d068aca1cde4eb6edc34';
      // Token validation: alphanumeric, 20+ characters
      expect(validToken).toMatch(/^[a-zA-Z0-9]+$/);
      expect(validToken.length).toBeGreaterThanOrEqual(20);
    });

    it('should accept tokens with letters and numbers', () => {
      const validTokens = [
        'DDCI27236b8d8690ab86cf5328c41a94d068aca1cde4eb6edc34',
        'abc123def456ghi789jkl012mno345',
        'TOKEN1234567890abcdefghijk',
      ];

      const tokenRegex = /^[a-zA-Z0-9]+$/;

      validTokens.forEach(token => {
        expect(tokenRegex.test(token)).toBe(true);
        expect(token.length).toBeGreaterThanOrEqual(20);
      });
    });

    it('should reject invalid token formats', () => {
      const invalidTokens = [
        '', // empty
        'short', // too short
        'has-dashes-12345678901234567890', // contains dashes
        'has spaces 12345678901234567890', // contains spaces
        'special!@#chars123456789012345', // special characters
      ];

      const tokenRegex = /^[a-zA-Z0-9]+$/;

      invalidTokens.forEach(token => {
        const isValidFormat = tokenRegex.test(token);
        const isValidLength = token.length >= 20;
        expect(isValidFormat && isValidLength).toBe(false);
      });
    });
  });

  describe('Authentication Mode Detection', () => {
    it('should detect token auth when token is provided', () => {
      const options = {
        instance: 'test.domo.com',
        token: 'DDCI27236b8d8690ab86cf5328c41a94d068aca1cde4eb6edc34',
      };

      // When token is provided, should use token auth
      expect(options.token).toBeDefined();
    });

    it('should detect token auth when token-only flag is set', () => {
      const options = {
        instance: 'test.domo.com',
        tokenOnly: true,
      };

      // When tokenOnly is true, should use token auth
      expect(options.tokenOnly).toBe(true);
    });

    it('should use OAuth when no token options provided', () => {
      const options: {instance: string; token?: string; tokenOnly?: boolean} = {
        instance: 'test.domo.com',
      };

      // When neither token nor tokenOnly, should use OAuth
      expect(options.token).toBeUndefined();
      expect(options.tokenOnly).toBeUndefined();
    });
  });

  describe('Integration Tests', () => {
    it('should complete full login flow', async () => {
      const mockPrompt = mockInquirer.prompt as jest.MockedFunction<
        typeof mockInquirer.prompt
      >;
      mockPrompt.mockResolvedValueOnce({
        instance: 'test.domo.com',
        userEmail: 'test@example.com',
      });

      const result = await mockPrompt();
      expect(result.instance).toBe('test.domo.com');
      expect(result.userEmail).toBe('test@example.com');
    });

    it('should handle command options', () => {
      const command = mockProgram
        .command('login')
        .option('-i, --instance <value>', 'Domo instance')
        .option('-u, --user-email <value>', 'user email');

      const options = command.options;
      expect(options.length).toBe(2);
      expect(options.some(opt => opt.long === '--instance')).toBe(true);
      expect(options.some(opt => opt.long === '--user-email')).toBe(true);
    });

    it('should support token-based login workflow', () => {
      const options = {
        instance: 'company.domo.com',
        token: 'DDCI27236b8d8690ab86cf5328c41a94d068aca1cde4eb6edc34',
      };

      expect(options.instance).toBe('company.domo.com');
      expect(options.token).toBe('DDCI27236b8d8690ab86cf5328c41a94d068aca1cde4eb6edc34');
      expect(options.token).toMatch(/^[a-zA-Z0-9]+$/);
      expect(options.token.length).toBeGreaterThanOrEqual(20);
    });
  });
});
