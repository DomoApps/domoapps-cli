import {Login} from '../util/login';
import design = require('../util/design');
import {log} from '../util/log';
import inquirer = require('inquirer');
import {Command} from 'commander';

module.exports = function (program: Command) {
  program
    .command('undelete [id]')
    .description('undelete a soft-deleted design')
    .action(function (arg, options) {
      var designId = design.getDesignId(arg, null, program.opts().manifest);

      inquirer
        .prompt([
          {
            type: 'confirm',
            message:
              'Are you sure you want to undelete design with id: ' +
              designId +
              '?',
            name: 'undelete',
            default: true,
          },
        ])
        .then(handleUserResponse);

      function handleUserResponse(answer: inquirer.Answers) {
        if (answer.undelete) {
          new Login()
            .getClient()
            .then(function (domo) {
              domo
                .unDeleteDesign(designId)
                //@ts-ignore
                .tap(() => log.ok('Undeleted design ' + designId))
                .catch(() =>
                  log.fail(
                    'Unable to undelete design ' +
                      designId +
                      '. That id does not exist or you are not authorized to undelete it.',
                  ),
                )
                .finally(process.exit);
            })
            .catch(log.notAuthenticated);
        } else {
          log.fail('Undelete command aborted');
        }
      }
    });
};
