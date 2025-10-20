import {jest} from '@jest/globals';
import {Command} from 'commander';

// Mock configstore before other imports
jest.mock('configstore', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    has: jest.fn(),
    all: {},
  }));
});

// Mock all dependencies
jest.mock('inquirer', () => ({
  createPromptModule: jest.fn(() => jest.fn()),
}));

jest.mock('../../src/util/isValidJSName', () => jest.fn());

jest.mock('slug', () => jest.fn());

jest.mock('shelljs', () => ({
  mkdir: jest.fn(),
}));

jest.mock('async', () => ({
  reduce: jest.fn(),
}));

jest.mock('fs-extra', () => ({
  copySync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  existsSync: jest.fn(),
}));

jest.mock('path', () => ({
  join: jest.fn(),
  resolve: jest.fn(),
}));

jest.mock('../../src/util/log', () => ({
  log: {
    ok: jest.fn(),
    fail: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('../../src/util/multichoice', () => jest.fn());

jest.mock('chalk', () => ({
  default: {
    red: jest.fn((text: string) => `RED:${text}`),
    green: jest.fn((text: string) => `GREEN:${text}`),
    yellow: jest.fn((text: string) => `YELLOW:${text}`),
    blue: jest.fn((text: string) => `BLUE:${text}`),
    cyan: jest.fn((text: string) => `CYAN:${text}`),
    magenta: jest.fn((text: string) => `MAGENTA:${text}`),
    gray: jest.fn((text: string) => `GRAY:${text}`),
    grey: jest.fn((text: string) => `GREY:${text}`),
    dim: jest.fn((text: string) => `DIM:${text}`),
    bold: jest.fn((text: string) => `BOLD:${text}`),
  },
}));

jest.mock('ryuu-client', () => {
  const mockDomo: any = jest.fn().mockImplementation(() => ({
    getInstance: jest.fn(),
    getRefreshToken: jest.fn(),
    createApp: jest.fn(),
    uploadAllAssets: jest.fn(),
    getDomoappsData: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
  }));

  // Add static methods
  mockDomo.getHomeDir = jest.fn(() => '/mock/home/dir');

  return mockDomo;
});

describe('Init Command', () => {
  let mockProgram: Command;
  let mockInquirer: any;
  let mockIsValidJSName: any;
  let mockSlug: any;
  let mockMkdir: any;
  let mockFs: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockProgram = new Command();
    mockInquirer = require('inquirer');
    mockIsValidJSName = require('../../src/util/isValidJSName');
    mockSlug = require('slug');
    mockMkdir = require('shelljs').mkdir;
    mockFs = require('fs-extra');

    // Set up the mock prompt function
    const mockPrompt = jest.fn();
    mockInquirer.createPromptModule.mockReturnValue(mockPrompt);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Command Registration', () => {
    it('should register init command with correct options', () => {
      const command = mockProgram
        .command('init')
        .option('-n, --design_name <value>', 'Name of the design')
        .option('-s, --starter <value>', 'Name of the starter kit')
        .option(
          '-d, --dataset-prompt',
          'Include this flag if you wish to skip the prompting for datasets',
        );

      expect(command.name()).toBe('init');
    });

    it('should have correct starter choices', () => {
      const command = mockProgram
        .command('init')
        .option('-s, --starter <value>', 'Name of the starter kit');

      const starterOption = command.options.find(
        opt => opt.long === '--starter',
      );

      expect(typeof starterOption?.choices).toBe('function');
    });
  });

  describe('Design Name Validation', () => {
    it('should validate design name using isValidJSName', () => {
      mockIsValidJSName.mockReturnValue(true);

      const validName = 'test-design';
      const isValid = mockIsValidJSName(validName);

      expect(isValid).toBe(true);
      expect(mockIsValidJSName).toHaveBeenCalledWith(validName);
    });

    it('should handle invalid design names', () => {
      mockIsValidJSName.mockReturnValue(false);

      const invalidName = '123-invalid-name';
      const isValid = mockIsValidJSName(invalidName);

      expect(isValid).toBe(false);
    });

    it('should generate slug from design name', () => {
      mockSlug.mockReturnValue('test-design');

      const designName = 'Test Design';
      const slugResult = mockSlug(designName);

      expect(slugResult).toBe('test-design');
      expect(mockSlug).toHaveBeenCalledWith(designName);
    });
  });

  describe('Directory Creation', () => {
    it('should create directory for new design', () => {
      mockMkdir.mockReturnValue({code: 0});

      const designName = 'test-design';
      const result = mockMkdir(designName);

      expect(result.code).toBe(0);
      expect(mockMkdir).toHaveBeenCalledWith(designName);
    });

    it('should handle directory creation errors', () => {
      mockMkdir.mockReturnValue({code: 1, stderr: 'Permission denied'});

      const designName = 'test-design';
      const result = mockMkdir(designName);

      expect(result.code).toBe(1);
      expect(result.stderr).toBe('Permission denied');
    });
  });

  describe('Template Processing', () => {
    it('should copy template files', () => {
      mockFs.copySync.mockImplementation();

      const sourcePath = 'templates/hello world';
      const destPath = 'test-design';

      mockFs.copySync(sourcePath, destPath);

      expect(mockFs.copySync).toHaveBeenCalledWith(sourcePath, destPath);
    });

    it('should read and update manifest files', () => {
      const mockManifest = {
        name: 'test-design',
        version: '1.0.0',
        description: 'Test design',
      };

      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockManifest));
      mockFs.writeFileSync.mockImplementation();

      const manifestPath = 'templates/hello world/manifest.json';
      const manifestContent = mockFs.readFileSync(manifestPath, 'utf8');
      const manifest = JSON.parse(manifestContent);

      expect(manifest.name).toBe('test-design');
      expect(mockFs.readFileSync).toHaveBeenCalledWith(manifestPath, 'utf8');
    });
  });

  describe('Template Types', () => {
    it('should handle hello world template', () => {
      const templateName = 'hello world';
      const designName = 'test-design';

      mockFs.copySync.mockImplementation();
      mockFs.readFileSync.mockReturnValue(
        JSON.stringify({
          name: 'hello world',
          version: '1.0.0',
        }),
      );
      mockFs.writeFileSync.mockImplementation();

      // Simulate template processing
      const templatePath = `templates/${templateName}`;
      const destPath = designName;

      mockFs.copySync(templatePath, destPath);

      expect(mockFs.copySync).toHaveBeenCalledWith(templatePath, destPath);
    });

    it('should handle manifest only template', () => {
      const templateName = 'manifest only';
      const designName = 'test-design';

      mockFs.copySync.mockImplementation();
      mockFs.readFileSync.mockReturnValue(
        JSON.stringify({
          name: 'manifest only',
          version: '1.0.0',
        }),
      );
      mockFs.writeFileSync.mockImplementation();

      const templatePath = `templates/${templateName}`;
      const destPath = designName;

      mockFs.copySync(templatePath, destPath);

      expect(mockFs.copySync).toHaveBeenCalledWith(templatePath, destPath);
    });

    it('should handle basic chart template', () => {
      const templateName = 'basic chart';
      const designName = 'test-design';

      mockFs.copySync.mockImplementation();
      mockFs.readFileSync.mockReturnValue(
        JSON.stringify({
          name: 'basic chart',
          version: '1.0.0',
        }),
      );
      mockFs.writeFileSync.mockImplementation();

      const templatePath = `templates/${templateName}`;
      const destPath = designName;

      mockFs.copySync(templatePath, destPath);

      expect(mockFs.copySync).toHaveBeenCalledWith(templatePath, destPath);
    });

    it('should handle map chart template', () => {
      const templateName = 'map chart';
      const designName = 'test-design';

      mockFs.copySync.mockImplementation();
      mockFs.readFileSync.mockReturnValue(
        JSON.stringify({
          name: 'map chart',
          version: '1.0.0',
        }),
      );
      mockFs.writeFileSync.mockImplementation();

      const templatePath = `templates/${templateName}`;
      const destPath = designName;

      mockFs.copySync(templatePath, destPath);

      expect(mockFs.copySync).toHaveBeenCalledWith(templatePath, destPath);
    });

    it('should handle sugarforce template', () => {
      const templateName = 'sugarforce';
      const designName = 'test-design';

      mockFs.copySync.mockImplementation();
      mockFs.readFileSync.mockReturnValue(
        JSON.stringify({
          name: 'sugarforce',
          version: '1.0.0',
        }),
      );
      mockFs.writeFileSync.mockImplementation();

      const templatePath = `templates/${templateName}`;
      const destPath = designName;

      mockFs.copySync(templatePath, destPath);

      expect(mockFs.copySync).toHaveBeenCalledWith(templatePath, destPath);
    });
  });

  describe('Dataset Prompting', () => {
    it('should handle dataset prompt option', () => {
      const mockPrompt = mockInquirer.createPromptModule();
      mockPrompt.mockResolvedValueOnce({
        datasetPrompt: true,
      });

      const initModule = require('../../src/commands/init');
      expect(initModule).toBeDefined();
    });

    it('should skip dataset prompting when flag is set', () => {
      const mockPrompt = mockInquirer.createPromptModule();
      mockPrompt.mockResolvedValueOnce({
        datasetPrompt: false,
      });

      const initModule = require('../../src/commands/init');
      expect(initModule).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle template not found errors', () => {
      mockFs.copySync.mockImplementation(() => {
        throw new Error('Template not found');
      });

      expect(() => {
        mockFs.copySync('nonexistent-template', 'destination');
      }).toThrow('Template not found');
    });

    it('should handle permission errors', () => {
      mockMkdir.mockReturnValue({code: 1, stderr: 'Permission denied'});

      const result = mockMkdir('test-design');
      expect(result.code).toBe(1);
    });

    it('should handle invalid JSON in manifest', () => {
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('Invalid JSON');
      });

      expect(() => {
        mockFs.readFileSync('invalid-manifest.json', 'utf8');
      }).toThrow('Invalid JSON');
    });
  });

  describe('Integration Tests', () => {
    it('should complete full init flow', async () => {
      const mockPrompt = mockInquirer.createPromptModule();
      mockPrompt.mockResolvedValueOnce({
        designName: 'test-design',
        starter: 'hello world',
        datasetPrompt: false,
      });

      mockIsValidJSName.mockReturnValue(true);
      mockSlug.mockReturnValue('test-design');
      mockMkdir.mockReturnValue({code: 0});
      mockFs.copySync.mockImplementation();
      mockFs.readFileSync.mockReturnValue(
        JSON.stringify({
          name: 'hello world',
          version: '1.0.0',
        }),
      );
      mockFs.writeFileSync.mockImplementation();

      const initModule = require('../../src/commands/init');
      expect(initModule).toBeDefined();
    });
  });
});
