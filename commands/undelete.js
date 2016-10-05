var validator = require('validator');
var Domo = require('ryuu-client');
var Manifest = require('../util/manifest');
var Login = require('../util/login');
var log = require('../util/log');
var evoke = require('../util/evoke');
var inquirer = require('inquirer');

module.exports = function(program){
  program
    .command('undelete [id]')
    .description('Undeletes a soft-deleted design')
    .option('-i, --design_id <id>', '[DEPRECATED] Specify design ID, otherwise it is retrieved from a manifest file')
    .action(function(arg, options) {

      var designId = arg || options.design_id || null;

      if (designId) {
        if (!validator.isUUID(designId)) return log.fail('The value specified for option -i is not a valid design ID', designId);
      } else {
        var manifest = Manifest.get(program.manifest);
        if (!manifest || !manifest.id) return log.fail('No manifest found. Please supply design id using -i or change to a directory with a valid manifest file');
        designId = manifest.id;
      }

      inquirer.prompt([{
        type: 'confirm',
        message: 'Are you sure you want to undelete design with id: ' + designId + '?',
        name: 'undelete',
        default: true
      }], handleUserResponse);

      function handleUserResponse(answer) {
        if (answer.undelete) {
          var login = Login.getMostRecentLogin();
          Login.verifyLogin(login);

          var domo = new Domo(login.instance, login.sid, login.devtoken);

          domo.unDeleteDesign(designId)
            .tap(evoke(log.ok, 'Undeleted design ' + designId))
            .catch(evoke(log.fail, 'Unable to undelete design ' + designId))
            .finally(process.exit);
        } else {
          log.fail('Undelete command aborted');
        }
      }

    });
}
