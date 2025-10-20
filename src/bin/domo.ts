#!/usr/bin/env node --harmony
/**
 * This executable will take care of capturing user input,
 * passing data on to the domo lib and informing user of results.
 * First it will check for supported Node versions.
 *
 */

import path = require('path');
import {program} from 'commander';
import glob = require('glob');
import {version} from '../../package.json';
import {checkSystemRequirements} from '../util/systemCheck';
import {getRainbowLogo} from '../models/enums/constant';

// Force colors for chalk
process.env.FORCE_COLOR = '1';

// Show logo for main command, version, or help
const args = process.argv.slice(2);
const shouldShowLogo =
  args.length === 0 || // No arguments (just 'domo')
  (args.length === 1 && (args.includes('--version') || args.includes('-v'))) || // Version command only
  (args.length === 1 && (args.includes('--help') || args.includes('-h'))) || // Help command only
  (args.length === 1 && args.includes('help')); // Help subcommand only

if (shouldShowLogo) {
  console.log(getRainbowLogo());
}

checkSystemRequirements();

program
  .version(version, '-v, --version')
  .option('-s, --ssl', 'disable SSL')
  .hook('preAction', preliminaryCommand => {
    if (preliminaryCommand.opts().ssl)
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  })
  .option('-m, --manifest <id>', 'supply a filepath to a manifest')
  .helpOption('-h, --help', 'display help for command');

// import all commands in alphabetical order
glob
  .sync(path.resolve(__dirname + '/../commands/*.js'))
  .sort()
  .forEach(command => {
    require(command)(program);
  });

program.parse(process.argv);
