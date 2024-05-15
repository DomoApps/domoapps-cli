import {Login} from '../util/login';
import {Command} from 'commander';

module.exports = function (program: Command) {
  program
    .command('logout')
    .description('logout of Domo')
    .option('-i, --instance <value>', 'Domo instance')
    .action(function (args) {
      const login = new Login(args.instance);
      login.logout();
    });
};
