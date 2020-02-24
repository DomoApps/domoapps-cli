#!/usr/bin/env node --harmony
"use strict";
/**
 * This executable will take care of capturing user input,
 * passing data on to the domo lib and informing user of results.
 * First it will check for supported Node versions.
 *
 */
Object.defineProperty(exports, "__esModule", { value: true });
var path = require("path");
var program = require("commander");
var glob = require("glob");
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
    .forEach(function (command) {
    require(command)(program);
});
if (!process.argv.slice(2).length) {
    program.help();
}
else {
    program.parse(process.argv);
    var has_command = false;
    if (!program.args) {
        program.args = [];
    }
    for (var i = 0, len = program.args.length; i < len; i++) {
        //@ts-ignore
        if (program.args[i] instanceof program.Command) {
            has_command = true;
            break;
        }
    }
    if (!has_command) {
        console.log('  Invalid option "%s"', program.args.join(' '));
        program.help();
    }
}
//# sourceMappingURL=domo.js.map