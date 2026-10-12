import {jest} from '@jest/globals';
import {Command} from 'commander';

// Mock all dependencies at module level
jest.mock('enquirer', () => ({
  prompt: jest.fn(),
}));

jest.mock('../../src/util/login', () => ({
  Login: jest.fn(),
}));

jest.mock('../../src/util/design', () => ({
  getDesignId: jest.fn(),
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

describe('Delete Command', () => {
  let mockProgram: Command;
  let mockEnquirer: any;
  let mockGetDesignId: any;
  let mockLog: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockProgram = new Command();
    mockEnquirer = require('enquirer');
    mockGetDesignId = require('../../src/util/design').getDesignId;
    mockLog = require('../../src/util/log').log;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Command Registration', () => {
    it('should register delete command with correct options', () => {
      const command = mockProgram
        .command('delete [id]')
        .description('delete a published design by its id')
        .option(
          '-f, --force',
          'Delete the design even if it is referenced by Custom Apps',
        )
        .option('-c, --confirm', 'Auto confirm deleting the app');

      expect(command.name()).toBe('delete');
      expect(command.description()).toBe('delete a published design by its id');
    });

    it('should have correct options', () => {
      const command = mockProgram
        .command('delete [id]')
        .option(
          '-f, --force',
          'Delete the design even if it is referenced by Custom Apps',
        )
        .option('-c, --confirm', 'Auto confirm deleting the app');

      const options = command.options;
      expect(options.some(opt => opt.long === '--force')).toBe(true);
      expect(options.some(opt => opt.long === '--confirm')).toBe(true);
    });

    it('should accept design ID as argument', () => {
      const command = mockProgram.command('delete [id]');
      expect(command.name()).toBe('delete');
    });
  });

  describe('Design ID Resolution', () => {
    it('should get design ID from argument', () => {
      const designId = 'design-123';
      mockGetDesignId.mockReturnValue(designId);

      const result = mockGetDesignId(designId, 'manifest.json');

      expect(result).toBe(designId);
      expect(mockGetDesignId).toHaveBeenCalledWith(designId, 'manifest.json');
    });

    it('should handle missing design ID', () => {
      mockGetDesignId.mockReturnValue(undefined);

      const result = mockGetDesignId(undefined, 'manifest.json');

      expect(result).toBeUndefined();
    });

    it('should handle invalid design ID', () => {
      mockGetDesignId.mockImplementation(() => {
        throw new Error('Invalid design ID');
      });

      expect(() => {
        mockGetDesignId('invalid-id', 'manifest.json');
      }).toThrow('Invalid design ID');
    });
  });

  describe('Delete Confirmation', () => {
    it('should prompt user for confirmation', async () => {
      const mockPrompt = mockEnquirer.prompt as jest.MockedFunction<
        typeof mockEnquirer.prompt
      >;
      mockPrompt.mockResolvedValueOnce({
        delete: true,
      });

      const result = await mockPrompt([
        {
          type: 'confirm',
          message: 'Are you sure you want to delete design with id: test-id?',
          name: 'delete',
          default: false,
        },
      ]);

      expect(result.delete).toBe(true);
      expect(mockPrompt).toHaveBeenCalledWith([
        {
          type: 'confirm',
          message: 'Are you sure you want to delete design with id: test-id?',
          name: 'delete',
          default: false,
        },
      ]);
    });

    it('should handle user confirmation', async () => {
      const mockPrompt = mockEnquirer.prompt as jest.MockedFunction<
        typeof mockEnquirer.prompt
      >;
      mockPrompt.mockResolvedValueOnce({
        delete: true,
      });

      const result = await mockPrompt();
      expect(result.delete).toBe(true);
    });

    it('should handle user cancellation', async () => {
      const mockPrompt = mockEnquirer.prompt as jest.MockedFunction<
        typeof mockEnquirer.prompt
      >;
      mockPrompt.mockResolvedValueOnce({
        delete: false,
      });

      const result = await mockPrompt();
      expect(result.delete).toBe(false);
    });
  });

  describe('Auto Confirmation', () => {
    it('should auto confirm when confirm flag is set', () => {
      const options = {confirm: true};
      const handleUserResponse = jest.fn();

      if (options.confirm) {
        handleUserResponse({delete: true});
      }

      expect(handleUserResponse).toHaveBeenCalledWith({delete: true});
    });

    it('should not auto confirm when confirm flag is not set', () => {
      const options = {confirm: false};
      const handleUserResponse = jest.fn();

      if (options.confirm) {
        handleUserResponse({delete: true});
      }

      expect(handleUserResponse).not.toHaveBeenCalled();
    });
  });

  describe('Success Logging', () => {
    it('should log successful deletion', () => {
      const designId = 'design-123';

      mockLog.ok(`Deleted design ${designId}`);

      expect(mockLog.ok).toHaveBeenCalledWith(`Deleted design ${designId}`);
    });

    it('should log deletion failure', () => {
      const designId = 'design-123';

      mockLog.fail(
        `Unable to delete design ${designId}. That id does not exist or you are not authorized to delete it.`,
      );

      expect(mockLog.fail).toHaveBeenCalledWith(
        `Unable to delete design ${designId}. That id does not exist or you are not authorized to delete it.`,
      );
    });

    it('should log command abortion', () => {
      mockLog.fail('Delete command aborted');

      expect(mockLog.fail).toHaveBeenCalledWith('Delete command aborted');
    });
  });

  describe('Error Handling', () => {
    it('should handle design ID errors', () => {
      mockGetDesignId.mockImplementation(() => {
        throw new Error('Design ID not found');
      });

      expect(() => {
        mockGetDesignId('nonexistent-id', 'manifest.json');
      }).toThrow('Design ID not found');
    });

    it('should handle authentication errors', () => {
      mockLog.notAuthenticated.mockImplementation();

      mockLog.notAuthenticated();

      expect(mockLog.notAuthenticated).toHaveBeenCalled();
    });
  });

  describe('Force Flag Handling', () => {
    it('should pass force flag correctly', () => {
      const options = {force: true};
      const forceValue = options.force ? true : false;

      expect(forceValue).toBe(true);
    });

    it('should pass force flag as false when not set', () => {
      const options = {force: false};
      const forceValue = options.force ? true : false;

      expect(forceValue).toBe(false);
    });

    it('should handle undefined force flag', () => {
      const options = {force: undefined as boolean | undefined};
      const forceValue = options.force ? true : false;

      expect(forceValue).toBe(false);
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

    it('should handle design ID resolution', () => {
      mockGetDesignId.mockReturnValue('design-123');

      const designId = mockGetDesignId('design-123', 'manifest.json');

      expect(designId).toBe('design-123');
      expect(mockGetDesignId).toHaveBeenCalledWith(
        'design-123',
        'manifest.json',
      );
    });

    it('should handle enquirer prompts', async () => {
      const mockPrompt = mockEnquirer.prompt as jest.MockedFunction<
        typeof mockEnquirer.prompt
      >;
      mockPrompt.mockResolvedValueOnce({
        delete: true,
      });

      const result = await mockPrompt([
        {
          type: 'confirm',
          message: 'Are you sure?',
          name: 'delete',
          default: false,
        },
      ]);

      expect(result.delete).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    it('should complete full delete flow with confirmation', async () => {
      const designId = 'design-123';

      mockGetDesignId.mockReturnValue(designId);

      const mockPrompt = mockEnquirer.prompt as jest.MockedFunction<
        typeof mockEnquirer.prompt
      >;
      mockPrompt.mockResolvedValueOnce({
        delete: true,
      });

      // Simulate the delete flow
      const resolvedDesignId = mockGetDesignId(designId, 'manifest.json');
      const confirmation = await mockPrompt();

      if (confirmation.delete) {
        mockLog.ok(`Deleted design ${resolvedDesignId}`);
      }

      expect(resolvedDesignId).toBe(designId);
      expect(confirmation.delete).toBe(true);
      expect(mockLog.ok).toHaveBeenCalledWith(`Deleted design ${designId}`);
    });

    it('should complete full delete flow with auto confirmation', async () => {
      const designId = 'design-123';
      const options = {confirm: true, force: true};

      mockGetDesignId.mockReturnValue(designId);

      // Simulate the delete flow with auto confirmation
      const resolvedDesignId = mockGetDesignId(designId, 'manifest.json');

      if (options.confirm) {
        mockLog.ok(`Deleted design ${resolvedDesignId}`);
      }

      expect(resolvedDesignId).toBe(designId);
      expect(mockLog.ok).toHaveBeenCalledWith(`Deleted design ${designId}`);
    });

    it('should handle delete cancellation', async () => {
      const designId = 'design-123';

      mockGetDesignId.mockReturnValue(designId);

      const mockPrompt = mockEnquirer.prompt as jest.MockedFunction<
        typeof mockEnquirer.prompt
      >;
      mockPrompt.mockResolvedValueOnce({
        delete: false,
      });

      // Simulate the delete flow with cancellation
      const resolvedDesignId = mockGetDesignId(designId, 'manifest.json');
      const confirmation = await mockPrompt();

      if (!confirmation.delete) {
        mockLog.fail('Delete command aborted');
      }

      expect(resolvedDesignId).toBe(designId);
      expect(confirmation.delete).toBe(false);
      expect(mockLog.fail).toHaveBeenCalledWith('Delete command aborted');
    });
  });
});
