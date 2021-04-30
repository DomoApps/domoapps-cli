import inquirer = require('inquirer');
import _ = require('lodash');
import open = require('open');
import { Manifest } from '../util/manifest';
import { Login } from '../util/login';
import glob = require('glob');
import fs = require('fs-extra');
import { log } from '../util/log' ;
import appStructure = require('../util/appStructure');
import { constant, manifest, File } from '../models';
import Domo = require('ryuu-client');
import { Command, CommandOptions } from 'commander';
import { DesignAggregate, DesignVersion } from 'ryuu-client/models/interfaces/domoappstypes';

module.exports = function(program: Command) {
  program
    .command('publish')
    .description('publish a new or existing Custom App design')
    .option('-g, --go', 'navigate to design in Asset Library after publishing')
    .action(function(options) {
      var manifest = Manifest.get(program.opts().manifest);

      Login.getMostRecentLogin().then(function(domo) {
        checkFileNames(manifest);
        if (!appStructure.hasThumbnail()) {
          log.warn(constant.THUMBNAIL_CREATE_WARNING, constant.CREATE_THUMBNAIL);
        }

        if (!manifest.id) {
          createDesign(domo, manifest, options);
        }
        else {
          domo.getDesign(manifest.id).then(function(result) {
            checkMapping(result, manifest);
            return publishAssets(domo, manifest)
              .then(function() {
                goToDomo(options, domo, manifest);
              })
              .catch((err) => {
                if (err.message.substr(0,23) == "Design has been deleted")
                  recreateDesign(domo, manifest);
                else if (err.message.substr(0,15) == "No design found") {
                  inquirer.prompt({
                    type: "confirm",
                    message: 'This design does not exist on ' + domo.getInstance() + '. Would you like to create a new design with these assets?',
                    name: 'askCreate'
                  })
                  .then(function (answers) {
                    if (answers.askCreate) {
                      manifest.id = null;
                      createDesign(domo, manifest);
                    }
                  })
                }
                else if (err.message) {
                  log.fail(log.handleErrorMessage(err, err.message));
                }
                else {
                  log.clientRequestFailed('Error uploading assets in the getDesign');
                }
              });
          }).catch(log.notAuthenticated)
        }
      }).catch(log.notAuthenticated);
    });
}

function createDesign(domo: Domo, manifest: manifest, options?: CommandOptions) {
  return domo.createDesign(manifest)
    .then(function(designResult: DesignVersion) {
      var design = designResult[0];
      // add the version returned when design published
      design.version = designResult[1].version;
      return Manifest.persistDesignId(design, manifest);
    })
    .tap(() => {(log.ok('New design created on ' + domo.getInstance()))})
    .catch((e) => {log.fail('Error when creating new design:', e.message)})
    .then(domo.uploadAllAssets.bind(domo, manifest))
    .then(logUploadSuccess)
    .catch(function(e: string) {
      log.fail(e || 'Error uploading assets in uploading assets for a new design');
    })
    .then(() => {goToDomo(options, domo, manifest)});
}

function logUploadSuccess(files: File[]) {
  files.forEach(function(file){
    log.ok('Uploaded: ' + file.path);
  });
}

function goToDomo(options: CommandOptions, domo: Domo, manifest: manifest) {
  console.log('Design can be found at https://' + domo.getInstance() + '/assetlibrary?designId=' + manifest.id);
  if (options && options['go']) {
   open('https://' + domo.getInstance() + '/assetlibrary?designId=' + manifest.id);
  }
}

function checkMapping(result: DesignAggregate, manifest: manifest) {
  var latestVersionNumber = result.latestVersion;
  var latestVersion = result.versions.filter(function(obj:any) {
    return obj.version === latestVersionNumber;
  });
  var oldMapping = latestVersion[0].mapping[0];
  var newMapping = manifest.mapping[0];

  if (oldMapping) {
    delete oldMapping.dql;
  }

  if (!_.isEqual(oldMapping, newMapping)) {
    log.warn('Mapping has changed. Check current cards for potential miss-mappings.');
  }
}

function checkFileNames(manifest: manifest) {
  var ignore = ['**/*/node_modules/**/*', 'node_modules/**/*'];
    var userIgnore = manifest.ignore;
    if (userIgnore) {
      if (userIgnore instanceof Array){
        ignore = ignore.concat(userIgnore);
      }
      else {
        log.fail('The manifest.json "ignore" property must be an Array');
      }
    }
    var badFileList = glob.sync("**/*", {ignore: ignore})
      .filter(function(file) {
        return !fs.lstatSync(file).isDirectory() && file.indexOf(' ') !== -1;
      });
    if (badFileList.length > 0) {
      log.fail('Spaces in file names not allowed. Please rename the following file(s): ' + badFileList);
    }

    if (!appStructure.hasThumbnail()) {
      log.warn(constant.THUMBNAIL_CREATE_WARNING, constant.CREATE_THUMBNAIL);
    }
}

function recreateDesign(domo: Domo, manifest: manifest) {
  inquirer
    .prompt({
        type: "list",
        message: 'This design has been deleted. Would you like to undelete this design and publish to it, or create a new design with these assets?',
        name: 'askRecreate',
        choices: ["Undelete", "Create New Design"]
      }
    )
    .then(function (answers) {
      if (answers.askRecreate){
        if (answers.askRecreate == 'Create New Design') {
          manifest.id = null;
          createDesign(domo, manifest);
        }
        else if (answers.askRecreate == 'Undelete') {
          domo.unDeleteDesign(manifest.id).then(() => {
            publishAssets(domo, manifest);});
        }
        else {log.ok('Exited without republishing design')}
      }
    });
}

function publishErrors(e: any, domo: Domo, manifest: manifest) {   
  if (e.statusCode === 400 && !(e.message.startsWith('DA'))) {
    log.fail('Design failed to publish with error:', e.message)
  }
  else if (e.statusCode === 401) {
    log.notAuthenticated(domo.getRefreshToken());
  }
  else if (e.statusCode === 403) {
    log.fail('You do not have access to the design with id ' + manifest.id + ' on ' + domo.getInstance()
      + '.\nIf that seems unlikely, other possibilities are that you are publishing this design to a new environment other than the one in which it was first created.'
      + '\nAlternatively, you may have inadvertently changed the design id.');
  }
  else if (e.message && e.message.startsWith('DA')) {
    switch (e.message.substr(0, 6)) {
      case 'DA0086':
        log.warn(e.message);
        inquirer
          .prompt([
            {
              type: 'confirm',
              message: 'This design has been deleted. Would you like to publish a new design with these assets?',
              name: 'askRecreate'
            }
          ])
          .then(function (answers) {
            if (answers.askRecreate) {
              manifest.id = null;
              createDesign(domo, manifest);
            }
          });

        break;
      default:
        // Pass on error messages that are in the set of documented errors.
        log.fail(e.message);
        break;
    }
  }
  else {
    //Error uploading assets
    log.fail(log.handleErrorMessage(e, 'Error uploading assets in the upload all assets'));
  }
}

function publishAssets(domo: Domo, manifest: manifest) {
  return domo.uploadAllAssets(manifest)
    .tap(()=>{log.ok('Publishing ' + manifest.name + ' to ' + domo.getInstance() + ' on ' + new Date())})
    .then(logUploadSuccess)
    .catch((e) => {publishErrors(e, domo, manifest)})
}