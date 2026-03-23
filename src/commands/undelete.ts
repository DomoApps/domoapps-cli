import {Login} from '../util/login.js';
import {getDesignId} from '../util/design.js';
import {log} from '../util/log.js';
import {Command} from 'commander';
import {createConfirm} from '../util/prompts.js';

export default (program: Command) => {
  program
    .command('undelete [id]')
    .description('undelete a soft-deleted design')
    .action(async arg => {
      const designId = getDesignId(arg, program.opts().manifest);
      const shouldUndelete = await createConfirm(
        `Are you sure you want to undelete design with id: ${designId}?`,
        true,
      );
      handleUserResponse({undelete: shouldUndelete}, designId);
    });
};
const handleUserResponse = (answer: any, designId: string) => {
  if (answer.undelete) {
    new Login()
      .getClient()
      .then(client => {
        client
          .unDeleteDesign(designId)
          .then(() => log.ok('Undeleted design ' + designId))
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
};
