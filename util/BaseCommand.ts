import { Command } from 'commander';
import { log } from './log';

export interface CommandOptions {
  [key: string]: any;
  force?: boolean;
  confirm?: boolean;
  datasetPrompt?: boolean;
  removeProxy?: boolean;
  auth?: string;
  go?: boolean;
  all?: boolean;
  instance?: string;
  token?: string;
  appContextId?: string;
  cardId?: string;
  oAuthEnabled?: boolean;
}

export abstract class BaseCommand {
  protected program: Command;
  protected options: CommandOptions;

  constructor(program: Command) {
    this.program = program;
    this.options = {};
    this.configure();
  }

  // Subclasses must implement this to set up command, options, and action
  protected abstract configure(): void;

  // Subclasses must implement this to provide main logic
  public abstract run(...args: any[]): Promise<void> | void;

  protected logInfo(...args: [message: string, submessage?: string]) {
    log.info(...args);
  }
  protected logOk(...args: [message: string, submessage?: string]) {
    log.ok(...args);
  }
  protected logFail(...args: [message: string, submessage?: string]) {
    log.fail(...args);
  }
  protected logWarn(...args: [message: string, submessage?: string]) {
    log.warn(...args);
  }
}
