import {Login} from '../util/login';
import design = require('../util/design');
import {log} from '../util/log';
import inquirer = require('inquirer');
import {Command, CommandOptions} from 'commander';

module.exports = function (program: Command) {
  program
    .command('delete [id]')
    .description('delete a published design by its id')
    .option(
      '-f, --force',
      'Delete the design even if it is referenced by Custom Apps',
    )
    .option('-c, --confirm', 'Auto confirm deleting the app')
    .action((arg: string, options: CommandOptions) => {
      const designId = design.getDesignId(arg, program.opts().manifest);
      const handleUserResponse = (answer: {delete: boolean}) => {
        if (answer.delete) {
          new Login()
            .getClient()
            .then(client => {
              client
                .deleteDesign(designId, options['force'] ? true : false)
                .then(() => log.ok(`Deleted design ${designId}`))
                .catch(() =>
                  log.fail(
                    `Unable to delete design 
                      ${designId}. That id does not exist or you are not authorized to delete it.`,
                  ),
                )
                .finally(process.exit);
            })
            .catch(log.notAuthenticated);
        } else {
          log.fail('Delete command aborted');
        }
      };
      if (options['confirm']) {
        handleUserResponse({delete: true});
      } else {
        inquirer
          .prompt([
            {
              type: 'confirm',
              message: `Are you sure you want to delete design with id: 
                ${designId}
                ?`,
              name: 'delete',
              default: false,
            },
          ])
          .then(handleUserResponse);
      }
    });
};
