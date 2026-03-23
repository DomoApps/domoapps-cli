import {Login} from '../util/login.js';
import {log} from '../util/log.js';
import {Command} from 'commander';
import {start} from '../server/server.js';

export default (program: Command) => {
  program
    .command('dev')
    .description('work locally on a Custom App')
    .option('-u, --userId <value>', 'Use a specific userId')
    .option(
      '-e, --external',
      'Allow external connection to access the dev site',
    )
    .action(opts => {
      const devOptions = {
        userId: opts.userId,
        external: opts.external,
        manifest: program.opts().manifest,
      };

      new Login()
        .getClient()
        .then(client => {
          start(client, devOptions).catch(log.fail);
        })
        .catch((err: Error) => {
          if (err.message) {
            log.fail(log.handleErrorMessage(err, err.message));
          } else {
            log.notAuthenticated();
          }
        });
    });
};
