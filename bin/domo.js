#!/usr/bin/env node --harmony
/**
 * This executable will take care of capturing user input,
 * passing data on to the domo lib and informing user of results.
 * First it will check for supported Node versions.
 *
 */

var semver = require('semver');
var chalk = require('chalk');
var program = require('commander');
var log = require('../util/log');
var Login = require('../util/login');
var evoke = require('../util/evoke');
var ok = log.ok;
var fail = log.fail;
var warn = log.warn;
var info = log.info;

verifyNodeVersion();

var path = require('path');
var _ = require('lodash');
var glob = require("glob");
var fs = require('fs-extra');
var Domo = require('ryuu-client');
var home = Domo.getHomeDir();
var inquirer = require("inquirer");
var Promise = require('bluebird');
var validator = require('validator');
var request = Promise.promisify(require('request'));
require('../polyfills/endswith');
var multichoice = require('../util/multichoice');
var appStructure = require('../util/appStructure');
var messages = require('../util/messages');

var cliVersion = require(path.resolve(__dirname + '/../package.json')).version;


var mostRecent = Login.getMostRecentLogin();

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


function verifyNodeVersion(){
  var version = semver(process.version);
  var compatible = semver.gte(version, '0.12.0');
  if(!compatible){
    fail('Unsupported Node version', 'Please upgrade to Node v0.12.0 or higher. https://nodejs.org/');
  }
}

/**
 * update the manifest (in memory and on disk)
 */
function persistDesignId(design, manifest){
  manifest.id = design.id;
  updateManifest(manifest);
  return design;
}

function updateManifest(manifest){
  fs.writeJsonSync('manifest.json', manifest, {spaces: 2});
}


Date.prototype.timeNow = function () {
     return "(" + ((this.getHours() < 10)?"0":"") + this.getHours() +":"+ ((this.getMinutes() < 10)?"0":"") + this.getMinutes() +":"+ ((this.getSeconds() < 10)?"0":"") + this.getSeconds() + ")";
}
