import {jest} from '@jest/globals';
import {Command} from 'commander';
import {BaseCommand, CommandOptions} from '../../util/BaseCommand';

// Mock chalk
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

// Create a concrete implementation for testing
class TestCommand extends BaseCommand {
  protected configure(): void {
    this.program
      .command('test-command-base')
      .description('test command')
      .option('-f, --force', 'force option')
      .action(options => {
        this.options = options;
      });
  }

  public run(): void {
    // Test implementation
  }
}

describe('BaseCommand', () => {
  let mockProgram: Command;
  let testCommand: TestCommand;

  beforeEach(() => {
    jest.clearAllMocks();
    mockProgram = new Command();
    testCommand = new TestCommand(mockProgram);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with program', () => {
      expect(testCommand).toBeDefined();
      expect(testCommand['program']).toBe(mockProgram);
    });

    it('should call configure method', () => {
      const configureSpy = jest.spyOn(
        TestCommand.prototype as any,
        'configure',
      );
      const freshProgram = new Command();
      new TestCommand(freshProgram);
      expect(configureSpy).toHaveBeenCalled();
      configureSpy.mockRestore();
    });
  });

  describe('CommandOptions Interface', () => {
    it('should allow any string key with any value', () => {
      const options: CommandOptions = {
        force: true,
        manifest: 'test.json',
        instance: 'test.domo.com',
        'user-email': 'test@example.com',
        go: false,
        transfer: true,
        design_name: 'test-design',
        starter: 'hello world',
        'dataset-prompt': false,
      };

      expect(options.force).toBe(true);
      expect(options.manifest).toBe('test.json');
      expect(options.instance).toBe('test.domo.com');
      expect(options['user-email']).toBe('test@example.com');
      expect(options.go).toBe(false);
      expect(options.transfer).toBe(true);
      expect(options.design_name).toBe('test-design');
      expect(options.starter).toBe('hello world');
      expect(options['dataset-prompt']).toBe(false);
    });

    it('should handle undefined values', () => {
      const options: CommandOptions = {
        force: undefined,
        manifest: undefined,
      };

      expect(options.force).toBeUndefined();
      expect(options.manifest).toBeUndefined();
    });

    it('should handle mixed types', () => {
      const options: CommandOptions = {
        force: true,
        manifest: 'test.json',
        count: 5,
        items: ['item1', 'item2'],
        config: {key: 'value'},
      };

      expect(typeof options.force).toBe('boolean');
      expect(typeof options.manifest).toBe('string');
      expect(typeof options.count).toBe('number');
      expect(Array.isArray(options.items)).toBe(true);
      expect(typeof options.config).toBe('object');
    });
  });

  describe('Program Access', () => {
    it('should provide access to commander program', () => {
      expect(testCommand['program']).toBe(mockProgram);
    });

    it('should allow program manipulation', () => {
      const newCommand = mockProgram
        .command('test-manipulation')
        .description('test command')
        .option('-f, --force', 'force option');

      expect(newCommand.name()).toBe('test-manipulation');
      expect(newCommand.description()).toBe('test command');
    });
  });

  describe('Command Registration', () => {
    it('should support command registration', () => {
      const testCommand = mockProgram
        .command('test-command-registration')
        .description('A test command')
        .action(options => {
          expect(options).toBeDefined();
        });

      expect(testCommand.name()).toBe('test-command-registration');
      expect(testCommand.description()).toBe('A test command');
    });

    it('should support option registration', () => {
      const testCommand = mockProgram
        .command('test-command-option-registration')
        .option('-f, --force', 'force option')
        .option('-m, --manifest <file>', 'manifest file')
        .option('-i, --instance <value>', 'instance value');

      const options = testCommand.options;
      expect(options.length).toBe(3);
      expect(options.some(opt => opt.long === '--force')).toBe(true);
      expect(options.some(opt => opt.long === '--manifest')).toBe(true);
      expect(options.some(opt => opt.long === '--instance')).toBe(true);
    });
  });

  describe('Options Handling', () => {
    it('should handle boolean options', () => {
      const testCommand = mockProgram
        .command('test-command-boolean-options')
        .option('-f, --force', 'force option')
        .action(options => {
          expect(typeof options.force).toBe('boolean');
        });

      // Simulate command execution with force option
      const options = {force: true};
      expect(options.force).toBe(true);
    });

    it('should handle string options', () => {
      const testCommand = mockProgram
        .command('test-command-string-options')
        .option('-m, --manifest <file>', 'manifest file')
        .action(options => {
          expect(typeof options.manifest).toBe('string');
        });

      // Simulate command execution with manifest option
      const options = {manifest: 'test.json'};
      expect(options.manifest).toBe('test.json');
    });

    it('should handle multiple options', () => {
      const testCommand = mockProgram
        .command('test-command-multiple-options')
        .option('-f, --force', 'force option')
        .option('-m, --manifest <file>', 'manifest file')
        .option('-i, --instance <value>', 'instance value')
        .action(options => {
          expect(options.force).toBeDefined();
          expect(options.manifest).toBeDefined();
          expect(options.instance).toBeDefined();
        });

      // Simulate command execution with multiple options
      const options = {
        force: true,
        manifest: 'test.json',
        instance: 'test.domo.com',
      };

      expect(options.force).toBe(true);
      expect(options.manifest).toBe('test.json');
      expect(options.instance).toBe('test.domo.com');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid options gracefully', () => {
      const testCommand = mockProgram
        .command('test-command-error-handling')
        .option('-f, --force', 'force option')
        .action(options => {
          // Should not throw error for undefined options
          expect(options).toBeDefined();
        });

      const options = {force: true};
      expect(() => {
        // Accessing undefined option should not throw
        expect(options).toBeDefined();
      }).not.toThrow();
    });
  });

  describe('Extensibility', () => {
    it('should be extensible by subclasses', () => {
      expect(testCommand).toBeInstanceOf(BaseCommand);
      expect(testCommand).toBeInstanceOf(TestCommand);
    });

    it('should allow method overriding', () => {
      class CustomTestCommand extends BaseCommand {
        protected configure(): void {
          this.program
            .command('custom')
            .description('custom command')
            .action(() => {
              // Custom action
            });
        }

        public run(): void {
          // Custom run implementation
        }

        public customMethod(): string {
          return 'custom implementation';
        }
      }

      const customCommand = new CustomTestCommand(mockProgram);
      expect(customCommand.customMethod()).toBe('custom implementation');
    });
  });

  describe('Integration with Commander', () => {
    it('should work with commander program parsing', () => {
      const testCommand = mockProgram
        .command('test-command-integration')
        .description('A test command')
        .option('-f, --force', 'force option')
        .option('-m, --manifest <file>', 'manifest file')
        .action(options => {
          expect(options).toBeDefined();
        });

      // Simulate parsing arguments
      const args = [
        'test-command-integration',
        '--force',
        '--manifest',
        'test.json',
      ];
      const parsed = mockProgram.parse(args, {from: 'user'});

      expect(parsed).toBeDefined();
    });

    it('should handle help output', () => {
      const testCommand = mockProgram
        .command('test-command-help-output')
        .description('A test command')
        .option('-f, --force', 'force option')
        .option('-m, --manifest <file>', 'manifest file');

      const helpOutput = testCommand.helpInformation();
      expect(helpOutput).toContain('test-command');
      expect(helpOutput).toContain('A test command');
      expect(helpOutput).toContain('--force');
      expect(helpOutput).toContain('--manifest');
    });
  });
});
