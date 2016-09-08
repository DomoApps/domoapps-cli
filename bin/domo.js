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
var server = require('../server/server');
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

program
  .command('delete')
  .description('Deletes a published design')
  .option('-i, --design_id <id>', 'Specify design ID, otherwise it is retrieved from a manifest file')
  .option('-f, --force', 'Delete the design even if it is referenced by Custom Apps')
  .action(function(options) {

    var designId;
    if (options.design_id) {
      designId = options.design_id;
      if (!designId || !validator.isUUID(designId)) return fail('The value specified for option -i is not a valid design ID', designId);
    } else {
      var manifest = getManifest();
      if (!manifest || !manifest.id) return fail('No manifest found. Please supply design id using -i or change to a directory with a valid manifest file');
      designId = manifest.id;
    }

    var force = false;
    if (options.force) force = true;

    var login = Login.getMostRecentLogin();
    Login.verifyLogin(login);

    var domo = new Domo(login.instance, login.sid, login.devtoken);

    domo.deleteDesign(designId, force)
      .tap(evoke(ok, 'Deleted design ' + designId))
      .catch(evoke(fail, 'Unable to delete design ' + designId))
      .finally(process.exit)
  });


program
  .command('migrate')
  .description('migrate a mason app to a Custom App')
  .action(function(){
    var manifest = getManifest();
    if (!manifest) return;


    inquirer.prompt([
      {
        type: "input",
        message: "Domo instance",
        name: "instance",
        default: mostRecent.instance
      },
      {
        type: "input",
        message: "app id",
        name: "id"
      }
    ], function(answers) {
      var login = Login.getLogin(answers.instance);
      Login.verifyLogin(login);

      var domo = new Domo(answers.instance, login.sid, login.devtoken);

      migrateApp(domo, answers.id, manifest)
        .tap(evoke(ok, 'Migration successful'))
        .catch(evoke(fail, 'Migration unsuccessful'))
        .finally(process.exit)
    });
  });

program
  .command('revert')
  .description('revert a migration, turning a Custom App back into a mason app')
  .action(function(){

    inquirer.prompt([
      {
        type: "input",
        message: "Domo instance",
        name: "instance",
        default: mostRecent.instance
      },
      {
        type: "input",
        message: "app id",
        name: "id"
      }
    ], function(answers) {
      var login = Login.getLogin(answers.instance);
      Login.verifyLogin(login);

      var domo = new Domo(answers.instance, login.sid, login.devtoken);
      domo.getKpi(answers.id)
          .then(function(kpi){
            kpi.type = kpi.metadata.chartType = kpi.metadata.kpiType = 'mason';
            return kpi;
          })
          .then(function(kpi){
            return domo.updateKpi(kpi);
          })
          .tap(evoke(ok, 'Card reverted back to a mason app'))
          .catch(evoke(fail, 'Error attempting to revert card'))
          .finally(process.exit)
    });

  });

program
  .option('--userId [value]', 'Use a specific userId')
  .command('dev')
  .description('work locally on a Custom App')
  .action(function(){
    var options = {
      userId: program.userId,
      manifest: program.manifest
    };

    var login = Login.getMostRecentLogin();
    Login.verifyLogin(login);
    var domo = new Domo(login.instance, login.sid, login.devtoken);
    server.start(domo, options).catch(fail)
  });

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


/**
 * migrate a mason app to a Custom App
 * 1. get the kpi info
 * 2. create a new Custom App design
 * 3. publish design assets
 * 4. create a new Custom App
 * 5. update the kpi
 */
function migrateApp(domo, appId, manifest){
  return Promise.all([
    domo.getKpi(appId),

        // .catch(evoke(fail, 'No app found with id ' + appId)),
    // publish new design (and persist id) if not already published
    domo.createDesign(manifest)
      .tap(evoke(ok, 'Design published'))
      .then(function(designResult){
        var design = designResult[0];
        return persistDesignId(design, manifest);
      })
      .catch(function(){
        return manifest;
      })
  ])
  .spread(function(kpi, design){
    return domo
        .createApp(design.id)
        .tap(evoke(ok, 'New Custom App created'))
        .catch(evoke(fail, 'Error creating new Custom App'))
        .then(function(domoapp){
          kpi.type = kpi.metadata.chartType = kpi.metadata.kpiType = 'domoapp';
          kpi.domoapp.id = domoapp.id;

          return domo.updateKpi(kpi)
              .tap(evoke(ok, 'Card type updated and linked'))
              .catch(evoke(fail, 'Error updating card'))
              .then(function(){
                return domo.uploadAllAssets(manifest);
              })
              .tap(evoke(ok, 'Assets uploaded'))
              .catch(evoke(fail, 'Error uploading assets'));
        });
  });

}

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
