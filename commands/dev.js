var Domo = require('ryuu-client');
var Login = require('../util/login');
var log = require('../util/log');
var constants = require('../util/constants');

module.exports = function(program) {
  program
    .command('dev')
    .description('work locally on a Custom App')
    .option('-u, --userId <value>', 'Use a specific userId')
    .option('-e, --external', 'Allow external connection to access the dev site')
    .action(function(opts) {
      var options = {
        userId: opts.userId,
        external: opts.external,
        manifest: opts.manifest,
      };

      Login.getMostRecentLogin().then(function(login) {
        Login.verifyLogin(login);
        var domo = new Domo(login.instance, login.refreshToken, constants.CLIENT_ID);

        //session will stop authenticated users
        const server = require('../server/server');
        server.start(domo, options).catch(log.fail);
      }).catch((err) => {
        if(err.message){
          log.fail(log.handleErrorMessage(err, err.message));
        }
        else {
          log.notAuthenticated;
        }
      })
    });

}
