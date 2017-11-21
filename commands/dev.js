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
      var options = {
        userId: opts.userId,
        external: opts.external,
        manifest: opts.manifest,
      };

      var login = Login.getMostRecentLogin();
      Login.verifyLogin(login);

      if (login.refreshToken) {
        var domo = new Domo(login.instance, login.refreshToken, 'domo:internal:devstudio');

        server.start(domo, options).catch(log.fail)
      } else {
        module.exports.fail('Not authenticated', 'Please login using "domo login"');
      }
    });

}
