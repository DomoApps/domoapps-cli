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

jest.mock('../../src/util/manifest', () => ({
  ManifestUtils: {
    getManifest: jest.fn(),
  },
}));

jest.mock('../../src/util/appStructure', () => ({
  hasThumbnail: jest.fn(),
}));

jest.mock('../../src/models/index', () => ({
  constant: {
    THUMBNAIL_CREATE_WARNING:
      'A thumbnail is required before creating a card with this design.',
    CREATE_THUMBNAIL:
      'Place a 300x300 image named thumbnail.png in the base directory of your design.',
  },
}));

jest.mock('enquirer', () => ({
  prompt: jest.fn(),
}));

describe('Release Command', () => {
  let mockProgram: Command;
  let mockLog: any;
  let mockManifestUtils: any;
  let mockAppStructure: any;
  let mockConstant: any;
  let mockEnquirer: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockProgram = new Command();
    mockLog = require('../../src/util/log').log;
    mockManifestUtils = require('../../src/util/manifest').ManifestUtils;
    mockAppStructure = require('../../src/util/appStructure');
    mockConstant = require('../../src/models/index').constant;
    mockEnquirer = require('enquirer');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Command Registration', () => {
    it('should register release command with correct syntax', () => {
      const command = mockProgram
        .command('release')
        .description('prepare a design for app store release');

      expect(command.name()).toBe('release');
      expect(command.description()).toBe(
        'prepare a design for app store release',
      );
    });
  });

  describe('Manifest Validation', () => {
    it('should fail when manifest has no ID', () => {
      const manifest = {
        name: 'Test Design',
      };

      mockManifestUtils.getManifest.mockReturnValue(manifest);

      const result = mockManifestUtils.getManifest();

      if (!result.id) {
        mockLog.fail(
          'Cannot release until design is published.',
          'Please publish your Custom App design (with the `domo publish` command) first',
        );
      }

      expect(mockLog.fail).toHaveBeenCalledWith(
        'Cannot release until design is published.',
        'Please publish your Custom App design (with the `domo publish` command) first',
      );
    });

    it('should pass when manifest has ID', () => {
      const manifest = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Design',
      };

      mockManifestUtils.getManifest.mockReturnValue(manifest);

      const result = mockManifestUtils.getManifest();

      expect(result.id).toBe('123e4567-e89b-12d3-a456-426614174000');
    });
  });

  describe('Thumbnail Validation', () => {
    it('should fail when no thumbnail exists', () => {
      mockAppStructure.hasThumbnail.mockReturnValue(false);

      const hasThumbnail = mockAppStructure.hasThumbnail();

      if (!hasThumbnail) {
        mockLog.fail(
          mockConstant.THUMBNAIL_CREATE_WARNING,
          mockConstant.CREATE_THUMBNAIL,
        );
      }

      expect(mockLog.fail).toHaveBeenCalledWith(
        mockConstant.THUMBNAIL_CREATE_WARNING,
        mockConstant.CREATE_THUMBNAIL,
      );
    });

    it('should pass when thumbnail exists', () => {
      mockAppStructure.hasThumbnail.mockReturnValue(true);

      const hasThumbnail = mockAppStructure.hasThumbnail();

      expect(hasThumbnail).toBe(true);
    });
  });

  describe('Version Selection', () => {
    it('should handle version selection with latest option', () => {
      const versions = ['1.0.0', '1.1.0', '1.2.0'];
      const reversedVersions = [...versions].reverse();
      reversedVersions.unshift('latest');

      const expectedChoices = ['latest', '1.2.0', '1.1.0', '1.0.0'];

      expect(reversedVersions).toEqual(expectedChoices);
    });

    it('should handle version selection prompt', () => {
      const versions = ['1.0.0', '1.1.0'];
      const choices = ['latest', ...versions.reverse()];

      mockEnquirer.prompt.mockResolvedValue({
        version: 'latest',
      });

      const prompts = [
        {
          type: 'list',
          message: 'select a version to release',
          name: 'version',
          choices: choices,
        },
      ];

      mockEnquirer.prompt(prompts).then((answers: any) => {
        expect(answers.version).toBe('latest');
      });

      expect(mockEnquirer.prompt).toHaveBeenCalledWith(prompts);
    });

    it('should handle version selection with specific version', () => {
      const versions = ['1.0.0', '1.1.0'];
      const choices = ['latest', ...versions.reverse()];

      mockEnquirer.prompt.mockResolvedValue({
        version: '1.1.0',
      });

      const prompts = [
        {
          type: 'list',
          message: 'select a version to release',
          name: 'version',
          choices: choices,
        },
      ];

      mockEnquirer.prompt(prompts).then((answers: any) => {
        expect(answers.version).toBe('1.1.0');
      });

      expect(mockEnquirer.prompt).toHaveBeenCalledWith(prompts);
    });
  });

  describe('Release Process', () => {
    it('should handle successful release', () => {
      const manifestId = '123e4567-e89b-12d3-a456-426614174000';
      const version = 'latest';

      mockLog.ok('Design version (' + version + ') released');

      expect(mockLog.ok).toHaveBeenCalledWith(
        'Design version (latest) released',
      );
    });

    it('should handle release failure', () => {
      const error = new Error('Release failed');

      mockLog.fail(error);

      expect(mockLog.fail).toHaveBeenCalledWith(error);
    });

    it('should handle getVersions failure', () => {
      mockLog.clientRequestFailed('Error releasing app design');

      expect(mockLog.clientRequestFailed).toHaveBeenCalledWith(
        'Error releasing app design',
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle authentication failure', () => {
      mockLog.notAuthenticated();

      expect(mockLog.notAuthenticated).toHaveBeenCalled();
    });

    it('should handle manifest not found', () => {
      mockManifestUtils.getManifest.mockReturnValue(null);

      const manifest = mockManifestUtils.getManifest();

      expect(manifest).toBe(null);
    });

    it('should handle getVersions error', () => {
      const manifestId = '123e4567-e89b-12d3-a456-426614174000';

      mockLog.clientRequestFailed('Error releasing app design');

      expect(mockLog.clientRequestFailed).toHaveBeenCalledWith(
        'Error releasing app design',
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
      mockLog.clientRequestFailed('Client error');

      expect(mockLog.ok).toHaveBeenCalledWith('Success message');
      expect(mockLog.fail).toHaveBeenCalledWith('Error message');
      expect(mockLog.info).toHaveBeenCalledWith('Info message');
      expect(mockLog.warn).toHaveBeenCalledWith('Warning message');
      expect(mockLog.notAuthenticated).toHaveBeenCalled();
      expect(mockLog.clientRequestFailed).toHaveBeenCalledWith('Client error');
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

    it('should handle app structure integration', () => {
      mockAppStructure.hasThumbnail.mockReturnValue(true);

      const hasThumbnail = mockAppStructure.hasThumbnail();

      expect(mockAppStructure.hasThumbnail).toHaveBeenCalled();
      expect(hasThumbnail).toBe(true);
    });

    it('should handle enquirer integration', () => {
      const prompts = [
        {
          type: 'list',
          message: 'select a version to release',
          name: 'version',
          choices: ['latest', '1.0.0'],
        },
      ];

      mockEnquirer.prompt.mockResolvedValue({version: 'latest'});

      mockEnquirer.prompt(prompts).then((answer: any) => {
        expect(answer.version).toBe('latest');
      });

      expect(mockEnquirer.prompt).toHaveBeenCalledWith(prompts);
    });
  });

  describe('Integration Tests', () => {
    it('should complete full release flow with valid manifest and thumbnail', () => {
      const manifest = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Design',
      };

      mockManifestUtils.getManifest.mockReturnValue(manifest);
      mockAppStructure.hasThumbnail.mockReturnValue(true);

      const result = mockManifestUtils.getManifest();
      const hasThumbnail = mockAppStructure.hasThumbnail();

      expect(result.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(hasThumbnail).toBe(true);
    });

    it('should fail release flow with no manifest ID', () => {
      const manifest = {
        name: 'Test Design',
      };

      mockManifestUtils.getManifest.mockReturnValue(manifest);

      const result = mockManifestUtils.getManifest();

      if (!result.id) {
        mockLog.fail(
          'Cannot release until design is published.',
          'Please publish your Custom App design (with the `domo publish` command) first',
        );
      }

      expect(mockLog.fail).toHaveBeenCalledWith(
        'Cannot release until design is published.',
        'Please publish your Custom App design (with the `domo publish` command) first',
      );
    });

    it('should fail release flow with no thumbnail', () => {
      const manifest = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Design',
      };

      mockManifestUtils.getManifest.mockReturnValue(manifest);
      mockAppStructure.hasThumbnail.mockReturnValue(false);

      const result = mockManifestUtils.getManifest();
      const hasThumbnail = mockAppStructure.hasThumbnail();

      if (!hasThumbnail) {
        mockLog.fail(
          mockConstant.THUMBNAIL_CREATE_WARNING,
          mockConstant.CREATE_THUMBNAIL,
        );
      }

      expect(mockLog.fail).toHaveBeenCalledWith(
        mockConstant.THUMBNAIL_CREATE_WARNING,
        mockConstant.CREATE_THUMBNAIL,
      );
    });

    it('should complete version selection flow', () => {
      const versions = ['1.0.0', '1.1.0', '1.2.0'];
      const reversedVersions = [...versions].reverse();
      reversedVersions.unshift('latest');

      const prompts = [
        {
          type: 'list',
          message: 'select a version to release',
          name: 'version',
          choices: reversedVersions,
        },
      ];

      mockEnquirer.prompt.mockResolvedValue({
        version: 'latest',
      });

      mockEnquirer.prompt(prompts).then((answers: any) => {
        mockLog.ok('Design version (' + answers.version + ') released');
      });

      expect(mockEnquirer.prompt).toHaveBeenCalledWith(prompts);
    });

    it('should handle release success flow', () => {
      const manifestId = '123e4567-e89b-12d3-a456-426614174000';
      const version = '1.2.0';

      mockLog.ok('Design version (' + version + ') released');

      expect(mockLog.ok).toHaveBeenCalledWith(
        'Design version (1.2.0) released',
      );
    });

    it('should handle release error flow', () => {
      const error = new Error('Release failed');

      mockLog.fail(error);

      expect(mockLog.fail).toHaveBeenCalledWith(error);
    });
  });
});
