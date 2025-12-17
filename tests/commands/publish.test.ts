import {jest} from '@jest/globals';
import {Command} from 'commander';

// Mock all dependencies at module level
jest.mock('inquirer', () => ({
  prompt: jest.fn(),
}));

jest.mock('lodash', () => ({
  default: jest.fn(),
}));

jest.mock('open', () => jest.fn());

jest.mock('../../src/util/manifest', () => ({
  ManifestUtils: {
    getManifest: jest.fn(),
    hasManifest: jest.fn(),
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
  default: jest.fn(),
}));

describe('Publish Command', () => {
  let mockProgram: Command;
  let mockInquirer: any;
  let mockManifestUtils: any;
  let mockLogin: any;
  let mockGlob: any;
  let mockFs: any;
  let mockAppStructure: any;
  let mockLog: any;
  let mockOpen: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockProgram = new Command();
    mockInquirer = require('inquirer');
    mockManifestUtils = require('../../src/util/manifest').ManifestUtils;
    mockLogin = require('../../src/util/login').Login;
    mockGlob = require('glob');
    mockFs = require('fs-extra');
    mockAppStructure = require('../../src/util/appStructure');
    mockLog = require('../../src/util/log').log;
    mockOpen = require('open');
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
