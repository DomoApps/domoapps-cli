var Domo = require('ryuu-client');
var Login = require('../util/login');
var log = require('../util/log');
var server = require('../server/server');

module.exports = function(program) {
  program
    .command('dev')
    .description('work locally on a Custom App')
    .option('-u, --userId <value>', 'Use a specific userId')
    .option('-e, --external', 'Allow external connection to access the dev site')
    .action(function(opts) {
      var login = Login.getMostRecentLogin();
      Login.verifyLogin(login);
      var domo = new Domo(login.instance, login.sid, login.devtoken);

      var options = {
        userId: opts.userId,
        external: opts.external,
        manifest: opts.manifest,
        instance: domo.instance
      };

      server.start(domo, options).catch(log.fail)
    });

}
