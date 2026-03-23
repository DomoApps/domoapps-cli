import {log} from '../util/log.js';
import {Command, CommandOptions} from 'commander';
import {Login} from '../util/login.js';
import {createConfirm, createInstanceAutocomplete} from '../util/prompts.js';

export default (program: Command) => {
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
      } else if ((options as any).instance) {
        // Non-interactive mode with --instance flag
        const instanceToRemove = (options as any).instance;
        const instanceExists = previousLogins.some(
          login => login.instance === instanceToRemove,
        );

        if (!instanceExists) {
          log.fail(
            `Instance "${instanceToRemove}" not found in saved logins`,
            'Use `domo ls` to see available instances',
          );
          return;
        }

        const shouldRemove = await createConfirm(
          `Remove ${instanceToRemove}?`,
          false,
        );

        if (shouldRemove) {
          Login.removeLogin(instanceToRemove);
          log.ok(`Instance ${instanceToRemove} removed successfully.`);
        } else {
          log.ok('You have chosen not to remove any instances');
        }
      } else {
        // Interactive mode
        const instance = await createInstanceAutocomplete(
          'Select the instance you want to remove (type to filter):',
          false, // Don't allow adding new instances
        );

        const shouldRemove = await createConfirm(`Remove ${instance}?`, false);

        if (shouldRemove) {
          Login.removeLogin(instance);
          log.ok(`Instance ${instance} removed successfully.`);
        } else {
          log.ok('You have chosen not to remove any instances');
        }
      }
    });
};
