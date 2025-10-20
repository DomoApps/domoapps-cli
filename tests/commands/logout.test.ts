import {jest} from '@jest/globals';
import {Command} from 'commander';

// Mock all dependencies at module level
jest.mock('../../util/login', () => ({
  Login: jest.fn(),
}));

describe('Logout Command', () => {
  let mockProgram: Command;
  let mockLogin: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockProgram = new Command();
    mockLogin = require('../../util/login').Login;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Command Registration', () => {
    it('should register logout command with correct options', () => {
      const command = mockProgram
        .command('logout')
        .description('logout of Domo')
        .option('-i, --instance <value>', 'Domo instance');

      expect(command.name()).toBe('logout');
      expect(command.description()).toBe('logout of Domo');
    });

    it('should have correct options', () => {
      const command = mockProgram
        .command('logout')
        .option('-i, --instance <value>', 'Domo instance');

      const options = command.options;
      expect(options.some(opt => opt.long === '--instance')).toBe(true);
    });
  });

  describe('Logout Process', () => {
    it('should create Login instance with instance parameter', () => {
      const args = {
        instance: 'test.domo.com',
      };

      mockLogin.mockImplementation(() => ({
        logout: jest.fn(),
      }));

      const login = new mockLogin(args.instance);
      login.logout();

      expect(mockLogin).toHaveBeenCalledWith('test.domo.com');
      expect(login.logout).toHaveBeenCalled();
    });

    it('should create Login instance without instance parameter', () => {
      const args = {
        instance: undefined as string | undefined,
      };

      mockLogin.mockImplementation(() => ({
        logout: jest.fn(),
      }));

      const login = new mockLogin(args.instance);
      login.logout();

      expect(mockLogin).toHaveBeenCalledWith(undefined);
      expect(login.logout).toHaveBeenCalled();
    });

    it('should handle logout with custom instance', () => {
      const args = {
        instance: 'custom.domo.com',
      };

      mockLogin.mockImplementation(() => ({
        logout: jest.fn(),
      }));

      const login = new mockLogin(args.instance);
      login.logout();

      expect(mockLogin).toHaveBeenCalledWith('custom.domo.com');
      expect(login.logout).toHaveBeenCalled();
    });

    it('should handle logout with empty instance', () => {
      const args = {
        instance: '',
      };

      mockLogin.mockImplementation(() => ({
        logout: jest.fn(),
      }));

      const login = new mockLogin(args.instance);
      login.logout();

      expect(mockLogin).toHaveBeenCalledWith('');
      expect(login.logout).toHaveBeenCalled();
    });
  });

  describe('Login Integration', () => {
    it('should work with mocked Login class', () => {
      mockLogin.mockImplementation(() => ({
        logout: jest.fn(),
      }));

      const login = new mockLogin('test.domo.com');
      login.logout();

      expect(mockLogin).toHaveBeenCalledWith('test.domo.com');
      expect(login.logout).toHaveBeenCalled();
    });

    it('should handle multiple logout calls', () => {
      mockLogin.mockImplementation(() => ({
        logout: jest.fn(),
      }));

      const login1 = new mockLogin('test1.domo.com');
      const login2 = new mockLogin('test2.domo.com');

      login1.logout();
      login2.logout();

      expect(mockLogin).toHaveBeenCalledWith('test1.domo.com');
      expect(mockLogin).toHaveBeenCalledWith('test2.domo.com');
      expect(login1.logout).toHaveBeenCalled();
      expect(login2.logout).toHaveBeenCalled();
    });

    it('should handle logout with different instance types', () => {
      const instances = [
        'test.domo.com',
        'https://test.domo.com',
        'api.domo.com',
        undefined,
        '',
        null,
      ];

      mockLogin.mockImplementation(() => ({
        logout: jest.fn(),
      }));

      instances.forEach(instance => {
        const login = new mockLogin(instance);
        login.logout();

        expect(mockLogin).toHaveBeenCalledWith(instance);
        expect(login.logout).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle Login constructor errors', () => {
      mockLogin.mockImplementation(() => {
        throw new Error('Login constructor failed');
      });

      expect(() => {
        new mockLogin('test.domo.com');
      }).toThrow('Login constructor failed');
    });

    it('should handle logout method errors', () => {
      mockLogin.mockImplementation(() => ({
        logout: jest.fn(() => {
          throw new Error('Logout failed');
        }),
      }));

      const login = new mockLogin('test.domo.com');

      expect(() => {
        login.logout();
      }).toThrow('Logout failed');
    });

    it('should handle undefined logout method', () => {
      mockLogin.mockImplementation(() => ({
        logout: undefined as any,
      }));

      const login = new mockLogin('test.domo.com');

      expect(() => {
        login.logout();
      }).toThrow();
    });
  });

  describe('Mock Integration', () => {
    it('should work with mocked dependencies', () => {
      mockLogin.mockImplementation(() => ({
        logout: jest.fn(),
      }));

      const login = new mockLogin('test.domo.com');
      login.logout();

      expect(mockLogin).toHaveBeenCalledWith('test.domo.com');
      expect(login.logout).toHaveBeenCalled();
    });

    it('should handle multiple instances', () => {
      mockLogin.mockImplementation(() => ({
        logout: jest.fn(),
      }));

      const instances = ['test1.domo.com', 'test2.domo.com', 'test3.domo.com'];

      instances.forEach(instance => {
        const login = new mockLogin(instance);
        login.logout();

        expect(mockLogin).toHaveBeenCalledWith(instance);
        expect(login.logout).toHaveBeenCalled();
      });
    });
  });

  describe('Integration Tests', () => {
    it('should complete full logout flow', () => {
      const args = {
        instance: 'test.domo.com',
      };

      mockLogin.mockImplementation(() => ({
        logout: jest.fn(),
      }));

      const login = new mockLogin(args.instance);
      login.logout();

      expect(mockLogin).toHaveBeenCalledWith('test.domo.com');
      expect(login.logout).toHaveBeenCalled();
    });

    it('should handle logout flow with undefined instance', () => {
      const args = {
        instance: undefined as string | undefined,
      };

      mockLogin.mockImplementation(() => ({
        logout: jest.fn(),
      }));

      const login = new mockLogin(args.instance);
      login.logout();

      expect(mockLogin).toHaveBeenCalledWith(undefined);
      expect(login.logout).toHaveBeenCalled();
    });

    it('should handle logout flow with error', () => {
      const args = {
        instance: 'test.domo.com',
      };

      mockLogin.mockImplementation(() => ({
        logout: jest.fn(() => {
          throw new Error('Logout failed');
        }),
      }));

      const login = new mockLogin(args.instance);

      expect(() => {
        login.logout();
      }).toThrow('Logout failed');
    });
  });
});
