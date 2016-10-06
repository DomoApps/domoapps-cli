var Domo = require('ryuu-client');
var Login = require('../util/login');
var design = require('../util/design');
var log = require('../util/log');
var evoke = require('../util/evoke');
var inquirer = require('inquirer');

module.exports = function(program) {
  program
    .command('delete [id]')
    .description('Deletes a published design')
    .option('-i, --design_id <id>', '[DEPRECATED] Specify design ID, otherwise it is retrieved from a manifest file')
    .option('-f, --force', 'Delete the design even if it is referenced by Custom Apps')
    .action(function(arg, options) {

      var designId = design.getDesignId(arg, options.design_id, program.manifest);

      inquirer.prompt([{
        type: 'confirm',
        message: 'Are you sure you want to delete design with id: ' + designId + '?',
        name: 'delete',
        default: false
      }], handleUserResponse);

      function handleUserResponse(answer) {
        if (answer.delete) {
          var force = false;
          var login = Login.getMostRecentLogin();

          if (options.force) force = true;
          Login.verifyLogin(login);

          var domo = new Domo(login.instance, login.sid, login.devtoken);

          domo.deleteDesign(designId, force)
            .tap(evoke(log.ok, 'Deleted design ' + designId))
            .catch(evoke(log.fail, 'Unable to delete design ' + designId))
            .finally(process.exit);
        } else {
          log.fail('Delete command aborted');
        }
      }

    });
}
