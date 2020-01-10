import inquirer = require('inquirer');
import _ = require('lodash');
import open = require('open');
import * as Manifest from '../util/manifest';
import { Login } from '../util/login';
import glob = require('glob');
import fs = require('fs-extra');
import log = require('../util/log');
import appStructure = require('../util/appStructure');
import {constant} from '../models';
import Domo = require('ryuu-client');
import { Command } from 'commander';

module.exports = function(program: Command){
  program
    .command('publish')
    .description('publish a new or existing Custom App design')
    .option('-g, --go', 'navigate to design in Asset Library after publishing')
    .action(function(options){
      var manifest = Manifest.get(program.manifest);
      if (!manifest) return;

      Login.getMostRecentLogin().then(function(domo: Domo) {
        var ignore = ['**/*/node_modules/**/*', 'node_modules/**/*'];
        var userIgnore = manifest.ignore;
        if (userIgnore){
          if (userIgnore instanceof Array){
            ignore = ignore.concat(userIgnore);
          }
          else{
            log.fail('The manifest.json "ignore" property must be an Array');
            return;
          }
        }
        var badFileList = glob.sync("**/*", {ignore: ignore})
          .filter(function(file) {
            return !fs.lstatSync(file).isDirectory() && file.indexOf(' ') !== -1;
          });
        if (badFileList.length > 0) {
          log.fail('Spaces in file names not allowed. Please rename the following file(s): ' + badFileList);
          return;
        }

        if (!appStructure.hasThumbnail()) {
          log.warn(constant.THUMBNAIL_CREATE_WARNING, constant.CREATE_THUMBNAIL);
        }

        if (!manifest.id){
          createDesign(domo, manifest, options);
        }
        else{
          domo.getDesign(manifest.id).then(function(result) {
            var latestVersionNumber = result.latestVersion;
            var latestVersion = result.versions.filter(function(obj) {
              return obj.version === latestVersionNumber;
            });
            var oldMapping = latestVersion[0].mapping[0];
            var newMapping = manifest.mapping[0];

            if (oldMapping) {
              delete oldMapping.dql;
            }

            if(!_.isEqual(oldMapping, newMapping)) {
              log.warn('Mapping has changed. Check current cards for potential miss-mappings.');
            }

            domo.uploadAllAssets(manifest)
            .tap(log.ok('Publishing ' + manifest.name + ' to ' + domo.getInstance() + ' on ' + new Date()))
            .then(logUploadSuccess)
            .catch(function(e){
              if(e.statusCode === 401) {
                log.notAuthenticated(domo.getRefreshToken());
              }
              else if(e.statusCode === 403) {
                log.fail('You do not have access to the design with id ' + manifest.id + ' on ' + domo.getInstance()
                  + '.\nIf that seems unlikely, other possibilities are that you are publishing this design to a new environment other than the one in which it was first created.'
                  + '\nAlternatively, you may have inadvertently changed the design id.');
              }
              else if(e.message && e.message.startsWith('DA')) {
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
                        if (answers.askRecreate){
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
                log.fail(log.handleErrorMessage(e, 'Error uploading assets'));
              }
            });
          })
          .then(function() {
            goToDomo(options, domo, manifest);
          })
          .catch((err) => {
            if(err.message){
              log.fail(log.handleErrorMessage(err, err.message));
            }
            else {
              log.clientRequestFailed('Error uploading assets');
            }
          });
        }
      }).catch(log.notAuthenticated);
    });
}


/**
 * @param {Object} domo
 * @param {Object} manifest
 * @param {Object} login
 * @param {Object} options
 * @return {Promise}
 */
function createDesign(domo, manifest, options?) {
  return domo.createDesign(manifest)
    .then(function(designResult){
      var design = designResult[0];
      // add the version returned when design published
      design.version = designResult[1].version;
      return Manifest.persistDesignId(design, manifest);
    })
    .tap(log.ok( 'New design created on ' + domo.instance))
    .catch(log.fail('Error creating new design'))
    .then(domo.uploadAllAssets.bind(domo, manifest))
    .then(logUploadSuccess)
    .catch(function(e){
      log.fail(e || 'Error uploading assets');
    })
    .then(function() {
      goToDomo(options, domo, manifest);
    });
}

function logUploadSuccess(files){
  files.forEach(function(file){
    log.ok('Uploaded: ' + file.path);
  });
}

function goToDomo(options, domo, manifest) {
  console.log('Design can be found at https://' + domo.instance + '/assetlibrary?designId=' + manifest.id);
  if (options && options.go) {
   open('https://' + domo.instance + '/assetlibrary?designId=' + manifest.id, {url: true});
  }
}
