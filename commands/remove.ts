import inquirer = require('inquirer');
import _ = require('lodash');
import {log} from '../util/log';
import {Command, CommandOptions} from 'commander';
import {Login} from '../util/login';
import multichoice from '../util/multichoice';

module.exports = (program: Command) => {
  program
    .command('remove')
    .option('--instance <value>', 'Name of instance to remove')
    .option('-a, --all', 'remove all instances')
    .description('remove a instance from the login list')
    .action((options: CommandOptions) => {
      const previousLogins = Login.getPreviousLogins();
      const prompts: any[] = [];
      if (previousLogins.length > 0) {
        options['all']
          ? prompts.push({
              type: 'confirm',
              message: "Are you sure you'd like to delete all instances?",
              name: 'removeAll',
            })
          : prompts.push(
              multichoice({
                type: 'list',
                choices: () => previousLogins.map(login => login.instance),
                message: 'Select the instance you desire to remove ',
                name: 'instance',
              }),
              {
                type: 'confirm',
                message: "Are you sure you'd like to remove this instance?",
                name: 'removeInstance',
                when: (answers: inquirer.Answers) => {
                  // only ask if an instance was selected
                  return !!answers.instance;
                },
              },
            );
      } else {
        log.fail(
          'There are no prior logins on this computer. Use `domo login` to login to an instance before using this command',
        );
      }
      inquirer.prompt(prompts).then(answers => {
        if (answers.removeAll) {
          Login.removeAllLogins();
          log.ok('All instances have been removed');
        } else if (answers.removeInstance) {
          Login.removeLogin(answers.instance);
          log.ok(`Instance ${answers.instance} removed successfully.`);
        } else log.ok('You have chosen not to remove any instances');
      });
    });
};
