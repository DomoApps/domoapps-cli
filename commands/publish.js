var Domo = require('ryuu-client');
var inquirer = require('inquirer');
var _ = require('lodash');
var opn = require('opn');
var Manifest = require('../util/manifest');
var Login = require('../util/login');
var log = require('../util/log');
var appStructure = require('../util/appStructure');
var messages = require('../util/messages');
var evoke = require('../util/evoke');

module.exports = function(program){
  program
    .command('publish')
    .description('publish a new or existing Custom App design')
    .option('-g, --go', 'navigate to design in Asset Library after publishing')
    .action(function(options){
      var manifest = Manifest.get(program.manifest);
      if (!manifest) return;

      var login = Login.getMostRecentLogin();
      Login.verifyLogin(login);
      var domo = new Domo(login.instance, login.sid, login.devtoken);

      if (!appStructure.hasThumbnail()) {
        log.warn(messages.THUMBNAIL_CREATE_WARNING, messages.CREATE_THUMBNAIL);
      }

      if (!manifest.id){
        createDesign(domo, manifest, login, options);
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
          .tap(evoke(log.ok, 'Publishing ' + manifest.name + ' to ' + login.instance + ' on ' + new Date()))
          .then(logUploadSuccess)
          .catch(function(e){
            if(e.statusCode === 401) {
              log.notAuthenticated(login);
            }
            else if(e.statusCode === 403) {
              log.fail('You do not have access to the design with id ' + manifest.id + ' on ' + login.instance
                + '.\nIf that seems unlikely, other possibilities are that you are publishing this design to a new environment other than the one in which it was first created.'
                + '\nAlternatively, you may have inadvertently changed the design id.');
            }
            else if(e.message && e.message.startsWith('DA')) {
              switch (e.message.substr(0, 6)) {
                case 'DA0086':
                  log.warn(e.message);
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
        .catch(function(e) {
          log.fail(log.handleErrorMessage(e, 'Error uploading assets'));
        });
      }
    });
}


/**
 * @param {Object} domo
 * @param {Object} manifest
 * @param {Object} login
 * @param {Object} options
 * @return {Promise}
 */
function createDesign(domo, manifest, login, options) {
  return domo.createDesign(manifest)
    .then(function(designResult){
      var design = designResult[0];
      // add the version returned when design published
      design.version = designResult[1].version;
      return Manifest.persistDesignId(design, manifest);
    })
    .tap(evoke(log.ok, 'New design created on ' + login.instance))
    .catch(evoke(log.fail, 'Error creating new design'))
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
  if(options.go) {
   opn('https://' + domo.instance + '/assetlibrary?designId=' + manifest.id);
  }
}
