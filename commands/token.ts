import inquirer = require('inquirer');
import * as chalk from 'chalk';
import {Login} from '../util/login';
import {log} from '../util/log';
import {CommandOptions, Command} from 'commander';

module.exports = function (program: Command) {
  program
    .command('token')
    .description('add or remove a developer token')
    .arguments('<cmd>')
    .option('-i, --instance <value>', 'Domo instance')
    .option('-t, --token <value>', 'dev token value used with token add')
    .action(function (cmd: string, options: CommandOptions) {
      const login = Login.getCurrentLogin().instance;
      var previousLogins = Login.getPreviousLogins();

      var prompts = [];

      switch (cmd) {
        case 'remove':
          if (!options['instance']) {
            prompts.push({
              type: 'list',
              choices: function () {
                return previousLogins.map(item => item.instance);
              },
              message:
                'Domo instance on which to remove the token ' +
                chalk.grey('e.g. company.domo.com '),
              name: 'instance',
              default: login,
            });
          }

          inquirer.prompt(prompts).then(function (answers: inquirer.Answers) {
            answers.instance = options['instance'] || answers.instance;
            if (answers.instance) {
              new Login(answers.instance).removeDevToken();
              log.ok(
                `Token removed for ${answers.instance}`,
                'Future CLI commands to this instance will require username/password. \nUse the "domo token add" command to use another token.',
              );
            }
          });
          break;

        case 'add':
          if (!options['instance']) {
            prompts.push(
              {
                type: 'list',
                choices: function () {
                  var options = previousLogins.map(item => item.instance);
                  options.push('new instance');
                  return options;
                },
                message:
                  'Domo instance on which to set the token ' +
                  chalk.grey('e.g. company.domo.com '),
                name: 'instance',
                default: login,
              },
              {
                type: 'input',
                message:
                  'Domo instance ' + chalk.grey('e.g. company.domo.com '),
                name: 'newInstance',
                validate: function (input: string) {
                  const acceptedDomains = [
                    'domo.com',
                    'domotech.io',
                    'domorig.io',
                  ];
                  if (acceptedDomains.some(domain => input.endsWith(domain))) {
                    return true;
                  }

                  return (
                    'Please login using the full Domo instance. ' +
                    chalk.grey('Example: "company.domo.com"')
                  );
                },
                when: function (answers: inquirer.Answers) {
                  // only ask if the instance selector wasn't used or new one was selected
                  return (
                    !answers.instance || answers.instance === 'new instance'
                  );
                },
              },
            );
          }

          if (!options['token']) {
            prompts.push({
              name: 'devtoken',
              type: 'input',
              message:
                'Token (can be found in the Admin section of Domo and pasted here)',
            });
          }

          inquirer.prompt(prompts).then(function (answers: inquirer.Answers) {
            answers.instance =
              options['instance'] || answers.newInstance || answers.instance;
            answers.devtoken = options['token'] || answers.devtoken;
            var devToken = true;
            new Login(answers.instance).persistLogin(
              answers.devtoken,
              devToken,
            );
            log.ok(
              `Token set for ${answers.instance}`,
              'Future CLI commands to this instance will not require username/password. \nUse the "domo token remove" command to undo this action.',
            );
          });
          break;

        default:
          log.fail(
            'Invalid option "' +
              cmd +
              '"\nValid options are "remove", and "add"',
          );
      }
    });
};
