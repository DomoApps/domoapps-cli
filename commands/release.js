var inquirer = require('inquirer');
var Domo = require('ryuu-client');
var Manifest = require('../util/manifest');
//import * as Manifest from '../util/manifest';
var Login = require('../util/login');
var log = require('../util/log');
var multichoice = require('../util/multichoice');
var appStructure = require('../util/appStructure');
var messages = require('../util/messages');
var constants = require('../util/constants');

module.exports = function(program){
  program
    .command('release')
    .description('prepare a design for app store release')
    .action(function(){
      Login.getMostRecentLogin().then(function(domo) {
        var manifest = Manifest.get(program.manifest);

        // make sure app has been published first
        if (!manifest.id){
          log.fail('Can\'t release until design is published.', 'Please publish your Custom App design (with the `domo publish` command) first');
        }

        // make sure there is a thumbnail.png when releasing
        if (!appStructure.hasThumbnail()) {
          log.fail(messages.THUMBNAIL_CREATE_WARNING, messages.CREATE_THUMBNAIL);
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
              })])
              .then(function(answers){
                // release the kraken
                domo.release(manifest.id, answers.version)
                  .tap(log.ok('Design version ('+answers.version+') released'))
                  .catch(log.fail)
                  .finally(process.exit)
              });
          })
          .catch(log.clientRequestFailed('Error releasing app design'));
      }).catch(log.notAuthenticated);
    });
};
