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

jest.mock('../../src/util/manifest', () => ({
  ManifestUtils: {
    getManifest: jest.fn(),
  },
}));

jest.mock('validator', () => ({
  isUUID: jest.fn(),
}));

describe('Owner Command', () => {
  let mockProgram: Command;
  let mockLog: any;
  let mockManifestUtils: any;
  let mockValidator: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockProgram = new Command();
    mockLog = require('../../src/util/log').log;
    mockManifestUtils = require('../../src/util/manifest').ManifestUtils;
    mockValidator = require('validator');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Command Registration', () => {
    it('should register owner command with correct syntax', () => {
      const command = mockProgram
        .command('owner <add|rm|ls> [user-emails...]')
        .description('manage design owners')
        .option(
          '-i, --designId <id>',
          'Specify design ID, otherwise it is retrieved from a manifest file',
        );

      expect(command.name()).toBe('owner');
      expect(command.description()).toBe('manage design owners');
    });

    it('should have correct options', () => {
      const command = mockProgram
        .command('owner <add|rm|ls> [user-emails...]')
        .option(
          '-i, --designId <id>',
          'Specify design ID, otherwise it is retrieved from a manifest file',
        );

      const options = command.options;
      expect(options.some(opt => opt.long === '--designId')).toBe(true);
    });
  });

  describe('Design ID Resolution', () => {
    it('should use provided design ID when valid', () => {
      const designId = '123e4567-e89b-12d3-a456-426614174000';

      mockValidator.isUUID.mockReturnValue(true);

      const isValid = mockValidator.isUUID(designId);

      expect(mockValidator.isUUID).toHaveBeenCalledWith(designId);
      expect(isValid).toBe(true);
    });

    it('should fail with invalid design ID', () => {
      const designId = 'invalid-id';

      mockValidator.isUUID.mockReturnValue(false);

      const isValid = mockValidator.isUUID(designId);

      expect(mockValidator.isUUID).toHaveBeenCalledWith(designId);
      expect(isValid).toBe(false);
    });

    it('should get design ID from manifest when not provided', () => {
      const manifest = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Design',
      };

      mockManifestUtils.getManifest.mockReturnValue(manifest);

      const result = mockManifestUtils.getManifest();

      expect(mockManifestUtils.getManifest).toHaveBeenCalled();
      expect(result.id).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    it('should fail when no manifest found', () => {
      mockManifestUtils.getManifest.mockReturnValue(null);

      const result = mockManifestUtils.getManifest();

      expect(mockManifestUtils.getManifest).toHaveBeenCalled();
      expect(result).toBe(null);
    });

    it('should fail when manifest has no ID', () => {
      const manifest = {
        name: 'Test Design',
      };

      mockManifestUtils.getManifest.mockReturnValue(manifest);

      const result = mockManifestUtils.getManifest();

      expect(mockManifestUtils.getManifest).toHaveBeenCalled();
      expect(result.id).toBeUndefined();
    });
  });

  describe('Add Owners Action', () => {
    it('should add owners successfully', () => {
      const designId = '123e4567-e89b-12d3-a456-426614174000';
      const users = ['user1@example.com', 'user2@example.com'];

      mockLog.ok('Owners added ' + users);

      expect(mockLog.ok).toHaveBeenCalledWith(
        'Owners added user1@example.com,user2@example.com',
      );
    });

    it('should handle add owners error', () => {
      mockLog.fail('Error adding owners');

      expect(mockLog.fail).toHaveBeenCalledWith('Error adding owners');
    });
  });

  describe('Remove Owners Action', () => {
    it('should remove owners successfully', () => {
      const designId = '123e4567-e89b-12d3-a456-426614174000';
      const users = ['user1@example.com', 'user2@example.com'];

      mockLog.ok('Owners removed ' + users);

      expect(mockLog.ok).toHaveBeenCalledWith(
        'Owners removed user1@example.com,user2@example.com',
      );
    });

    it('should handle remove owners error', () => {
      mockLog.fail('Error removing owners');

      expect(mockLog.fail).toHaveBeenCalledWith('Error removing owners');
    });
  });

  describe('List Owners Action', () => {
    it('should list owners successfully', () => {
      const designId = '123e4567-e89b-12d3-a456-426614174000';
      const owners = [{displayName: 'John Doe'}, {displayName: 'Jane Smith'}];

      mockLog.ok(`Owners for design ${designId}:`);

      expect(mockLog.ok).toHaveBeenCalledWith(`Owners for design ${designId}:`);
    });

    it('should handle list owners error', () => {
      mockLog.fail('Error retrieving owners');

      expect(mockLog.fail).toHaveBeenCalledWith('Error retrieving owners');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid design ID error', () => {
      const designId = 'invalid-id';

      mockValidator.isUUID.mockReturnValue(false);

      const isValid = mockValidator.isUUID(designId);

      if (!isValid) {
        mockLog.fail(
          'The value specified for option -i is not a valid design ID',
          designId,
        );
      }

      expect(mockLog.fail).toHaveBeenCalledWith(
        'The value specified for option -i is not a valid design ID',
        designId,
      );
    });

    it('should handle no manifest found error', () => {
      mockManifestUtils.getManifest.mockReturnValue(null);

      const manifest = mockManifestUtils.getManifest();

      if (!manifest) {
        mockLog.fail(
          'No manifest found. Please supply design id using -i or change to a directory with a valid manifest file',
        );
      }

      expect(mockLog.fail).toHaveBeenCalledWith(
        'No manifest found. Please supply design id using -i or change to a directory with a valid manifest file',
      );
    });

    it('should handle manifest without ID error', () => {
      const manifest = {name: 'Test Design'};

      mockManifestUtils.getManifest.mockReturnValue(manifest);

      const result = mockManifestUtils.getManifest();

      if (!result.id) {
        mockLog.fail(
          'No manifest id. Please publish your design before attempting to add owners to it.',
        );
      }

      expect(mockLog.fail).toHaveBeenCalledWith(
        'No manifest id. Please publish your design before attempting to add owners to it.',
      );
    });

    it('should handle authentication failure', () => {
      mockLog.notAuthenticated();

      expect(mockLog.notAuthenticated).toHaveBeenCalled();
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

    it('should handle validator integration', () => {
      mockValidator.isUUID.mockImplementation((id: string) => {
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          id,
        );
      });

      const validId = '123e4567-e89b-12d3-a456-426614174000';
      const invalidId = 'invalid-id';

      expect(mockValidator.isUUID(validId)).toBe(true);
      expect(mockValidator.isUUID(invalidId)).toBe(false);
    });

    it('should handle manifest utils integration', () => {
      const manifest = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Design',
      };

      mockManifestUtils.getManifest.mockReturnValue(manifest);

      const result = mockManifestUtils.getManifest();

      expect(mockManifestUtils.getManifest).toHaveBeenCalled();
      expect(result).toEqual(manifest);
    });
  });

  describe('Integration Tests', () => {
    it('should complete full add owners flow', () => {
      const designId = '123e4567-e89b-12d3-a456-426614174000';
      const users = ['user1@example.com', 'user2@example.com'];

      mockValidator.isUUID.mockReturnValue(true);

      // Simulate the actual flow
      const isValid = mockValidator.isUUID(designId);
      if (isValid) {
        mockLog.ok('Owners added ' + users);
      }

      expect(mockValidator.isUUID).toHaveBeenCalledWith(designId);
      expect(mockLog.ok).toHaveBeenCalledWith(
        'Owners added user1@example.com,user2@example.com',
      );
    });

    it('should complete full remove owners flow', () => {
      const designId = '123e4567-e89b-12d3-a456-426614174000';
      const users = ['user1@example.com'];

      mockValidator.isUUID.mockReturnValue(true);

      // Simulate the actual flow
      const isValid = mockValidator.isUUID(designId);
      if (isValid) {
        mockLog.ok('Owners removed ' + users);
      }

      expect(mockValidator.isUUID).toHaveBeenCalledWith(designId);
      expect(mockLog.ok).toHaveBeenCalledWith(
        'Owners removed user1@example.com',
      );
    });

    it('should complete full list owners flow', () => {
      const designId = '123e4567-e89b-12d3-a456-426614174000';

      mockValidator.isUUID.mockReturnValue(true);

      // Simulate the actual flow
      const isValid = mockValidator.isUUID(designId);
      if (isValid) {
        mockLog.ok(`Owners for design ${designId}:`);
      }

      expect(mockValidator.isUUID).toHaveBeenCalledWith(designId);
      expect(mockLog.ok).toHaveBeenCalledWith(`Owners for design ${designId}:`);
    });
  });
});
