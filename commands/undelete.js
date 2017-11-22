var Domo = require('ryuu-client');
var Login = require('../util/login');
var design = require('../util/design');
var log = require('../util/log');
var evoke = require('../util/evoke');
var inquirer = require('inquirer');

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
      }], handleUserResponse);

      function handleUserResponse(answer) {
        if (answer.undelete) {
          var login = Login.getMostRecentLogin();
          Login.verifyLogin(login);

          var domo = new Domo(login.instance, login.refreshToken, 'domo:internal:devstudio');

          domo.unDeleteDesign(designId)
            .tap(evoke(log.ok, 'Undeleted design ' + designId))
            .catch(evoke(log.clientRequestFailed, 'Unable to undelete design ' + designId))
            .finally(process.exit);
        } else {
          log.fail('Undelete command aborted');
        }
      }

    });
}
