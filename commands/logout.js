var Login = require('../util/login');
var log = require('../util/log');

module.exports = function(program){
  program
    .command('logout')
    .description('logout of Domo')
    .option('-i, --instance <value>', 'Domo instance')
    .action(function(args){
      var instance;
      var login;
      if(args.instance) {
        instance = args.instance;
        login = Login.getLogin(instance);
        if (!login.instance) {
          log.fail('No current login with instance ' + instance);
        }
      } else {
        login = Login.getMostRecentLogin();
        instance = login.instance;
      }

      if (Login.verifyLogout(login, instance)) {
        process.exit();
      }

      delete login.sid;
      delete login.devtoken;

      Login.writeLogin(login);
      Login.verifyLogout(login, instance);

      process.exit();
    });
}
