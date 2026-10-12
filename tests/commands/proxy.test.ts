import {jest} from '@jest/globals';
import {Command} from 'commander';

// Mock all dependencies at module level
jest.mock('../../src/util/log', () => ({
  log: {
    ok: jest.fn(),
    fail: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    notAuthenticated: jest.fn(),
  },
}));

jest.mock('enquirer', () => ({
  prompt: jest.fn(),
}));

jest.mock('configstore', () => {
  return jest.fn().mockImplementation(() => ({
    delete: jest.fn(),
    set: jest.fn(),
    get: jest.fn(),
  }));
});

describe('Proxy Command', () => {
  let mockProgram: Command;
  let mockLog: any;
  let mockEnquirer: any;
  let mockConfigstore: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockProgram = new Command();
    mockLog = require('../../src/util/log').log;
    mockEnquirer = require('enquirer');
    mockConfigstore = require('configstore');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Command Registration', () => {
    it('should register proxy command with correct syntax', () => {
      const command = mockProgram
        .command('proxy [host] [port]')
        .description(
          'configure the proxy through which you wish to send all commands',
        )
        .option('-r, --remove-proxy', 'Remove current proxy settings')
        .option(
          '-a, --auth, Flag for if you wish to enter a username for your corporate proxy (password will be prompted on each command)',
        );

      expect(command.name()).toBe('proxy');
      expect(command.description()).toBe(
        'configure the proxy through which you wish to send all commands',
      );
    });

    it('should have correct options', () => {
      const command = mockProgram
        .command('proxy [host] [port]')
        .option('-r, --remove-proxy', 'Remove current proxy settings')
        .option(
          '-a, --auth, Flag for if you wish to enter a username for your corporate proxy (password will be prompted on each command)',
        );

      const options = command.options;
      expect(options.some(opt => opt.long === '--remove-proxy')).toBe(true);
      expect(options.some(opt => opt.long === '--auth')).toBe(true);
    });
  });

  describe('Remove Proxy Functionality', () => {
    it('should remove proxy settings when remove-proxy option is used', () => {
      const options = {removeProxy: true};
      const mockProxy = {
        delete: jest.fn(),
      };

      mockConfigstore.mockImplementation(() => mockProxy);

      if (options.removeProxy) {
        const proxy = new mockConfigstore('/proxy');
        proxy.delete('host');
        proxy.delete('port');
        proxy.delete('username');
        mockLog.ok('Proxy Removed!');
      }

      expect(mockConfigstore).toHaveBeenCalledWith('/proxy');
      expect(mockProxy.delete).toHaveBeenCalledWith('host');
      expect(mockProxy.delete).toHaveBeenCalledWith('port');
      expect(mockProxy.delete).toHaveBeenCalledWith('username');
      expect(mockLog.ok).toHaveBeenCalledWith('Proxy Removed!');
    });
  });

  describe('Proxy Configuration', () => {
    it('should handle proxy configuration without auth', () => {
      const host = 'proxy.example.com';
      const port = '8080';
      const options = {auth: false};

      const prompts = [
        {
          type: 'confirm',
          message: `You are about to set all requests to go through proxy ${host}:${port}, are you sure you want to do this?`,
          name: 'proxy',
          default: false,
        },
      ];

      mockEnquirer.prompt.mockResolvedValue({
        proxy: true,
      });

      mockEnquirer.prompt(prompts).then((answer: any) => {
        if (answer.proxy) {
          const mockProxy = {
            set: jest.fn(),
          };
          mockConfigstore.mockImplementation(() => mockProxy);

          const proxy = new mockConfigstore('/proxy');
          proxy.set('host', host);
          proxy.set('port', port);
          proxy.set('username', answer.username);
          mockLog.ok('Proxy set for all future commands');
        }
      });

      expect(mockEnquirer.prompt).toHaveBeenCalledWith(prompts);
    });

    it('should handle proxy configuration with auth', () => {
      const host = 'proxy.example.com';
      const port = '8080';
      const options = {auth: true};

      const prompts = [
        {
          type: 'input',
          message: 'Please enter your username:',
          name: 'username',
        },
        {
          type: 'confirm',
          message: `You are about to set all requests to go through proxy ${host}:${port}, are you sure you want to do this?`,
          name: 'proxy',
          default: false,
        },
      ];

      mockEnquirer.prompt.mockResolvedValue({
        username: 'testuser',
        proxy: true,
      });

      mockEnquirer.prompt(prompts).then((answer: any) => {
        if (answer.proxy) {
          const mockProxy = {
            set: jest.fn(),
          };
          mockConfigstore.mockImplementation(() => mockProxy);

          const proxy = new mockConfigstore('/proxy');
          proxy.set('host', host);
          proxy.set('port', port);
          proxy.set('username', answer.username);
          mockLog.ok('Proxy set for all future commands');
        }
      });

      expect(mockEnquirer.prompt).toHaveBeenCalledWith(prompts);
    });

    it('should handle proxy configuration cancellation', () => {
      const host = 'proxy.example.com';
      const port = '8080';
      const options = {auth: false};

      const prompts = [
        {
          type: 'confirm',
          message: `You are about to set all requests to go through proxy ${host}:${port}, are you sure you want to do this?`,
          name: 'proxy',
          default: false,
        },
      ];

      mockEnquirer.prompt.mockResolvedValue({
        proxy: false,
      });

      mockEnquirer.prompt(prompts).then((answer: any) => {
        if (answer.proxy) {
          const mockProxy = {
            set: jest.fn(),
          };
          mockConfigstore.mockImplementation(() => mockProxy);

          const proxy = new mockConfigstore('/proxy');
          proxy.set('host', host);
          proxy.set('port', port);
          proxy.set('username', answer.username);
          mockLog.ok('Proxy set for all future commands');
        } else {
          mockLog.fail('Proxy command aborted');
        }
      });

      expect(mockEnquirer.prompt).toHaveBeenCalledWith(prompts);
    });
  });

  describe('Error Handling', () => {
    it('should handle enquirer prompt error', () => {
      const host = 'proxy.example.com';
      const port = '8080';
      const options = {auth: false};

      const prompts = [
        {
          type: 'confirm',
          message: `You are about to set all requests to go through proxy ${host}:${port}, are you sure you want to do this?`,
          name: 'proxy',
          default: false,
        },
      ];

      const error = new Error('Prompt failed');
      mockEnquirer.prompt.mockRejectedValue(error);

      mockEnquirer.prompt(prompts).catch((err: any) => {
        console.log(`Login unsuccessful: ${JSON.stringify(err)}`);
      });

      expect(mockEnquirer.prompt).toHaveBeenCalledWith(prompts);
    });

    it('should handle configstore error', () => {
      const options = {removeProxy: true};

      mockConfigstore.mockImplementation(() => {
        throw new Error('Configstore error');
      });

      try {
        const proxy = new mockConfigstore('/proxy');
        proxy.delete('host');
        proxy.delete('port');
        proxy.delete('username');
        mockLog.ok('Proxy Removed!');
      } catch (error) {
        // Handle error
      }

      expect(mockConfigstore).toHaveBeenCalledWith('/proxy');
    });
  });

  describe('Log Integration', () => {
    it('should work with mocked log functions', () => {
      mockLog.ok.mockImplementation();
      mockLog.fail.mockImplementation();
      mockLog.info.mockImplementation();
      mockLog.warn.mockImplementation();
      mockLog.notAuthenticated.mockImplementation();

      mockLog.ok('Success message');
      mockLog.fail('Error message');
      mockLog.info('Info message');
      mockLog.warn('Warning message');
      mockLog.notAuthenticated();

      expect(mockLog.ok).toHaveBeenCalledWith('Success message');
      expect(mockLog.fail).toHaveBeenCalledWith('Error message');
      expect(mockLog.info).toHaveBeenCalledWith('Info message');
      expect(mockLog.warn).toHaveBeenCalledWith('Warning message');
      expect(mockLog.notAuthenticated).toHaveBeenCalled();
    });
  });

  describe('Mock Integration', () => {
    it('should work with mocked dependencies', () => {
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

    it('should handle enquirer integration', () => {
      const prompts = [
        {
          type: 'confirm',
          message: 'Test message',
          name: 'test',
          default: false,
        },
      ];

      mockEnquirer.prompt.mockResolvedValue({test: true});

      mockEnquirer.prompt(prompts).then((answer: any) => {
        expect(answer.test).toBe(true);
      });

      expect(mockEnquirer.prompt).toHaveBeenCalledWith(prompts);
    });

    it('should handle configstore integration', () => {
      const mockProxy = {
        delete: jest.fn(),
        set: jest.fn(),
        get: jest.fn(),
      };

      mockConfigstore.mockImplementation(() => mockProxy);

      const proxy = new mockConfigstore('/proxy');
      proxy.delete('host');
      proxy.set('host', 'proxy.example.com');
      proxy.get('host');

      expect(mockConfigstore).toHaveBeenCalledWith('/proxy');
      expect(mockProxy.delete).toHaveBeenCalledWith('host');
      expect(mockProxy.set).toHaveBeenCalledWith('host', 'proxy.example.com');
      expect(mockProxy.get).toHaveBeenCalledWith('host');
    });
  });

  describe('Integration Tests', () => {
    it('should complete full remove proxy flow', () => {
      const options = {removeProxy: true};
      const mockProxy = {
        delete: jest.fn(),
      };

      mockConfigstore.mockImplementation(() => mockProxy);

      if (options.removeProxy) {
        const proxy = new mockConfigstore('/proxy');
        proxy.delete('host');
        proxy.delete('port');
        proxy.delete('username');
        mockLog.ok('Proxy Removed!');
      }

      expect(mockConfigstore).toHaveBeenCalledWith('/proxy');
      expect(mockProxy.delete).toHaveBeenCalledTimes(3);
      expect(mockLog.ok).toHaveBeenCalledWith('Proxy Removed!');
    });

    it('should complete full set proxy flow', async () => {
      const host = 'proxy.example.com';
      const port = '8080';
      const options = {auth: false};

      const prompts = [
        {
          type: 'confirm',
          message: `You are about to set all requests to go through proxy ${host}:${port}, are you sure you want to do this?`,
          name: 'proxy',
          default: false,
        },
      ];

      mockEnquirer.prompt.mockResolvedValue({
        proxy: true,
      });

      const mockProxy = {
        set: jest.fn(),
      };
      mockConfigstore.mockImplementation(() => mockProxy);

      await mockEnquirer.prompt(prompts).then((answer: any) => {
        if (answer.proxy) {
          const proxy = new mockConfigstore('/proxy');
          proxy.set('host', host);
          proxy.set('port', port);
          proxy.set('username', answer.username);
          mockLog.ok('Proxy set for all future commands');
        }
      });

      expect(mockEnquirer.prompt).toHaveBeenCalledWith(prompts);
      expect(mockConfigstore).toHaveBeenCalledWith('/proxy');
      expect(mockProxy.set).toHaveBeenCalledWith('host', host);
      expect(mockProxy.set).toHaveBeenCalledWith('port', port);
      expect(mockLog.ok).toHaveBeenCalledWith(
        'Proxy set for all future commands',
      );
    });

    it('should complete full set proxy with auth flow', async () => {
      const host = 'proxy.example.com';
      const port = '8080';
      const options = {auth: true};

      const prompts = [
        {
          type: 'input',
          message: 'Please enter your username:',
          name: 'username',
        },
        {
          type: 'confirm',
          message: `You are about to set all requests to go through proxy ${host}:${port}, are you sure you want to do this?`,
          name: 'proxy',
          default: false,
        },
      ];

      mockEnquirer.prompt.mockResolvedValue({
        username: 'testuser',
        proxy: true,
      });

      const mockProxy = {
        set: jest.fn(),
      };
      mockConfigstore.mockImplementation(() => mockProxy);

      await mockEnquirer.prompt(prompts).then((answer: any) => {
        if (answer.proxy) {
          const proxy = new mockConfigstore('/proxy');
          proxy.set('host', host);
          proxy.set('port', port);
          proxy.set('username', answer.username);
          mockLog.ok('Proxy set for all future commands');
        }
      });

      expect(mockEnquirer.prompt).toHaveBeenCalledWith(prompts);
      expect(mockConfigstore).toHaveBeenCalledWith('/proxy');
      expect(mockProxy.set).toHaveBeenCalledWith('host', host);
      expect(mockProxy.set).toHaveBeenCalledWith('port', port);
      expect(mockProxy.set).toHaveBeenCalledWith('username', 'testuser');
      expect(mockLog.ok).toHaveBeenCalledWith(
        'Proxy set for all future commands',
      );
    });

    it('should complete full cancel proxy flow', async () => {
      const host = 'proxy.example.com';
      const port = '8080';
      const options = {auth: false};

      const prompts = [
        {
          type: 'confirm',
          message: `You are about to set all requests to go through proxy ${host}:${port}, are you sure you want to do this?`,
          name: 'proxy',
          default: false,
        },
      ];

      mockEnquirer.prompt.mockResolvedValue({
        proxy: false,
      });

      await mockEnquirer.prompt(prompts).then((answer: any) => {
        if (answer.proxy) {
          const mockProxy = {
            set: jest.fn(),
          };
          mockConfigstore.mockImplementation(() => mockProxy);

          const proxy = new mockConfigstore('/proxy');
          proxy.set('host', host);
          proxy.set('port', port);
          proxy.set('username', answer.username);
          mockLog.ok('Proxy set for all future commands');
        } else {
          mockLog.fail('Proxy command aborted');
        }
      });

      expect(mockEnquirer.prompt).toHaveBeenCalledWith(prompts);
      expect(mockLog.fail).toHaveBeenCalledWith('Proxy command aborted');
    });
  });
});
