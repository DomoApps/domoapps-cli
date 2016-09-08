var Domo = require('ryuu-client');
var Login = require('../util/login');
var log = require('../util/log');
var server = require('../server/server');

module.exports = function(program){
  program
    .option('--userId [value]', 'Use a specific userId')
    .command('dev')
    .description('work locally on a Custom App')
    .action(function(){
      var options = {
        userId: program.userId,
        manifest: program.manifest
      };

      var login = Login.getMostRecentLogin();
      Login.verifyLogin(login);
      var domo = new Domo(login.instance, login.sid, login.devtoken);
      server.start(domo, options).catch(log.fail)
    });

}
