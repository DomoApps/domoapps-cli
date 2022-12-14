import Domo = require('ryuu-client');
import {Login} from '../util/login';
import design = require('../util/design');
import {log} from '../util/log';
import inquirer = require('inquirer');
import {Command, CommandOptions} from 'commander';

module.exports = function (program: Command) {
  program
    .command('delete [id]')
    .description('delete a published design')
    .option(
      '-i, --design_id <id>',
      '[DEPRECATED] Specify design ID, otherwise it is retrieved from a manifest file',
    )
    .option(
      '-f, --force',
      'Delete the design even if it is referenced by Custom Apps',
    )
    .option('-c, --confirm', 'Confirm deleting the app')
    .action(function (arg: string, options: CommandOptions) {
      var designId = design.getDesignId(
        arg,
        options['design_id'],
        program.opts().manifest,
      );
      if (options['confirm']) {
        let answer = {delete: true};
        handleUserResponse(answer);
      } else {
        inquirer
          .prompt([
            {
              type: 'confirm',
              message:
                'Are you sure you want to delete design with id: ' +
                designId +
                '?',
              name: 'delete',
              default: false,
            },
          ])
          .then(handleUserResponse);
      }

      function handleUserResponse(answer: {delete: boolean}) {
        if (answer.delete) {
          var force = false;
          Login.getMostRecentLogin()
            .then(function (domo) {
              if (options['force']) force = true;
              domo
                .deleteDesign(designId, force)
                //@ts-ignore
                .tap(() => log.ok('Deleted design ' + designId))
                .catch(() =>
                  log.fail(
                    'Unable to delete design ' +
                      designId +
                      '. That id does not exist or you are not authorized to delete it.',
                  ),
                )
                .finally(process.exit);
            })
            .catch(log.notAuthenticated);
        } else {
          log.fail('Delete command aborted');
        }
      }
    });
};
