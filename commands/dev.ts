import { Login } from '../util/login';
import log = require('../util/log');

module.exports = function(program) {
  program
    .command('dev')
    .description('work locally on a Custom App')
    .option('-u, --userId <value>', 'Use a specific userId')
    .option('-e, --external', 'Allow external connection to access the dev site')
    .action(function(opts) {
      let options = {
        userId: opts.userId,
        external: opts.external,
        manifest: opts.manifest,
      };

      Login.getMostRecentLogin().then(function(domo) {
        //session will stop authenticated users
        const server = require('../server/server');
        server.start(domo, options).catch(log.fail);
      }).catch((err) => {
        if(err.message){
          log.fail(log.handleErrorMessage(err, err.message));
        }
        else {
          log.notAuthenticated();
        }
      })
    });
}