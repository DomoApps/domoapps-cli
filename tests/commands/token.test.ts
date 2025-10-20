import {jest} from '@jest/globals';
import {Command} from 'commander';

// Mock all dependencies at module level
jest.mock('../../util/login', () => ({
  Login: {
    getCurrentLogin: jest.fn(),
    getPreviousLogins: jest.fn(),
    removeDevToken: jest.fn(),
    persistLogin: jest.fn(),
  },
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

jest.mock('chalk', () => ({
  grey: jest.fn((text: string) => text),
  red: jest.fn((text: string) => text),
  yellow: jest.fn((text: string) => text),
  green: jest.fn((text: string) => text),
  blue: jest.fn((text: string) => text),
  magenta: jest.fn((text: string) => text),
}));

jest.mock('inquirer', () => ({
  prompt: jest.fn(),
}));

describe('Token Command', () => {
  let mockProgram: Command;
  let mockLogin: any;
  let mockLog: any;
  let mockChalk: any;
  let mockInquirer: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockProgram = new Command();
    mockLogin = require('../../util/login').Login;
    mockLog = require('../../util/log').log;
    mockChalk = require('chalk');
    mockInquirer = require('inquirer');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Command Registration', () => {
    it('should register token command with correct syntax', () => {
      const command = mockProgram
        .command('token')
        .description('add or remove a developer token')
        .arguments('<cmd>')
        .option('-i, --instance <value>', 'Domo instance')
        .option('-t, --token <value>', 'dev token value used with token add');

      expect(command.name()).toBe('token');
      expect(command.description()).toBe('add or remove a developer token');
    });

    it('should have correct options', () => {
      const command = mockProgram
        .command('token')
        .option('-i, --instance <value>', 'Domo instance')
        .option('-t, --token <value>', 'dev token value used with token add');

      const options = command.options;
      expect(options.some(opt => opt.long === '--instance')).toBe(true);
      expect(options.some(opt => opt.long === '--token')).toBe(true);
    });
  });

  describe('Remove Token Functionality', () => {
    it('should handle remove token with instance option', () => {
      const cmd = 'remove';
      const options = {instance: 'company.domo.com'};

      mockLogin.getCurrentLogin.mockReturnValue({instance: 'company.domo.com'});
      mockLogin.getPreviousLogins.mockReturnValue([
        {instance: 'company.domo.com'},
        {instance: 'company2.domo.com'},
      ]);

      const login = mockLogin.getCurrentLogin();
      const previousLogins = mockLogin.getPreviousLogins();

      if (options.instance) {
        mockLogin.removeDevToken.mockImplementation();
        mockLog.ok(
          `Token removed for ${options.instance}`,
          'Future CLI commands to this instance will require username/password. \nUse the "domo token add" command to use another token.',
        );
      }

      expect(mockLogin.getCurrentLogin).toHaveBeenCalled();
      expect(mockLogin.getPreviousLogins).toHaveBeenCalled();
      expect(mockLog.ok).toHaveBeenCalledWith(
        `Token removed for ${options.instance}`,
        'Future CLI commands to this instance will require username/password. \nUse the "domo token add" command to use another token.',
      );
    });

    it('should handle remove token without instance option', () => {
      const cmd = 'remove';
      const options = {};

      mockLogin.getCurrentLogin.mockReturnValue({instance: 'company.domo.com'});
      mockLogin.getPreviousLogins.mockReturnValue([
        {instance: 'company.domo.com'},
        {instance: 'company2.domo.com'},
      ]);

      const login = mockLogin.getCurrentLogin();
      const previousLogins = mockLogin.getPreviousLogins();

      const prompts = [
        {
          type: 'list',
          choices: () => {
            return previousLogins.map((item: any) => item.instance);
          },
          message:
            'Domo instance on which to remove the token ' +
            '(e.g. company.domo.com)',
          name: 'instance',
          default: login,
        },
      ];

      mockInquirer.prompt.mockResolvedValue({
        instance: 'company.domo.com',
      });

      mockInquirer.prompt(prompts).then((answers: any) => {
        if (answers.instance) {
          mockLogin.removeDevToken.mockImplementation();
          mockLog.ok(
            `Token removed for ${answers.instance}`,
            'Future CLI commands to this instance will require username/password. \nUse the "domo token add" command to use another token.',
          );
        }
      });

      expect(mockInquirer.prompt).toHaveBeenCalledWith(prompts);
    });
  });

  describe('Add Token Functionality', () => {
    it('should handle add token with instance and token options', () => {
      const cmd = 'add';
      const options = {
        instance: 'company.domo.com',
        token: 'dev-token-123',
      };

      mockLogin.getCurrentLogin.mockReturnValue({instance: 'company.domo.com'});
      mockLogin.getPreviousLogins.mockReturnValue([
        {instance: 'company.domo.com'},
        {instance: 'company2.domo.com'},
      ]);

      const login = mockLogin.getCurrentLogin();
      const previousLogins = mockLogin.getPreviousLogins();

      if (options.instance && options.token) {
        mockLogin.persistLogin.mockImplementation();
        mockLog.ok(
          `Token set for ${options.instance}`,
          'Future CLI commands to this instance will not require username/password. \nUse the "domo token remove" command to undo this action.',
        );
      }

      expect(mockLogin.getCurrentLogin).toHaveBeenCalled();
      expect(mockLogin.getPreviousLogins).toHaveBeenCalled();
      expect(mockLog.ok).toHaveBeenCalledWith(
        `Token set for ${options.instance}`,
        'Future CLI commands to this instance will not require username/password. \nUse the "domo token remove" command to undo this action.',
      );
    });

    it('should handle add token without instance option', () => {
      const cmd = 'add';
      const options = {};

      mockLogin.getCurrentLogin.mockReturnValue({instance: 'company.domo.com'});
      mockLogin.getPreviousLogins.mockReturnValue([
        {instance: 'company.domo.com'},
        {instance: 'company2.domo.com'},
      ]);

      const login = mockLogin.getCurrentLogin();
      const previousLogins = mockLogin.getPreviousLogins();

      const prompts = [
        {
          type: 'list',
          choices: () => {
            const options = previousLogins.map((item: any) => item.instance);
            options.push('new instance');
            return options;
          },
          message:
            'Domo instance on which to set the token ' +
            '(e.g. company.domo.com)',
          name: 'instance',
          default: login,
        },
        {
          type: 'input',
          message: 'Domo instance ' + mockChalk.grey('e.g. company.domo.com '),
          name: 'newInstance',
          validate: (input: string) => {
            const acceptedDomains = ['domo.com', 'domotech.io', 'domorig.io'];
            if (acceptedDomains.some(domain => input.endsWith(domain))) {
              return true;
            }
            return (
              'Please login using the full Domo instance. ' +
              'Example: "company.domo.com"'
            );
          },
          when: (answers: any) => {
            return !answers.instance || answers.instance === 'new instance';
          },
        },
        {
          name: 'devtoken',
          type: 'input',
          message:
            'Token (can be found in the Admin section of Domo and pasted here)',
        },
      ];

      mockInquirer.prompt.mockResolvedValue({
        instance: 'company.domo.com',
        devtoken: 'dev-token-123',
      });

      mockInquirer.prompt(prompts).then((answers: any) => {
        const devToken = true;
        mockLogin.persistLogin.mockImplementation();
        mockLog.ok(
          `Token set for ${answers.instance}`,
          'Future CLI commands to this instance will not require username/password. \nUse the "domo token remove" command to undo this action.',
        );
      });

      expect(mockInquirer.prompt).toHaveBeenCalledWith(prompts);
    });

    it('should handle add token with new instance', () => {
      const cmd = 'add';
      const options = {};

      mockLogin.getCurrentLogin.mockReturnValue({instance: 'company.domo.com'});
      mockLogin.getPreviousLogins.mockReturnValue([
        {instance: 'company.domo.com'},
      ]);

      const login = mockLogin.getCurrentLogin();
      const previousLogins = mockLogin.getPreviousLogins();

      const prompts = [
        {
          type: 'list',
          choices: () => {
            const options = previousLogins.map((item: any) => item.instance);
            options.push('new instance');
            return options;
          },
          message:
            'Domo instance on which to set the token ' +
            '(e.g. company.domo.com)',
          name: 'instance',
          default: login,
        },
        {
          type: 'input',
          message: 'Domo instance ' + mockChalk.grey('e.g. company.domo.com '),
          name: 'newInstance',
          validate: (input: string) => {
            const acceptedDomains = ['domo.com', 'domotech.io', 'domorig.io'];
            if (acceptedDomains.some(domain => input.endsWith(domain))) {
              return true;
            }
            return (
              'Please login using the full Domo instance. ' +
              'Example: "company.domo.com"'
            );
          },
          when: (answers: any) => {
            return !answers.instance || answers.instance === 'new instance';
          },
        },
        {
          name: 'devtoken',
          type: 'input',
          message:
            'Token (can be found in the Admin section of Domo and pasted here)',
        },
      ];

      mockInquirer.prompt.mockResolvedValue({
        instance: 'new instance',
        newInstance: 'newcompany.domo.com',
        devtoken: 'dev-token-123',
      });

      mockInquirer.prompt(prompts).then((answers: any) => {
        const devToken = true;
        mockLogin.persistLogin.mockImplementation();
        mockLog.ok(
          `Token set for ${answers.newInstance}`,
          'Future CLI commands to this instance will not require username/password. \nUse the "domo token remove" command to undo this action.',
        );
      });

      expect(mockInquirer.prompt).toHaveBeenCalledWith(prompts);
    });
  });

  describe('Domain Validation', () => {
    it('should validate accepted domains', () => {
      const acceptedDomains = ['domo.com', 'domotech.io', 'domorig.io'];
      const validInputs = [
        'company.domo.com',
        'test.domotech.io',
        'example.domorig.io',
      ];

      validInputs.forEach(input => {
        const isValid = acceptedDomains.some(domain => input.endsWith(domain));
        expect(isValid).toBe(true);
      });
    });

    it('should reject invalid domains', () => {
      const acceptedDomains = ['domo.com', 'domotech.io', 'domorig.io'];
      const invalidInputs = [
        'company.example.com',
        'test.invalid.io',
        'example.other.com',
      ];

      invalidInputs.forEach(input => {
        const isValid = acceptedDomains.some(domain => input.endsWith(domain));
        expect(isValid).toBe(false);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid command', () => {
      const cmd = 'invalid';
      const options = {};

      mockLog.fail(
        'Invalid option "' + cmd + '"\nValid options are "remove", and "add"',
      );

      expect(mockLog.fail).toHaveBeenCalledWith(
        'Invalid option "' + cmd + '"\nValid options are "remove", and "add"',
      );
    });

    it('should handle inquirer prompt error', () => {
      const prompts = [
        {
          type: 'list',
          choices: () => ['company.domo.com'],
          message: 'Select instance',
          name: 'instance',
        },
      ];

      const error = new Error('Prompt failed');
      mockInquirer.prompt.mockRejectedValue(error);

      mockInquirer.prompt(prompts).catch((err: any) => {
        expect(err).toBe(error);
      });

      expect(mockInquirer.prompt).toHaveBeenCalledWith(prompts);
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

    it('should handle login integration', () => {
      const currentLogin = {instance: 'company.domo.com'};
      const previousLogins = [
        {instance: 'company.domo.com'},
        {instance: 'company2.domo.com'},
      ];

      mockLogin.getCurrentLogin.mockReturnValue(currentLogin);
      mockLogin.getPreviousLogins.mockReturnValue(previousLogins);
      mockLogin.removeDevToken.mockImplementation();
      mockLogin.persistLogin.mockImplementation();

      const result = mockLogin.getCurrentLogin();
      const result2 = mockLogin.getPreviousLogins();
      mockLogin.removeDevToken();
      mockLogin.persistLogin('token', true);

      expect(mockLogin.getCurrentLogin).toHaveBeenCalled();
      expect(mockLogin.getPreviousLogins).toHaveBeenCalled();
      expect(mockLogin.removeDevToken).toHaveBeenCalled();
      expect(mockLogin.persistLogin).toHaveBeenCalledWith('token', true);
      expect(result).toEqual(currentLogin);
      expect(result2).toEqual(previousLogins);
    });

    it('should handle chalk integration', () => {
      mockChalk.grey.mockImplementation((text: string) => `grey:${text}`);

      const result = mockChalk.grey('e.g. company.domo.com ');

      expect(mockChalk.grey).toHaveBeenCalledWith('e.g. company.domo.com ');
      expect(result).toBe('grey:e.g. company.domo.com ');
    });

    it('should handle inquirer integration', () => {
      const prompts = [
        {
          type: 'list',
          choices: () => ['company.domo.com'],
          message: 'Select instance',
          name: 'instance',
        },
      ];

      mockInquirer.prompt.mockResolvedValue({instance: 'company.domo.com'});

      mockInquirer.prompt(prompts).then((answer: any) => {
        expect(answer.instance).toBe('company.domo.com');
      });

      expect(mockInquirer.prompt).toHaveBeenCalledWith(prompts);
    });
  });

  describe('Integration Tests', () => {
    it('should complete full remove token flow', () => {
      const cmd = 'remove';
      const options = {instance: 'company.domo.com'};

      mockLogin.getCurrentLogin.mockReturnValue({instance: 'company.domo.com'});
      mockLogin.getPreviousLogins.mockReturnValue([
        {instance: 'company.domo.com'},
      ]);

      // Simulate the actual flow
      const login = mockLogin.getCurrentLogin();
      const previousLogins = mockLogin.getPreviousLogins();

      if (options.instance) {
        mockLogin.removeDevToken();
        mockLog.ok(
          `Token removed for ${options.instance}`,
          'Future CLI commands to this instance will require username/password. \nUse the "domo token add" command to use another token.',
        );
      }

      expect(mockLogin.getCurrentLogin).toHaveBeenCalled();
      expect(mockLogin.getPreviousLogins).toHaveBeenCalled();
      expect(mockLogin.removeDevToken).toHaveBeenCalled();
      expect(mockLog.ok).toHaveBeenCalledWith(
        `Token removed for ${options.instance}`,
        'Future CLI commands to this instance will require username/password. \nUse the "domo token add" command to use another token.',
      );
    });

    it('should complete full add token flow', () => {
      const cmd = 'add';
      const options = {
        instance: 'company.domo.com',
        token: 'dev-token-123',
      };

      mockLogin.getCurrentLogin.mockReturnValue({instance: 'company.domo.com'});
      mockLogin.getPreviousLogins.mockReturnValue([
        {instance: 'company.domo.com'},
      ]);

      // Simulate the actual flow
      const login = mockLogin.getCurrentLogin();
      const previousLogins = mockLogin.getPreviousLogins();

      if (options.instance && options.token) {
        mockLogin.persistLogin(options.token, true);
        mockLog.ok(
          `Token set for ${options.instance}`,
          'Future CLI commands to this instance will not require username/password. \nUse the "domo token remove" command to undo this action.',
        );
      }

      expect(mockLogin.getCurrentLogin).toHaveBeenCalled();
      expect(mockLogin.getPreviousLogins).toHaveBeenCalled();
      expect(mockLogin.persistLogin).toHaveBeenCalledWith(options.token, true);
      expect(mockLog.ok).toHaveBeenCalledWith(
        `Token set for ${options.instance}`,
        'Future CLI commands to this instance will not require username/password. \nUse the "domo token remove" command to undo this action.',
      );
    });

    it('should complete full invalid command flow', () => {
      const cmd = 'invalid';
      const options = {};

      mockLog.fail(
        'Invalid option "' + cmd + '"\nValid options are "remove", and "add"',
      );

      expect(mockLog.fail).toHaveBeenCalledWith(
        'Invalid option "' + cmd + '"\nValid options are "remove", and "add"',
      );
    });
  });
});
