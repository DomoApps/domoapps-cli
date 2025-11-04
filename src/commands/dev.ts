import {Login} from '../util/login';
import {log} from '../util/log';
import {Command} from 'commander';
import {start} from '../server/server';

module.exports = (program: Command) => {
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
          //session will stop authenticated users
          //const server = require('../server/server');
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
