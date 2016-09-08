#!/usr/bin/env node --harmony
/**
 * This executable will take care of capturing user input,
 * passing data on to the domo lib and informing user of results.
 * First it will check for supported Node versions.
 *
 */

var path = require('path');
var program = require('commander');
var _ = require('lodash');
var verifyNodeVersion = require('../util/verifyNodeVersion');
verifyNodeVersion();
require('../polyfills/endswith');

var cliVersion = require(path.resolve(__dirname + '/../package.json')).version;

program
  .version(cliVersion, '-v, --version')
  .option('-w, --watch', '[DEPRECATED] publish Custom App design every time a file changes')
  .option('-vb, --verbose', 'log more details including XHR responses, useful for troubleshooting')
  .option('-m, --manifest [type]', 'use a specific manifest file')
  .parse(process.argv);


require('../commands/init')(program);
require('../commands/token')(program);
require('../commands/login')(program);
require('../commands/ls')(program);
require('../commands/download')(program);
require('../commands/publish')(program);
require('../commands/owner')(program);
require('../commands/delete')(program);
require('../commands/migrate')(program);
require('../commands/revert')(program);
require('../commands/dev')(program);
require('../commands/release')(program);

program.parse(process.argv);
