var Domo = require('ryuu-client');
var Login = require('../util/login');
var design = require('../util/design');
var log = require('../util/log');
var evoke = require('../util/evoke');
var inquirer = require('inquirer');
var constants = require('../util/constants');

module.exports = function(program) {
  program
    .command('undelete [id]')
    .description('undelete a soft-deleted design')
    .action(function(arg, options) {

      var designId = design.getDesignId(arg, null, program.manifest);

      inquirer.prompt([{
        type: 'confirm',
        message: 'Are you sure you want to undelete design with id: ' + designId + '?',
        name: 'undelete',
        default: true
      }])
        .then(handleUserResponse);

      function handleUserResponse(answer) {
        if (answer.undelete) {
          Login.getMostRecentLogin().then(function(domo) {
            domo.unDeleteDesign(designId)
              .tap(evoke(log.ok, 'Undeleted design ' + designId))
              .catch(evoke(log.clientRequestFailed, 'Unable to undelete design ' + designId))
              .finally(process.exit);
          }).catch(log.notAuthenticated);
        } else {
          log.fail('Undelete command aborted');
        }
      }

    });
}
