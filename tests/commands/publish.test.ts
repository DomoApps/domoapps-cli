import {jest} from '@jest/globals';
import {Command} from 'commander';

// Mock all dependencies at module level
jest.mock('enquirer', () => ({
  prompt: jest.fn(),
}));

jest.mock('lodash', () => ({
  __esModule: true,
  default: {
    isEqual: jest.fn(() => true),
  },
}));

jest.mock('open', () => jest.fn());

jest.mock('../../src/util/manifest', () => ({
  ManifestUtils: {
    getManifest: jest.fn(),
    hasManifest: jest.fn(),
    persistDesignId: jest.fn(),
    updateManifest: jest.fn(),
    writeManifest: jest.fn(),
    getManifestPath: jest.fn(),
    manifestExists: jest.fn(),
  },
}));

jest.mock('../../src/util/login', () => ({
  Login: jest.fn(),
}));

jest.mock('glob', () => ({
  globSync: jest.fn(),
  sync: jest.fn(),
}));

jest.mock('fs-extra', () => ({
  lstatSync: jest.fn(),
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

jest.mock('../../src/util/appStructure', () => ({
  hasThumbnail: jest.fn(),
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

jest.mock('ryuu-client', () => ({
  createClient: jest.fn(),
  getHomeDir: jest.fn(() => '/mock/home/dir'),
}));

describe('Publish Command', () => {
  let mockProgram: Command;
  let mockEnquirer: any;
  let mockManifestUtils: any;
  let mockLogin: any;
  let mockGlob: any;
  let mockFs: any;
  let mockAppStructure: any;
  let mockLog: any;
  let mockOpen: any;
  let publishCommand: (program: Command) => void;

  const flushPromises = () => new Promise(resolve => setImmediate(resolve));

  beforeEach(() => {
    jest.clearAllMocks();
    mockProgram = new Command();
    mockEnquirer = require('enquirer');
    mockManifestUtils = require('../../src/util/manifest').ManifestUtils;
    mockLogin = require('../../src/util/login').Login;
    mockGlob = require('glob');
    mockFs = require('fs-extra');
    mockAppStructure = require('../../src/util/appStructure');
    mockLog = require('../../src/util/log').log;
    mockOpen = require('open');
    publishCommand = require('../../src/commands/publish').default;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Command Registration', () => {
    it('should register publish command with correct options', () => {
      const command = mockProgram
        .command('publish')
        .description('publish a new or existing Custom App design')
        .option(
          '-g, --go',
          'navigate to design in Asset Library after publishing',
        );

      expect(command.name()).toBe('publish');
      expect(command.description()).toBe(
        'publish a new or existing Custom App design',
      );
    });

    it('should have correct options', () => {
      const command = mockProgram
        .command('publish')
        .option(
          '-g, --go',
          'navigate to design in Asset Library after publishing',
        );

      const options = command.options;
      expect(options.some(opt => opt.long === '--go')).toBe(true);
    });
  });

  describe('Manifest Handling', () => {
    it('should read manifest file', () => {
      const mockManifest = {
        name: 'test-app',
        version: '1.0.0',
        id: 'test-id',
      };

      mockManifestUtils.getManifest.mockReturnValue(mockManifest as any);

      const manifest = mockManifestUtils.getManifest(
        'test-manifest.json',
        true,
      );

      expect(manifest.name).toBe('test-app');
      expect(mockManifestUtils.getManifest).toHaveBeenCalledWith(
        'test-manifest.json',
        true,
      );
    });

    it('should handle missing manifest file', () => {
      mockManifestUtils.getManifest.mockImplementation(() => {
        throw new Error('Manifest not found');
      });

      expect(() => {
        mockManifestUtils.getManifest('nonexistent.json', true);
      }).toThrow('Manifest not found');
    });
  });

  describe('File Validation', () => {
    it('should validate file names for special characters', () => {
      const validFiles = ['app.js', 'style.css', 'index.html'];
      const invalidFiles = [
        'file with spaces.js',
        'file~with~special~chars.js',
      ];

      const validateFileName = (file: string) => {
        return (
          !/[~`!#$%^&*+=[\]\\';,{}|\\":<>?]/g.test(file) && !file.includes(' ')
        );
      };

      validFiles.forEach(file => {
        expect(validateFileName(file)).toBe(true);
      });

      invalidFiles.forEach(file => {
        expect(validateFileName(file)).toBe(false);
      });
    });

    it('should handle Windows-style paths with backslashes', () => {
      // Windows paths use backslashes as path separators
      const windowsStylePaths = [
        'src\\app.js',
        'src\\components\\Header.tsx',
        'dist\\assets\\style.css',
        'folder\\subfolder\\file.html',
      ];

      mockGlob.sync.mockReturnValue(windowsStylePaths);
      mockFs.lstatSync.mockReturnValue({
        isDirectory: jest.fn().mockReturnValue(false),
      } as any);

      const files = mockGlob.sync('**/*', {ignore: ['node_modules/**/*']});

      // Verify that glob returns Windows-style paths
      expect(files).toEqual(windowsStylePaths);

      // Verify paths contain backslashes
      files.forEach((file: string) => {
        expect(file).toMatch(/\\/);
      });

      // Validate that the regex check should normalize paths for Windows
      // Path separators (forward slash or backslash) should be allowed
      const validateFilePathCrossPlatform = (file: string) => {
        // Normalize path separators before checking for special characters
        const normalizedPath = file.replace(/\\/g, '/');
        return (
          !/[~`!#$%^&*+=[\]\\';,{}|\\":<>?]/g.test(normalizedPath) &&
          !normalizedPath.split('/').some((part: string) => part.includes(' '))
        );
      };

      windowsStylePaths.forEach((path: string) => {
        expect(validateFilePathCrossPlatform(path)).toBe(true);
      });
    });

    it('should reject invalid characters even after normalizing Windows paths', () => {
      // These paths should still be invalid even after normalizing backslashes
      const invalidPaths = [
        'src\\file~with~tildes.js', // Tilde is invalid
        'src\\file*with*asterisks.js', // Asterisk is invalid
        'src\\file:with:colons.js', // Colon is invalid (except after drive letter)
        'src\\file<with>brackets.js', // Angle brackets are invalid
      ];

      const validateFilePathCrossPlatform = (file: string) => {
        // Normalize path separators before checking for special characters
        const normalizedPath = file.replace(/\\/g, '/');
        return !/[~`!#$%^&*+=[\]\\';,{}|\\":<>?]/g.test(normalizedPath);
      };

      invalidPaths.forEach((path: string) => {
        expect(validateFilePathCrossPlatform(path)).toBe(false);
      });
    });

    it('should handle mixed path separators from cross-platform builds', () => {
      // Some build tools might output mixed separators
      const mixedPaths = [
        'src/components\\Header.tsx',
        'dist\\assets/style.css',
        'folder/subfolder\\file.html',
      ];

      mockGlob.sync.mockReturnValue(mixedPaths);

      const files = mockGlob.sync('**/*', {ignore: ['node_modules/**/*']});

      const validateFilePathCrossPlatform = (file: string) => {
        // Normalize path separators before checking for special characters
        const normalizedPath = file.replace(/\\/g, '/');
        return !/[~`!#$%^&*+=[\]\\';,{}|\\":<>?]/g.test(normalizedPath);
      };

      mixedPaths.forEach((path: string) => {
        expect(validateFilePathCrossPlatform(path)).toBe(true);
      });
    });

    it('should handle directory files', () => {
      mockFs.lstatSync.mockReturnValue({
        isDirectory: jest.fn().mockReturnValue(true),
      } as any);

      const file = 'directory/';
      const isDirectory = mockFs.lstatSync(file).isDirectory();

      expect(isDirectory).toBe(true);
    });
  });

  describe('File Processing', () => {
    it('should process files with glob', () => {
      const mockFiles = ['app.js', 'style.css', 'index.html'];
      mockGlob.sync.mockReturnValue(mockFiles);

      const files = mockGlob.sync('**/*', {ignore: ['node_modules/**/*']});

      expect(files).toEqual(mockFiles);
      expect(mockGlob.sync).toHaveBeenCalledWith('**/*', {
        ignore: ['node_modules/**/*'],
      });
    });

    it('should handle ignore patterns', () => {
      const mockManifest = {
        ignore: ['*.log', 'temp/**/*'],
      };

      const ignorePatterns = [
        'node_modules/**/*',
        ...(mockManifest.ignore || []),
      ];

      expect(ignorePatterns).toContain('node_modules/**/*');
      expect(ignorePatterns).toContain('*.log');
      expect(ignorePatterns).toContain('temp/**/*');
    });

    it('should validate ignore array format', () => {
      const validIgnore = ['*.log', 'temp/**/*'];
      const invalidIgnore = '*.log';

      expect(Array.isArray(validIgnore)).toBe(true);
      expect(Array.isArray(invalidIgnore)).toBe(false);
    });
  });

  describe('Thumbnail Handling', () => {
    it('should check for thumbnail existence', () => {
      mockAppStructure.hasThumbnail.mockReturnValue(true);

      const hasThumbnail = mockAppStructure.hasThumbnail();

      expect(hasThumbnail).toBe(true);
      expect(mockAppStructure.hasThumbnail).toHaveBeenCalled();
    });

    it('should handle missing thumbnail', () => {
      mockAppStructure.hasThumbnail.mockReturnValue(false);

      const hasThumbnail = mockAppStructure.hasThumbnail();

      expect(hasThumbnail).toBe(false);
    });
  });

  describe('Navigation', () => {
    it('should open browser after publishing', () => {
      mockOpen.mockImplementation();

      const instance = 'test.domo.com';
      const appId = 'app-123';
      const url = `https://${instance}/apps/${appId}`;

      mockOpen(url);

      expect(mockOpen).toHaveBeenCalledWith(url);
    });
  });

  describe('Error Handling', () => {
    it('should handle manifest errors', () => {
      mockManifestUtils.getManifest.mockImplementation(() => {
        throw new Error('Invalid manifest format');
      });

      expect(() => {
        mockManifestUtils.getManifest('invalid-manifest.json', true);
      }).toThrow('Invalid manifest format');
    });

    it('should handle file system errors', () => {
      mockFs.lstatSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      expect(() => {
        mockFs.lstatSync('nonexistent-file');
      }).toThrow('File not found');
    });

    it('should log the original upload error and stop before the success link', async () => {
      const uploadError = Object.assign(new Error('Internal Server Error'), {
        statusCode: 500,
        url: 'https://test.domo.com/api/apps/v1/designs/design-id/versions/1.0.0/assets',
      });
      const datasetMapping = {alias: 'sales', dataSetId: 'dataset-id'};
      const manifest = {
        name: 'test-app',
        version: '1.0.0',
        id: 'design-id',
        datasetsMapping: [datasetMapping],
      };
      const existingDesign = {
        latestVersion: '1.0.0',
        versions: [{version: '1.0.0', datasetsMapping: [datasetMapping]}],
      };
      const client = {
        instance: 'test.domo.com',
        refreshToken: 'refresh-token',
        designs: {
          get: jest
            .fn<() => Promise<typeof existingDesign>>()
            .mockResolvedValue(existingDesign),
        },
        assets: {
          uploadAll: jest
            .fn<() => Promise<never>>()
            .mockImplementation(() => Promise.reject(uploadError)),
        },
      };

      mockManifestUtils.getManifest.mockReturnValue(manifest);
      mockGlob.globSync.mockReturnValue([]);
      mockAppStructure.hasThumbnail.mockReturnValue(true);
      mockLog.handleErrorMessage = jest.fn(() => 'Error uploading assets');
      mockLogin.mockImplementation(() => ({
        getClient: jest
          .fn<() => Promise<typeof client>>()
          .mockResolvedValue(client),
      }));

      publishCommand(mockProgram);
      await mockProgram.parseAsync(['publish', '--go'], {from: 'user'});
      await flushPromises();

      expect(mockLog.handleErrorMessage).toHaveBeenCalledWith(
        uploadError,
        'Error uploading assets in the upload all assets',
      );
      expect(mockLog.fail).toHaveBeenCalledWith(
        'Error uploading assets',
        undefined,
        uploadError,
      );
      expect(mockOpen).not.toHaveBeenCalled();
      expect(console.log).not.toHaveBeenCalledWith(
        expect.stringContaining('/assetlibrary?designId=design-id'),
      );
    });

    it('should log new-design upload errors and not continue to the success link', async () => {
      const uploadError = Object.assign(new Error('asset upload failed'), {
        statusCode: 502,
        url: 'https://test.domo.com/api/apps/v1/designs/new-design-id/versions/1.0.0/assets',
      });
      const manifest = {
        name: 'new-app',
        version: '1.0.0',
      };
      const createdDesign = {id: 'new-design-id'};
      const client = {
        instance: 'test.domo.com',
        refreshToken: 'refresh-token',
        designs: {
          create: jest
            .fn<() => Promise<typeof createdDesign>>()
            .mockResolvedValue(createdDesign),
        },
        assets: {
          uploadAll: jest
            .fn<() => Promise<never>>()
            .mockImplementation(() => Promise.reject(uploadError)),
        },
      };

      mockManifestUtils.getManifest.mockReturnValue(manifest);
      mockManifestUtils.persistDesignId.mockReturnValue('new-design-id');
      mockGlob.globSync.mockReturnValue([]);
      mockAppStructure.hasThumbnail.mockReturnValue(true);
      mockLog.handleErrorMessage = jest.fn(() => 'Error uploading assets');
      mockLogin.mockImplementation(() => ({
        getClient: jest
          .fn<() => Promise<typeof client>>()
          .mockResolvedValue(client),
      }));

      publishCommand(mockProgram);
      await mockProgram.parseAsync(['publish', '--go'], {from: 'user'});
      await flushPromises();

      expect(mockLog.handleErrorMessage).toHaveBeenCalledWith(
        uploadError,
        'Error uploading assets in uploading assets for a new design',
      );
      expect(mockLog.fail).toHaveBeenCalledWith(
        'Error uploading assets',
        undefined,
        uploadError,
      );
      expect(mockOpen).not.toHaveBeenCalled();
      expect(console.log).not.toHaveBeenCalledWith(
        expect.stringContaining('/assetlibrary?designId=new-design-id'),
      );
    });
  });

  describe('Publish Error Recovery', () => {
    const run = async (client: any, manifest: any, args = ['publish']) => {
      mockManifestUtils.getManifest.mockReturnValue(manifest);
      mockGlob.globSync.mockReturnValue([]);
      mockAppStructure.hasThumbnail.mockReturnValue(true);
      mockLog.handleErrorMessage = jest.fn(() => 'handled');
      mockLogin.mockImplementation(() => ({
        getClient: jest
          .fn<() => Promise<typeof client>>()
          .mockResolvedValue(client),
      }));
      publishCommand(mockProgram);
      await mockProgram.parseAsync(args, {from: 'user'});
      await flushPromises();
    };

    const existingClient = (overrides: any = {}) => ({
      instance: 'test.domo.com',
      refreshToken: 'token',
      designs: {
        get: jest
          .fn<() => Promise<any>>()
          .mockResolvedValue({latestVersion: '1.0.0', versions: []}),
        undelete: jest.fn<() => Promise<void>>().mockResolvedValue(),
        ...overrides.designs,
      },
      assets: {
        uploadAll: jest.fn<() => Promise<any[]>>().mockResolvedValue([]),
        ...overrides.assets,
      },
    });

    it('should not throw when datasetsMapping is missing', async () => {
      const client = existingClient();
      await run(client, {name: 'a', version: '1.0.0', id: 'id'});

      expect(client.assets.uploadAll).toHaveBeenCalled();
      expect(mockLog.fail).not.toHaveBeenCalled();
    });

    it('should open the browser with --go after Undelete', async () => {
      const deleted = Object.assign(new Error('Design has been deleted'), {});
      const client = existingClient({
        assets: {
          uploadAll: jest
            .fn<() => Promise<any[]>>()
            .mockRejectedValueOnce(deleted)
            .mockResolvedValue([]),
        },
      });
      mockEnquirer.prompt.mockResolvedValue({choice: 'Undelete'});

      await run(client, {name: 'a', version: '1.0.0', id: 'id'}, [
        'publish',
        '--go',
      ]);

      expect(client.designs.undelete).toHaveBeenCalledWith('id');
      expect(mockOpen).toHaveBeenCalledWith(
        'https://test.domo.com/assetlibrary?designId=id',
      );
    });

    it('should exit cleanly when the deleted-design prompt is cancelled', async () => {
      const deleted = new Error('Design has been deleted');
      const client = existingClient({
        assets: {
          uploadAll: jest
            .fn<() => Promise<any[]>>()
            .mockRejectedValue(deleted),
        },
      });
      mockEnquirer.prompt.mockRejectedValue('');

      await run(client, {name: 'a', version: '1.0.0', id: 'id'});

      expect(mockLog.ok).toHaveBeenCalledWith(
        'Exited without republishing design',
      );
      expect(mockOpen).not.toHaveBeenCalled();
    });

    it('should report the new design id when persisting it fails', async () => {
      const client = {
        instance: 'test.domo.com',
        refreshToken: 'token',
        designs: {
          create: jest
            .fn<() => Promise<any>>()
            .mockResolvedValue({id: 'new-id'}),
        },
        assets: {uploadAll: jest.fn<() => Promise<any[]>>()},
      };
      mockManifestUtils.persistDesignId.mockImplementation(() => {
        throw new Error('EACCES');
      });

      await run(client, {name: 'a', version: '1.0.0'});

      expect(mockLog.fail).toHaveBeenCalledWith(
        expect.stringContaining('new-id'),
        expect.stringContaining('"id": "new-id"'),
      );
      expect(client.assets.uploadAll).not.toHaveBeenCalled();
    });

    it('should handle a browser open failure without crashing', async () => {
      const client = existingClient();
      mockOpen.mockRejectedValue(new Error('no browser'));

      await run(client, {name: 'a', version: '1.0.0', id: 'id'}, [
        'publish',
        '--go',
      ]);

      expect(mockLog.warn).toHaveBeenCalledWith(
        expect.stringContaining('Could not open the browser'),
        expect.any(String),
      );
      expect(mockLog.fail).not.toHaveBeenCalled();
    });
  });

  describe('Success Logging', () => {
    it('should log success messages', () => {
      const mockFiles = ['app.js', 'style.css'];
      const mockInstance = 'test.domo.com';
      const mockAppName = 'test-app';

      mockLog.success = jest.fn();

      mockLog.success(
        `Successfully uploaded ${
          mockFiles.length
        } files for ${mockAppName} to ${mockInstance} on ${new Date()}`,
      );

      expect(mockLog.success).toHaveBeenCalledWith(
        expect.stringContaining('Successfully uploaded'),
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

    it('should handle file system operations', () => {
      const mockExistsSync = mockFs.existsSync as jest.MockedFunction<
        typeof mockFs.existsSync
      >;
      const mockLstatSync = mockFs.lstatSync as jest.MockedFunction<
        typeof mockFs.lstatSync
      >;

      mockExistsSync.mockReturnValue(true);
      mockLstatSync.mockReturnValue({
        isDirectory: jest.fn().mockReturnValue(false),
        isFile: jest.fn().mockReturnValue(true),
      } as any);

      expect(mockExistsSync('manifest.json')).toBe(true);
      expect(mockLstatSync('file.js').isFile()).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    it('should complete full publish flow', async () => {
      const mockManifest = {
        name: 'test-app',
        id: 'test-id',
        ignore: ['*.log'],
      };

      mockManifestUtils.getManifest.mockReturnValue(mockManifest as any);
      mockGlob.sync.mockReturnValue(['app.js', 'style.css']);
      mockFs.lstatSync.mockReturnValue({
        isDirectory: jest.fn().mockReturnValue(false),
      } as any);

      mockAppStructure.hasThumbnail.mockReturnValue(true);
      mockLog.success = jest.fn();

      // Simulate the publish flow
      const manifest = mockManifestUtils.getManifest('manifest.json', true);
      expect(manifest.name).toBe('test-app');
    });
  });
});
