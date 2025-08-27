import {Command} from 'commander';
import {BaseCommand, CommandOptions} from '../../util/BaseCommand';
import {log} from '../../util/log';

jest.mock('../../util/log');

class TestCommand extends BaseCommand {
  public testOptions: CommandOptions = {};

  protected configure(): void {
    this.program
      .command('test')
      .description('Test command')
      .option('-v, --verbose', 'Verbose output')
      .action(options => {
        this.options = options;
        this.testOptions = options;
        this.run();
      });
  }

  public run(): void {
    this.logInfo('Test command executed');
  }
}

describe('BaseCommand', () => {
  let program: Command;
  let testCommand: TestCommand;
  const mockLog = log as jest.Mocked<typeof log>;

  beforeEach(() => {
    program = new Command();
    testCommand = new TestCommand(program);
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with program and empty options', () => {
      expect(testCommand['program']).toBe(program);
      expect(testCommand['options']).toEqual({});
    });

    it('should call configure during construction', () => {
      const configureSpy = jest.spyOn(
        TestCommand.prototype,
        'configure' as any,
      );
      new TestCommand(program);
      expect(configureSpy).toHaveBeenCalled();
    });
  });

  describe('logging methods', () => {
    it('should call log.info when logInfo is called', () => {
      testCommand['logInfo']('test message', 'submessage');
      expect(mockLog.info).toHaveBeenCalledWith('test message', 'submessage');
    });

    it('should call log.ok when logOk is called', () => {
      testCommand['logOk']('test message');
      expect(mockLog.ok).toHaveBeenCalledWith('test message');
    });

    it('should call log.fail when logFail is called', () => {
      testCommand['logFail']('test message', 'submessage');
      expect(mockLog.fail).toHaveBeenCalledWith('test message', 'submessage');
    });

    it('should call log.warn when logWarn is called', () => {
      testCommand['logWarn']('test message');
      expect(mockLog.warn).toHaveBeenCalledWith('test message');
    });
  });

  describe('command configuration', () => {
    it('should configure command properly', () => {
      const commands = program.commands;
      expect(commands).toHaveLength(1);
      expect(commands[0].name()).toBe('test');
      expect(commands[0].description()).toBe('Test command');
    });
  });
});
