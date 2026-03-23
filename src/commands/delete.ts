import {Login} from '../util/login.js';
import {getDesignId} from '../util/design.js';
import {log} from '../util/log.js';
import {Command, CommandOptions} from 'commander';
import {createConfirm} from '../util/prompts.js';

export default (program: Command) => {
  program
    .command('delete [id]')
    .description('delete a published design by its id')
    .option(
      '-f, --force',
      'Delete the design even if it is referenced by Custom Apps',
    )
    .option('-c, --confirm', 'Auto confirm deleting the app')
    .action(async (arg: string, options: CommandOptions) => {
      const designId = getDesignId(arg, program.opts().manifest);
      const handleUserResponse = (answer: {delete: boolean}) => {
        if (answer.delete) {
          new Login()
            .getClient()
            .then(client => {
              client
                .deleteDesign(
                  designId,
                  (options as any)['force'] ? true : false,
                )
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
      if ((options as any)['confirm']) {
        handleUserResponse({delete: true});
      } else {
        const shouldDelete = await createConfirm(
          `Are you sure you want to delete design with id: ${designId}?`,
          false,
        );
        handleUserResponse({delete: shouldDelete});
      }
    });
};
