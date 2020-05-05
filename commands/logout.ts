import { Login } from '../util/login';
import { log } from '../util/log';
import { Command } from 'commander';
import Domo = require('ryuu-client');

module.exports = function(program: Command) {
  program
    .command('logout')
    .description('logout of Domo')
    .option('-i, --instance <value>', 'Domo instance')
    .action(function(args){
      var instance: string;
      var login: Domo;
      if(args.instance) {
        instance = args.instance;
        Login.getLogin(instance)
        .then(function(login) {
          verifyLogout(login, instance);
        })
        .catch(function() {
          log.fail('No current login of instance ' + instance);
        })
      } else {
        var mayNotBeAuthenticated = true;
        Login.getMostRecentLogin(mayNotBeAuthenticated).then(function(login) {
          if (!login.getRefreshToken)
            log.ok('Not currently logged into' + instance);
          else {
            instance = login.getInstance();
            verifyLogout(login, instance);
          }
        })
        .catch(function() {
          log.fail('Not currently logged into an instance')
        })
      }
    });
}

function verifyLogout(login: Domo, instance: string): any {
  Login.verifyLogout(login, instance).then(function(logout) {
    if (logout) {
      process.exit();
    }
    return false;
  })
  //process.exit();
};