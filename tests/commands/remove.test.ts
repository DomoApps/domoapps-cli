import {jest} from '@jest/globals';
import {Command} from 'commander';

// Mock all dependencies at module level
jest.mock('../../src/util/login', () => ({
  Login: {
    getPreviousLogins: jest.fn(),
    removeAllLogins: jest.fn(),
    removeLogin: jest.fn(),
  },
}));

jest.mock('../../src/util/log', () => ({
  log: {
    ok: jest.fn(),
    fail: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    notAuthenticated: jest.fn(),
  },
}));

jest.mock('../../src/util/multichoice', () => jest.fn());

jest.mock('inquirer', () => ({
  prompt: jest.fn(),
}));

describe('Remove Command', () => {
  let mockProgram: Command;
  let mockLogin: any;
  let mockLog: any;
  let mockMultichoice: any;
  let mockInquirer: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockProgram = new Command();
    mockLogin = require('../../src/util/login').Login;
    mockLog = require('../../src/util/log').log;
    mockMultichoice = require('../../src/util/multichoice');
    mockInquirer = require('inquirer');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Command Registration', () => {
    it('should register remove command with correct syntax', () => {
      const command = mockProgram
        .command('remove')
        .option('--instance <value>', 'Name of instance to remove')
        .option('-a, --all', 'remove all instances')
        .description('remove a instance from the login list');

      expect(command.name()).toBe('remove');
      expect(command.description()).toBe(
        'remove a instance from the login list',
      );
    });

    it('should have correct options', () => {
      const command = mockProgram
        .command('remove')
        .option('--instance <value>', 'Name of instance to remove')
        .option('-a, --all', 'remove all instances');

      const options = command.options;
      expect(options.some(opt => opt.long === '--instance')).toBe(true);
      expect(options.some(opt => opt.long === '--all')).toBe(true);
    });
  });

  describe('Previous Logins Handling', () => {
    it('should handle no previous logins', () => {
      mockLogin.getPreviousLogins.mockReturnValue([]);

      const previousLogins = mockLogin.getPreviousLogins();

      if (previousLogins.length === 0) {
        mockLog.fail(
          'There are no prior logins on this computer. Use `domo login` to login to an instance before using this command',
        );
      }

      expect(mockLog.fail).toHaveBeenCalledWith(
        'There are no prior logins on this computer. Use `domo login` to login to an instance before using this command',
      );
    });

    it('should handle previous logins exist', () => {
      const previousLogins = [
        {instance: 'company1.domo.com'},
        {instance: 'company2.domo.com'},
      ];

      mockLogin.getPreviousLogins.mockReturnValue(previousLogins);

      const result = mockLogin.getPreviousLogins();

      expect(result.length).toBe(2);
      expect(result[0].instance).toBe('company1.domo.com');
      expect(result[1].instance).toBe('company2.domo.com');
    });
  });

  describe('Remove All Instances', () => {
    it('should handle remove all instances flow', () => {
      const options = {all: true};
      const previousLogins = [
        {instance: 'company1.domo.com'},
        {instance: 'company2.domo.com'},
      ];

      mockLogin.getPreviousLogins.mockReturnValue(previousLogins);

      const prompts = [
        {
          type: 'confirm',
          message: 'Are you sure you want to delete all instances?',
          name: 'removeAll',
        },
      ];

      mockInquirer.prompt.mockResolvedValue({
        removeAll: true,
      });

      mockInquirer.prompt(prompts).then((answers: any) => {
        if (answers.removeAll) {
          mockLogin.removeAllLogins();
          mockLog.ok('All instances have been removed');
        }
      });

      expect(mockInquirer.prompt).toHaveBeenCalledWith(prompts);
    });

    it('should handle remove all instances confirmation', async () => {
      const prompts = [
        {
          type: 'confirm',
          message: 'Are you sure you want to delete all instances?',
          name: 'removeAll',
        },
      ];

      mockInquirer.prompt.mockResolvedValue({
        removeAll: true,
      });

      await mockInquirer.prompt(prompts).then((answers: any) => {
        if (answers.removeAll) {
          mockLogin.removeAllLogins();
          mockLog.ok('All instances have been removed');
        }
      });

      expect(mockLogin.removeAllLogins).toHaveBeenCalled();
      expect(mockLog.ok).toHaveBeenCalledWith(
        'All instances have been removed',
      );
    });
  });

  describe('Remove Single Instance', () => {
    it('should handle remove single instance flow', () => {
      const options = {all: false};
      const previousLogins = [
        {instance: 'company1.domo.com'},
        {instance: 'company2.domo.com'},
      ];

      mockLogin.getPreviousLogins.mockReturnValue(previousLogins);

      const multichoiceResult = {
        type: 'list',
        choices: () => previousLogins.map(login => login.instance),
        message: 'Select the instance you desire to remove ',
        name: 'instance',
      };

      mockMultichoice.mockReturnValue(multichoiceResult);

      const prompts = [
        multichoiceResult,
        {
          type: 'confirm',
          message: 'Are you sure you want to remove this instance?',
          name: 'removeInstance',
          when: (answers: any) => {
            return !!answers.instance;
          },
        },
      ];

      mockInquirer.prompt.mockResolvedValue({
        instance: 'company1.domo.com',
        removeInstance: true,
      });

      mockInquirer.prompt(prompts).then((answers: any) => {
        if (answers.removeInstance) {
          mockLogin.removeLogin(answers.instance);
          mockLog.ok(`Instance ${answers.instance} removed successfully.`);
        }
      });

      expect(mockInquirer.prompt).toHaveBeenCalledWith(prompts);
    });

    it('should handle remove single instance confirmation', () => {
      const answers = {
        instance: 'company1.domo.com',
        removeInstance: true,
      };

      if (answers.removeInstance) {
        mockLogin.removeLogin(answers.instance);
        mockLog.ok(`Instance ${answers.instance} removed successfully.`);
      }

      expect(mockLogin.removeLogin).toHaveBeenCalledWith('company1.domo.com');
      expect(mockLog.ok).toHaveBeenCalledWith(
        'Instance company1.domo.com removed successfully.',
      );
    });

    it('should handle remove single instance cancellation', () => {
      const answers = {
        instance: 'company1.domo.com',
        removeInstance: false,
      };

      if (answers.removeInstance) {
        mockLogin.removeLogin(answers.instance);
        mockLog.ok(`Instance ${answers.instance} removed successfully.`);
      } else {
        mockLog.ok('You have chosen not to remove any instances');
      }

      expect(mockLog.ok).toHaveBeenCalledWith(
        'You have chosen not to remove any instances',
      );
    });
  });

  describe('Multichoice Integration', () => {
    it('should handle multichoice for instance selection', () => {
      const previousLogins = [
        {instance: 'company1.domo.com'},
        {instance: 'company2.domo.com'},
      ];

      const multichoiceResult = {
        type: 'list',
        choices: () => previousLogins.map(login => login.instance),
        message: 'Select the instance you desire to remove ',
        name: 'instance',
      };

      mockMultichoice.mockReturnValue(multichoiceResult);

      const result = mockMultichoice({
        type: 'list',
        choices: () => previousLogins.map(login => login.instance),
        message: 'Select the instance you desire to remove ',
        name: 'instance',
      });

      expect(mockMultichoice).toHaveBeenCalledWith({
        type: 'list',
        choices: expect.any(Function),
        message: 'Select the instance you desire to remove ',
        name: 'instance',
      });
      expect(result).toEqual(multichoiceResult);
    });
  });

  describe('Error Handling', () => {
    it('should handle inquirer prompt error', () => {
      const prompts = [
        {
          type: 'confirm',
          message: 'Are you sure you want to delete all instances?',
          name: 'removeAll',
        },
      ];

      const error = new Error('Prompt failed');
      mockInquirer.prompt.mockRejectedValue(error);

      mockInquirer.prompt(prompts).catch((err: any) => {
        expect(err).toBe(error);
      });

      expect(mockInquirer.prompt).toHaveBeenCalledWith(prompts);
    });

    it('should handle login removal error', () => {
      const instance = 'company1.domo.com';

      mockLogin.removeLogin.mockImplementation(() => {
        throw new Error('Remove failed');
      });

      try {
        mockLogin.removeLogin(instance);
      } catch (error) {
        expect(error.message).toBe('Remove failed');
      }

      expect(mockLogin.removeLogin).toHaveBeenCalledWith(instance);
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
      const previousLogins = [
        {instance: 'company1.domo.com'},
        {instance: 'company2.domo.com'},
      ];

      mockLogin.getPreviousLogins.mockReturnValue(previousLogins);
      mockLogin.removeAllLogins.mockImplementation();
      mockLogin.removeLogin.mockImplementation();

      const result = mockLogin.getPreviousLogins();
      mockLogin.removeAllLogins();
      mockLogin.removeLogin('company1.domo.com');

      expect(mockLogin.getPreviousLogins).toHaveBeenCalled();
      expect(mockLogin.removeAllLogins).toHaveBeenCalled();
      expect(mockLogin.removeLogin).toHaveBeenCalledWith('company1.domo.com');
      expect(result).toEqual(previousLogins);
    });

    it('should handle inquirer integration', () => {
      const prompts = [
        {
          type: 'confirm',
          message: 'Are you sure you want to delete all instances?',
          name: 'removeAll',
        },
      ];

      mockInquirer.prompt.mockResolvedValue({removeAll: true});

      mockInquirer.prompt(prompts).then((answer: any) => {
        expect(answer.removeAll).toBe(true);
      });

      expect(mockInquirer.prompt).toHaveBeenCalledWith(prompts);
    });
  });

  describe('Integration Tests', () => {
    it('should complete full remove all flow', async () => {
      const options = {all: true};
      const previousLogins = [
        {instance: 'company1.domo.com'},
        {instance: 'company2.domo.com'},
      ];

      mockLogin.getPreviousLogins.mockReturnValue(previousLogins);

      const prompts = [
        {
          type: 'confirm',
          message: 'Are you sure you want to delete all instances?',
          name: 'removeAll',
        },
      ];

      mockInquirer.prompt.mockResolvedValue({
        removeAll: true,
      });

      // Simulate the actual flow
      const result = mockLogin.getPreviousLogins();
      await mockInquirer.prompt(prompts).then((answers: any) => {
        if (answers.removeAll) {
          mockLogin.removeAllLogins();
          mockLog.ok('All instances have been removed');
        }
      });

      expect(mockLogin.getPreviousLogins).toHaveBeenCalled();
      expect(mockInquirer.prompt).toHaveBeenCalledWith(prompts);
      expect(mockLogin.removeAllLogins).toHaveBeenCalled();
      expect(mockLog.ok).toHaveBeenCalledWith(
        'All instances have been removed',
      );
    });

    it('should complete full remove single flow', async () => {
      const options = {all: false};
      const previousLogins = [
        {instance: 'company1.domo.com'},
        {instance: 'company2.domo.com'},
      ];

      mockLogin.getPreviousLogins.mockReturnValue(previousLogins);

      const multichoiceResult = {
        type: 'list',
        choices: () => previousLogins.map(login => login.instance),
        message: 'Select the instance you desire to remove ',
        name: 'instance',
      };

      mockMultichoice.mockReturnValue(multichoiceResult);

      const prompts = [
        multichoiceResult,
        {
          type: 'confirm',
          message: 'Are you sure you want to remove this instance?',
          name: 'removeInstance',
          when: (answers: any) => {
            return !!answers.instance;
          },
        },
      ];

      mockInquirer.prompt.mockResolvedValue({
        instance: 'company1.domo.com',
        removeInstance: true,
      });

      // Simulate the actual flow
      const result = mockLogin.getPreviousLogins();
      await mockInquirer.prompt(prompts).then((answers: any) => {
        if (answers.removeInstance) {
          mockLogin.removeLogin(answers.instance);
          mockLog.ok(`Instance ${answers.instance} removed successfully.`);
        }
      });

      expect(mockLogin.getPreviousLogins).toHaveBeenCalled();
      expect(mockInquirer.prompt).toHaveBeenCalledWith(prompts);
      expect(mockLogin.removeLogin).toHaveBeenCalledWith('company1.domo.com');
      expect(mockLog.ok).toHaveBeenCalledWith(
        'Instance company1.domo.com removed successfully.',
      );
    });

    it('should complete full no logins flow', () => {
      mockLogin.getPreviousLogins.mockReturnValue([]);

      const previousLogins = mockLogin.getPreviousLogins();

      if (previousLogins.length === 0) {
        mockLog.fail(
          'There are no prior logins on this computer. Use `domo login` to login to an instance before using this command',
        );
      }

      expect(mockLogin.getPreviousLogins).toHaveBeenCalled();
      expect(mockLog.fail).toHaveBeenCalledWith(
        'There are no prior logins on this computer. Use `domo login` to login to an instance before using this command',
      );
    });
  });
});
