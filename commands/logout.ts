import { Login } from '../util/login';
import log = require('../util/log');
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
          log.fail('No current login with instance ' + instance);
        })
      } else {
        var mayNotBeAuthenticated = true;
        Login.getMostRecentLogin(mayNotBeAuthenticated).then(function(login) {
          instance = login.getInstance();
          verifyLogout(login, instance);
        }).catch(log.notAuthenticated);
      }
    });
}

function verifyLogout(login: Domo, instance: string) {
  Login.verifyLogout(login, instance).then(function(logout) {
    if (logout) {
      process.exit();
    }

    Login.deleteRefreshToken(login).then(function() {
      Login.verifyLogout(login, instance);
    }).then(function(logout) {
      process.exit();
    }).catch(function(){
      log.fail('Failed to logout');
    });
  });
}