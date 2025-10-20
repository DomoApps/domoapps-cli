// import _ = require('lodash');
import {log} from '../util/log';
import {Command, CommandOptions} from 'commander';
import {Login} from '../util/login';
import multichoice from '../util/multichoice';
import {createConfirm, createInstanceAutocomplete} from '../util/prompts';

module.exports = (program: Command) => {
  program
    .command('remove')
    .option('--instance <value>', 'Name of instance to remove')
    .option('-a, --all', 'remove all instances')
    .description('remove a instance from the login list')
    .action(async (options: CommandOptions) => {
      const previousLogins = Login.getPreviousLogins();

      if (previousLogins.length === 0) {
        log.fail(
          'There are no prior logins on this computer. Use `domo login` to login to an instance before using this command',
        );
        return;
      }

      if ((options as any).all) {
        const shouldRemoveAll = await createConfirm(
          'Are you sure you want to delete all instances?',
          false,
        );

        if (shouldRemoveAll) {
          Login.removeAllLogins();
          log.ok('All instances have been removed');
        }
      } else {
        const instance = await createInstanceAutocomplete(
          'Select the instance you want to remove (type to filter):',
          false, // Don't allow adding new instances
        );

        const shouldRemove = await createConfirm(
          `Remove ${instance}?`,
          false,
        );

        if (shouldRemove) {
          Login.removeLogin(instance);
          log.ok(`Instance ${instance} removed successfully.`);
        } else {
          log.ok('You have chosen not to remove any instances');
        }
      }
    });
};
