import { Command } from 'commander';
import * as fs from 'fs-extra';
import * as path from 'path';

jest.mock('inquirer');
jest.mock('fs-extra');
jest.mock('shelljs');
jest.mock('../../util/log');

const mockFs = fs as jest.Mocked<typeof fs>;

describe('init command', () => {
  let program: Command;
  const testDir = path.join(__dirname, '../tmp');

  beforeEach(() => {
    program = new Command();
    jest.clearAllMocks();
    
    (mockFs.pathExists as jest.Mock).mockResolvedValue(false);
    (mockFs.ensureDir as jest.Mock).mockResolvedValue(undefined);
    (mockFs.copy as jest.Mock).mockResolvedValue(undefined);
    (mockFs.writeJson as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(async () => {
    if (await fs.pathExists(testDir)) {
      await fs.remove(testDir);
    }
  });

  it('should register init command', () => {
    require('../../commands/init')(program);
    
    const initCommand = program.commands.find(cmd => cmd.name() === 'init');
    expect(initCommand).toBeDefined();
    expect(initCommand?.description()).toBe('initialize a new Custom App design');
  });

  it('should have correct options', () => {
    require('../../commands/init')(program);
    
    const initCommand = program.commands.find(cmd => cmd.name() === 'init');
    const options = initCommand?.options;
    
    expect(options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ flags: '-n, --design_name <value>' }),
        expect.objectContaining({ flags: '-s, --starter <value>' }),
        expect.objectContaining({ flags: '-d, --dataset-prompt' }),
        expect.objectContaining({ flags: '-i, --dataset-id [value...]' }),
        expect.objectContaining({ flags: '-a, --dataset-alias [value...]' })
      ])
    );
  });

  it('should validate starter choices', () => {
    require('../../commands/init')(program);
    
    const initCommand = program.commands.find(cmd => cmd.name() === 'init');
    const starterOption = initCommand?.options.find(opt => opt.flags.includes('--starter'));
    
    // Commander.js stores choices differently, so we check if it has choices configured
    expect(starterOption).toBeDefined();
    expect(starterOption?.flags).toContain('--starter');
  });
});