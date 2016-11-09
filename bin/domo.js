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
var glob = require('glob');
var verifyNodeVersion = require('../util/verifyNodeVersion');
verifyNodeVersion();
require('../polyfills/endswith');

var cliVersion = require(path.resolve(__dirname + '/../package.json')).version;

program
  .version(cliVersion, '-v, --version')
  .option('-w, --watch', '[DEPRECATED] publish Custom App design every time a file changes')
  .option('-vb, --verbose', 'log more details including XHR responses, useful for troubleshooting')
  .option('-m, --manifest [type]', 'use a specific manifest file');

// import all commands
glob
  .sync(path.resolve(__dirname + "/../commands/*.js"))
  .forEach(function(command){
    require(command)(program);
  });

if (!process.argv.slice(2).length) {
    program.help();
} else {
    program.parse(process.argv);

    if (!program.args || !program.args[0] || !(program.args[0] instanceof program.Command)) {
        console.log('  Invalid option "%s"', program.args[0]);
        program.help();
    }
}
