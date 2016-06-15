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
// can remove these in a few releases after deprecating older versions
cleanupLogins();
cleanupMappings();

var inquirer = require("inquirer");
var Promise = require('bluebird');
var validator = require('validator');
var server = require('../server/server');
var shell = require('shelljs');
var request = Promise.promisify(require('request'));
var extract = require('extract-zip');
require('../polyfills/endswith');
var session = require('../util/session');
var isValidJSName = require('../util/isValidJSName');
var multichoice = require('../util/multichoice');
var appStructure = require('../util/appStructure');
var messages = require('../util/messages');

var cliVersion = require(path.resolve(__dirname + '/../package.json')).version;


var mostRecent = Login.getMostRecentLogin();

program
  .version(cliVersion, '-v, --version')
  .option('-w, --watch', '[DEPRECATED] publish Custom App design every time a file changes')
  .option('-vb, --verbose', 'log more details including XHR responses, useful for troubleshooting');

program
  .command('ls')
  .description('get a list of all your Custom App designs')
  .action(function(){
    var login = Login.getMostRecentLogin();
    Login.verifyLogin(login);
    var domo = new Domo(login.instance, login.sid, login.devtoken);

    session.check(domo)
      .then(function(){

        domo.getDesigns().then(function(designs){
          var Table = require('cli-table');

          // instantiate
          var table = new Table({
            head: [chalk.cyan('Design Name'), chalk.cyan('Design Id'), chalk.cyan('Date Created'), chalk.cyan('Last Updated')]
          });

          designs.forEach(function(design){
            table.push([design.design.name, design.design.id, new Date(design.design.createdDate).toUTCString(), new Date(design.design.lastModifiedDate).toUTCString()]);
          });

          if (designs.length === 0){
            fail('No Designs Published', "`domo ls` will list designs once they're published to Domo");
          }

          console.log(table.toString());
        })
        .catch(function(e){
          fail('Unable to fetch designs', 'You may not have any designs published yet.');
        })
        .finally(process.exit)

      })
      .catch(log.notAuthenticated);
  });

program
  .command('download')
  .description('dowmload a Custom App design')
  .action(function(){
    var login = Login.getMostRecentLogin();
    Login.verifyLogin(login);

    var domo = new Domo(login.instance, login.sid, login.devtoken);

    inquirer.prompt([{
        type: 'input',
        message: 'design id',
        name: 'designId'
      },
      {
        type: 'input',
        message: 'version',
        name: 'version',
        default: 'latest'
      }], function(answers){
        var req = domo.download(answers.designId, answers.version);

        req.on('response', function(response){
          var regexp = /filename="(.*)"/;
          var name = response.headers['content-disposition'].match(regexp)[1] || 'domoapp';

          var writeStream = fs.createWriteStream('./'+name+'.zip', {flags: 'w+', mode: 0o666});
          req.pipe(writeStream);

          writeStream.on('finish', function(){
            var source = path.resolve('./'+name+'.zip');
            var target = path.resolve('./'+name);

            extract(source, {dir: target}, function(err, results) {
              if (!err){
                shell.chmod('-R', 'u+w', target);
                fs.remove(source);
                process.exit();
              }
            });
          });
        });
      });

  });

program
  .command('publish')
  .description('publish a new or existing Custom App design')
  .action(function(){
    var manifest = getManifest();
    if (!manifest) return;
    
    var login = Login.getMostRecentLogin();
    Login.verifyLogin(login);
    var domo = new Domo(login.instance, login.sid, login.devtoken);

    if (!appStructure.hasThumbnail()) {
      warn(messages.THUMBNAIL_CREATE_WARNING, messages.CREATE_THUMBNAIL);
    }

    if (!manifest.id){
      createDesign(domo, manifest, login);
    }
    else{
      domo.uploadAllAssets(manifest)
        .tap(evoke(ok, 'Publishing ' + manifest.name + ' to ' + login.instance + ' on ' + new Date()))
        .then(logUploadSuccess)
        .catch(function(e){
          if(e.statusCode === 401) {
            log.notAuthenticated(login);
          }
          else if(e.statusCode === 403) {
            fail('You do not have access to the design with id ' + manifest.id + ' on ' + login.instance
              + '.\nIf that seems unlikely, other possibilities are that you are publishing this design to a new environment other than the one in which it was first created.'
              + '\nAlternatively, you may have inadvertently changed the design id.');
          }
          else if(e.message && e.message.startsWith('DA')) {
            switch (e.message.substr(0, 6)) {
              case 'DA0086':
                warn(e.message);
                inquirer.prompt([
                  {
                    type: 'confirm',
                    message: 'This design has been deleted. Would you like to publish a new design with these assets?',
                    name: 'askRecreate'
                  }
                ], function (answers) {
                  if (answers.askRecreate){
                    manifest.id = null;
                    createDesign(domo, manifest, login);
                  }
                });

                break;

              default:
                // Pass on error messages that are in the set of documented errors.
                fail(e.message);
                break;
            }
          }
          else {
            fail(e || 'Error uploading assets');
          }
        });
    }

  });

/**
 * @param {Object} domo
 * @param {Object} manifest
 * @param {Object} login
 * @return {Promise}
 */
function createDesign(domo, manifest, login) {
  return domo.createDesign(manifest)
    .then(function(designResult){
      var design = designResult[0];
      // add the version returned when design published
      design.version = designResult[1].version;
      return persistDesignId(design, manifest);
    })
    .tap(evoke(ok, 'New design created on ' + login.instance))
    .catch(evoke(fail, 'Error creating new design'))
    .then(domo.uploadAllAssets.bind(domo))
    .then(logUploadSuccess)
    .catch(function(e){
      fail(e || 'Error uploading assets');
    });
}

require('../commands/init')(program);
require('../commands/token')(program);
require('../commands/login')(program);

program
  .command('owner <add|rm|ls> [user-emails]')
  .description('Manage design owners')
  .option('-i, --design_id <id>', 'Specify design ID, otherwise it is retrieved from a manifest file')
  .action(function(action, users, options) {

    var designId;
    if (options.design_id) {
      designId = options.design_id;
      if (!designId || !validator.isUUID(designId)) return fail('The value specified for option -i is not a valid design ID', designId);
    } else {
      var manifest = getManifest();
      if (!manifest) return fail('No manifest found. Please supply design id using -i or change to a directory with a valid manifest file');
      if (!manifest.id) return fail('No manifest id. Please publish your design before attempting to add owners to it.');
      designId = manifest.id;
    }

    var login = Login.getMostRecentLogin();
    Login.verifyLogin(login);

    var domo = new Domo(login.instance, login.sid, login.devtoken);

    switch(action) {
      case 'add':
        if (users) {
          domo.addOwners(designId, users)
            .tap(evoke(ok, 'Owners added ' + users))
            .catch(evoke(fail, 'Error adding owners'))
            .finally(process.exit)
        }
        break;
      case 'rm':
        if (users) {
          domo.removeOwners(designId, users)
            .tap(evoke(ok, 'Owners removed ' + users))
            .catch(evoke(fail, 'Error removing owners'))
            .finally(process.exit)
        }
        break;
      case 'ls':
        domo.getOwners(designId)
          .tap(function listUsers(res) {
            res.sort();
            ok("Owners for design " + designId);
            res.forEach(function(element, index, array) {
              console.log("\t" + element);
            });
          })
          .catch(evoke(fail, 'Error retrieving owners'))
          .finally(process.exit)
        break;
    }
  });

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
      userId: program.userId
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

function cleanupLogins(){
  var prev = Login.getPreviousLogins();
  var badLogins = _.filter(prev, function(login){
    return login.customer;
  });
  badLogins.forEach(function(login){
    var p = path.resolve(Domo.getHomeDir() + '/login/' + login.customer + '.json');
    fs.deleteSync(p);
  });
}

function cleanupMappings(){
  var manifest = getManifest(false);

  if (!manifest) { return; }

  var changed = false;

  if (!manifest.mapping || (manifest.mapping.length == 0)){ return; }

  manifest.mapping.forEach(function(dataPoint){
    if (dataPoint.dataSourceId && !dataPoint.dataSetId){
      dataPoint.dataSetId = dataPoint.dataSourceId;
      delete dataPoint.dataSourceId;
      changed = true;
    }
  });

  if (changed){
    updateManifest(manifest);
  }
}

function verifyNodeVersion(){
  var version = semver(process.version);
  var compatible = semver.gte(version, '0.12.0');
  if(!compatible){
    fail('Unsupported Node version', 'Please upgrade to Node v0.12.0 or higher. https://nodejs.org/');
  }
}

function logUploadSuccess(files){
  files.forEach(function(file){
    ok('Uploaded: ' + file.path);
  });
}

/**
 * update the manifest (in memory and on disk)
 */
function persistDesignId(design, manifest){
  manifest.id = design.id;
  updateManifest(manifest);
  return design;
}

/**
* Get the local manifest.json file, ensuring it's valid.
*/
function getManifest(verify = true){
  var manifest;
  try {
    manifest = fs.readFileSync(path.resolve('manifest.json'));
  }
  catch (e){
    if (verify){
      return fail('No manifest.json file in this directory', 'Please publish from a directory containing a Custom App design manifest.json file');
    }
    else{
      return;
    }
  }

  try {
    manifest = JSON.parse(manifest);
  }
  catch (e){
    return fail('Your manifest.json file is not valid JSON', e.message);
  }
  if (verify){
    validateManifest(manifest);
  }
  return manifest;
}

function updateManifest(manifest){
  fs.writeJsonSync('manifest.json', manifest, {spaces: 2});
}

/**
* Validate the manifest file.
*/
function validateManifest(manifest){

  // validate manifest file for required fields
  requireProperty(manifest, 'name');
  requireProperty(manifest, 'version');

  // validate required mapping fields
  manifest.mapping.forEach(function(dataPoint){
    requireProperty(dataPoint, 'dataSetId');
    requireProperty(dataPoint, 'alias');
    requireProperty(dataPoint, 'fields');
    ensureValidAlias(dataPoint.alias);

    // validate dataPoint mapping fields
    dataPoint.fields.forEach(function(field){
      requireProperty(field, 'alias');
      requireProperty(field, 'columnName');
      ensureValidAlias(field.alias);
    });
  });

  // validate semver
  if (!semver.valid(manifest.version)){
    fail('Invalid version', 'Please make sure the `version` in your manifest.json file is a valid semantic version. See http://semver.org/');
  }

  function requireProperty(obj, prop){
    if (!obj[prop]){
      fail('Missing required property: ' + prop, 'Please add the missing `'+ prop +'` property to your manifest.json file.');
    }
  }

  return manifest;
}

/**
 * Alias must be a valid JS property
 */
function ensureValidAlias(name){
  if (!isValidJSName(name)){
    fail('Alias names must be valid JavaScript properties', 'Please rename the `' + name + '` alias and update any /data/v1/<alias> calls with the new alias name');
  }
}


Date.prototype.timeNow = function () {
     return "(" + ((this.getHours() < 10)?"0":"") + this.getHours() +":"+ ((this.getMinutes() < 10)?"0":"") + this.getMinutes() +":"+ ((this.getSeconds() < 10)?"0":"") + this.getSeconds() + ")";
}
