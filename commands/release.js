var inquirer = require('inquirer');
var Domo = require('ryuu-client');
var Manifest = require('../util/manifest');
var Login = require('../util/login');
var log = require('../util/log');
var evoke = require('../util/evoke');
var multichoice = require('../util/multichoice');
var appStructure = require('../util/appStructure');
var messages = require('../util/messages');

module.exports = function(program){
  program
    .command('release')
    .description('prepare a design for app store release')
    .action(function(){
      var login = Login.getMostRecentLogin();
      Login.verifyLogin(login);
      var domo = new Domo(login.instance, login.refreshToken);
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
            })], function(answers){
              // release the kraken
              domo.release(manifest.id, answers.version)
                .tap(evoke(log.ok, 'Design version ('+answers.version+') released'))
                .catch(log.fail)
                .finally(process.exit)
            })
        })
    })

}
