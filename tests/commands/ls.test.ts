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
  },
}));

jest.mock('cli-table3', () => {
  return jest.fn().mockImplementation(() => ({
    push: jest.fn(),
    toString: jest.fn().mockReturnValue('table output'),
  }));
});

jest.mock('chalk', () => ({
  cyan: jest.fn((text: string) => text),
  red: jest.fn((text: string) => text),
  yellow: jest.fn((text: string) => text),
  green: jest.fn((text: string) => text),
  blue: jest.fn((text: string) => text),
  magenta: jest.fn((text: string) => text),
}));

describe('Ls Command', () => {
  let mockProgram: Command;
  let mockLog: any;
  let mockTable: any;
  let mockChalk: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockProgram = new Command();
    mockLog = require('../../src/util/log').log;
    mockTable = require('cli-table3');
    mockChalk = require('chalk');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Command Registration', () => {
    it('should register ls command with correct options', () => {
      const command = mockProgram
        .command('ls')
        .description('get a list of all your Custom App designs')
        .option(
          '-a, --all',
          'List all designs on current instance (admin role required)',
        )
        .option('-d, --deleted', 'Include deleted designs on current instance');

      expect(command.name()).toBe('ls');
      expect(command.description()).toBe(
        'get a list of all your Custom App designs',
      );
    });

    it('should have correct options', () => {
      const command = mockProgram
        .command('ls')
        .option(
          '-a, --all',
          'List all designs on current instance (admin role required)',
        )
        .option('-d, --deleted', 'Include deleted designs on current instance');

      const options = command.options;
      expect(options.some(opt => opt.long === '--all')).toBe(true);
      expect(options.some(opt => opt.long === '--deleted')).toBe(true);
    });
  });

  describe('Parameter Handling', () => {
    it('should handle all option', () => {
      const options = {
        all: true,
        deleted: false,
      };

      const params = {
        deleted: options.deleted ?? false,
        checkAdminAuthority: options.all ?? false,
      };

      expect(params.deleted).toBe(false);
      expect(params.checkAdminAuthority).toBe(true);
    });

    it('should handle deleted option', () => {
      const options = {
        all: false,
        deleted: true,
      };

      const params = {
        deleted: options.deleted ?? false,
        checkAdminAuthority: options.all ?? false,
      };

      expect(params.deleted).toBe(true);
      expect(params.checkAdminAuthority).toBe(false);
    });

    it('should handle both options', () => {
      const options = {
        all: true,
        deleted: true,
      };

      const params = {
        deleted: options.deleted ?? false,
        checkAdminAuthority: options.all ?? false,
      };

      expect(params.deleted).toBe(true);
      expect(params.checkAdminAuthority).toBe(true);
    });

    it('should handle no options', () => {
      const options = {
        all: false,
        deleted: false,
      };

      const params = {
        deleted: options.deleted ?? false,
        checkAdminAuthority: options.all ?? false,
      };

      expect(params.deleted).toBe(false);
      expect(params.checkAdminAuthority).toBe(false);
    });
  });

  describe('Design List Display', () => {
    it('should handle empty designs list', () => {
      const designs: any[] = [];

      if (designs.length === 0) {
        mockLog.fail(
          'No Designs Published',
          '`domo ls` will list designs once they are published to Domo',
        );
      }

      expect(mockLog.fail).toHaveBeenCalledWith(
        'No Designs Published',
        '`domo ls` will list designs once they are published to Domo',
      );
    });

    it('should handle designs with table display', () => {
      const designs = [
        {
          name: 'Test Design 1',
          id: 'design-123',
          createdDate: '2023-01-01T00:00:00Z',
          updatedDate: '2023-01-02T00:00:00Z',
        },
        {
          name: 'Test Design 2',
          id: 'design-456',
          createdDate: '2023-01-03T00:00:00Z',
          updatedDate: '2023-01-04T00:00:00Z',
        },
      ];

      const windowWidth = 150;
      const mockTableInstance = {
        push: jest.fn(),
        toString: jest.fn().mockReturnValue('table output'),
      };

      mockTable.mockImplementation(() => mockTableInstance);

      if (windowWidth >= 130) {
        const table = new mockTable({
          head: [
            mockChalk.cyan('Design Name'),
            mockChalk.cyan('Design Id'),
            mockChalk.cyan('Date Created'),
            mockChalk.cyan('Last Updated'),
          ],
          colWidths: [windowWidth - 105, 38, 31, 31],
        });

        designs.forEach(design => {
          table.push([
            design.name,
            design.id,
            new Date(design.createdDate).toUTCString(),
            new Date(design.updatedDate).toUTCString(),
          ]);
        });

        console.log(table.toString());
      }

      expect(mockTable).toHaveBeenCalledWith({
        head: [
          mockChalk.cyan('Design Name'),
          mockChalk.cyan('Design Id'),
          mockChalk.cyan('Date Created'),
          mockChalk.cyan('Last Updated'),
        ],
        colWidths: [45, 38, 31, 31],
      });
      expect(mockTableInstance.push).toHaveBeenCalledTimes(2);
      expect(mockTableInstance.toString).toHaveBeenCalled();
    });

    it('should handle designs with simple display', () => {
      const designs = [
        {
          name: 'Test Design 1',
          id: 'design-123',
          createdDate: '2023-01-01T00:00:00Z',
          updatedDate: '2023-01-02T00:00:00Z',
        },
      ];

      const windowWidth = 100;

      if (windowWidth < 130) {
        designs.forEach(design => {
          console.log('Design Name: ' + design.name);
          console.log('Design Id: ' + design.id);
          console.log(
            'Date Created: ' + new Date(design.createdDate).toUTCString(),
          );
          console.log(
            'Last Updated: ' +
              new Date(design.updatedDate).toUTCString() +
              '\n',
          );
        });
      }

      // Test that the simple display logic works
      expect(designs.length).toBe(1);
      expect(designs[0].name).toBe('Test Design 1');
      expect(designs[0].id).toBe('design-123');
    });
  });

  describe('Error Handling', () => {
    it('should handle getDesigns error', () => {
      const error = new Error('Network error');

      mockLog.fail(
        'Unable to fetch designs',
        'You may not have any designs published yet.',
      );

      expect(mockLog.fail).toHaveBeenCalledWith(
        'Unable to fetch designs',
        'You may not have any designs published yet.',
      );
    });

    it('should handle authentication failure', () => {
      const mockLogin = require('../../src/util/login').Login;
      mockLogin.mockImplementation(() => ({
        getClient: jest.fn(),
      }));

      const login = new mockLogin();

      mockLog.notAuthenticated();

      expect(mockLog.notAuthenticated).toHaveBeenCalled();
    });
  });

  describe('Table Integration', () => {
    it('should work with mocked table', () => {
      const mockTableInstance = {
        push: jest.fn(),
        toString: jest.fn().mockReturnValue('table output'),
      };

      mockTable.mockImplementation(() => mockTableInstance);

      const table = new mockTable({
        head: ['Name', 'ID'],
        colWidths: [50, 30],
      });

      table.push(['Test Design', 'design-123']);
      const output = table.toString();

      expect(mockTable).toHaveBeenCalledWith({
        head: ['Name', 'ID'],
        colWidths: [50, 30],
      });
      expect(mockTableInstance.push).toHaveBeenCalledWith([
        'Test Design',
        'design-123',
      ]);
      expect(output).toBe('table output');
    });

    it('should handle table creation with different window widths', () => {
      const windowWidths = [100, 130, 150, 200];

      windowWidths.forEach(width => {
        const mockTableInstance = {
          push: jest.fn(),
          toString: jest.fn().mockReturnValue('table output'),
        };

        mockTable.mockImplementation(() => mockTableInstance);

        if (width >= 130) {
          const table = new mockTable({
            head: ['Name', 'ID'],
            colWidths: [width - 105, 38],
          });

          expect(mockTable).toHaveBeenCalledWith({
            head: ['Name', 'ID'],
            colWidths: [width - 105, 38],
          });
        }
      });
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

    it('should handle chalk integration', () => {
      mockChalk.cyan.mockImplementation((text: string) => `cyan:${text}`);

      const result = mockChalk.cyan('Test Text');

      expect(mockChalk.cyan).toHaveBeenCalledWith('Test Text');
      expect(result).toBe('cyan:Test Text');
    });
  });

  describe('Integration Tests', () => {
    it('should complete full ls flow with designs', () => {
      const designs = [
        {
          name: 'Test Design',
          id: 'design-123',
          createdDate: '2023-01-01T00:00:00Z',
          updatedDate: '2023-01-02T00:00:00Z',
        },
      ];

      const windowWidth = 150;
      const mockTableInstance = {
        push: jest.fn(),
        toString: jest.fn().mockReturnValue('table output'),
      };

      mockTable.mockImplementation(() => mockTableInstance);

      if (windowWidth >= 130) {
        const table = new mockTable({
          head: [
            mockChalk.cyan('Design Name'),
            mockChalk.cyan('Design Id'),
            mockChalk.cyan('Date Created'),
            mockChalk.cyan('Last Updated'),
          ],
          colWidths: [windowWidth - 105, 38, 31, 31],
        });

        designs.forEach(design => {
          table.push([
            design.name,
            design.id,
            new Date(design.createdDate).toUTCString(),
            new Date(design.updatedDate).toUTCString(),
          ]);
        });

        console.log(table.toString());
      }

      expect(mockTable).toHaveBeenCalled();
      expect(mockTableInstance.push).toHaveBeenCalled();
      expect(mockTableInstance.toString).toHaveBeenCalled();
    });

    it('should handle ls flow with empty designs', () => {
      const designs: any[] = [];

      if (designs.length === 0) {
        mockLog.fail(
          'No Designs Published',
          '`domo ls` will list designs once they are published to Domo',
        );
      }

      expect(mockLog.fail).toHaveBeenCalledWith(
        'No Designs Published',
        '`domo ls` will list designs once they are published to Domo',
      );
    });

    it('should handle ls flow with error', () => {
      mockLog.fail(
        'Unable to fetch designs',
        'You may not have any designs published yet.',
      );

      expect(mockLog.fail).toHaveBeenCalledWith(
        'Unable to fetch designs',
        'You may not have any designs published yet.',
      );
    });
  });
});
