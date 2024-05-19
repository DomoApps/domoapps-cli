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
import {version} from '../package.json';

program
  .version(version, '-v, --version')
  .option('-s, --ssl', 'disable SSL')
  .hook('preAction', preliminaryCommand => {
    if (preliminaryCommand.opts().ssl)
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  })
  .option('-m, --manifest <id>', 'supply a filepath to a manifest');

// import all commands
glob.sync(path.resolve(__dirname + '/../commands/*.js')).forEach(command => {
  require(command)(program);
});

program.parse(process.argv);
