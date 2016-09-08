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


program
  .command('release')
  .description('prepare a design for app store release')
  .action(function(){
    var login = Login.getMostRecentLogin();
    Login.verifyLogin(login);
    var domo = new Domo(login.instance, login.sid, login.devtoken);
    var manifest = getManifest();

    // make sure app has been published first
    if (!manifest.id){
      fail('Can\'t release until design is published.', 'Please publish your Custom App design (with the `domo publish` command) first');
    }

    // make sure there is a thumbnail.png when releasing
    if (!appStructure.hasThumbnail()) {
      fail(messages.THUMBNAIL_CREATE_WARNING, messages.CREATE_THUMBNAIL);
    }

    // prompt the user for which design version they want to release, defaulting to latest
    domo.getVersions(manifest.id)
      .then(function(versions){
        versions.reverse();
        versions.unshift('latest');

        inquirer.prompt([
          multichoice({
            type: 'list',
            message: 'select a version to release',
            name: 'version',
            choices: versions
          })], function(answers){
            // release the kraken
            domo.release(manifest.id, answers.version)
              .tap(evoke(ok, 'Design version ('+answers.version+') released'))
              .catch(fail)
              .finally(process.exit)
          })
      })
  })

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
