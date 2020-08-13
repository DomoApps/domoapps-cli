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
      if(args.instance) {
        log.info(`Attempting to log out from ${args.instance}`)
        Login.getLogin(args.instance)
        .then(function(login) {
          if (login.getRefreshToken())
            Login.logout(login);
          else
            log.ok(`Not currently logged into ${args.instance}`);
        })
      } 
      else {
        var mayNotBeAuthenticated = true;
        Login.getMostRecentLogin(mayNotBeAuthenticated).then(function(login) {
          log.info(`Attempting to log out from your most recent login, ${login.getInstance()}`)
          if (!login.getRefreshToken())
            log.ok(`Not currently logged into ${login.getInstance()}`);
          else {
            Login.logout(login);
          }
        })
        .catch(function() {
          log.fail('Logout Failure')
        })
      }
    });
};