#!/usr/bin/env node --harmony
/**
 * This executable will take care of capturing user input,
 * passing data on to the domo lib and informing user of results.
 * First it will check for supported Node versions.
 *
 */

import path = require('path');
import program = require('commander');
import _ = require('lodash');
import glob = require('glob');
const verifyNodeVersion = require('../util/verifyNodeVersion');
verifyNodeVersion();
require('../polyfills/endswith');

const cliVersion = require(path.resolve(__dirname + '/../package.json')).version;

program
  .version(cliVersion, '-v, --version')
  .option('-vb, --verbose', 'log more details including XHR responses, useful for troubleshooting')
  .option('-m, --manifest [type]', 'use a specific manifest file');

// import all commands
glob
  .sync(path.resolve(__dirname + "/../commands/*.js"))
  .forEach(function(command){
    require(command)(program);
  });

program.parse(process.argv);
