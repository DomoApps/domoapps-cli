import { Login } from '../util/login';
import { log } from '../util/log';
import { Command } from 'commander';
import Domo = require('ryuu-client');

module.exports = function(program: Command) {
  program
    .command('dev')
    .description('work locally on a Custom App')
    .option('-u, --userId <value>', 'Use a specific userId')
    .option('-e, --external', 'Allow external connection to access the dev site')
    .option('-m, --manifest <value>', 'use a specific manifest file')
    .action(function(opts) {
      let options = {
        userId: opts.userId,
        external: opts.external,
        manifest: opts.manifest,
      };

      Login.getMostRecentLogin().then(function(domo: Domo) {
        //session will stop authenticated users
        const server = require('../server/server');
        server.start(domo, options).catch(log.fail);
      }).catch((err: Error) => {
        if(err.message){
          log.fail(log.handleErrorMessage(err, err.message));
        }
        else {
          log.notAuthenticated();
        }
      })
    });
}