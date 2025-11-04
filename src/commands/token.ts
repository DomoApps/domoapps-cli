const chalk = require('chalk');
import {Login} from '../util/login';
import {log} from '../util/log';
import {createInstanceAutocomplete, createInput} from '../util/prompts';
import {Command} from 'commander';
import {TokenCommandOptions} from '../models';

module.exports = (program: Command) => {
  program
    .command('token')
    .description('add or remove a developer token')
    .arguments('<cmd>')
    .option('-i, --instance <value>', 'Domo instance')
    .option('-t, --token <value>', 'dev token value used with token add')
    .action(async (cmd: string, options: TokenCommandOptions) => {
      const login = Login.getCurrentLogin().instance;
      const previousLogins = Login.getPreviousLogins();

      const prompts = [];

      switch (cmd) {
        case 'remove':
          if (!options.instance) {
            const selectedInstance = await createInstanceAutocomplete(
              'Domo instance on which to remove the token (e.g. company.domo.com)',
              false,
            );
            options.instance = selectedInstance;
          }

          const instance = options.instance;
          if (instance) {
            new Login(instance).removeDevToken();
            log.ok(
              `Token removed for ${instance}`,
              'Use the `domo token add` command to use another token.',
            );
          }
          break;

        case 'add':
          if (!options.instance) {
            prompts.push(
              {
                type: 'list',
                choices: () => {
                  const options = previousLogins.map(item => item.instance);
                  options.push('new instance');
                  return options;
                },
                message:
                  'Domo instance on which to set the token ' +
                  '(e.g. company.domo.com)',
                name: 'instance',
                default: login,
              },
              {
                type: 'input',
                message:
                  'Domo instance ' + chalk.grey('e.g. company.domo.com '),
                name: 'newInstance',
                validate: (input: string) => {
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
                    'Example: "company.domo.com"'
                  );
                },
                when: (answers: any) => {
                  // only ask if the instance selector wasn't used or new one was selected
                  return (
                    !answers.instance || answers.instance === 'new instance'
                  );
                },
              },
            );
          }

          if (!options.token) {
            prompts.push({
              name: 'devtoken',
              type: 'input',
              message:
                'Token (can be found in the Admin section of Domo and pasted here)',
            });
          }

          let instanceName = options.instance;
          let devtoken = options.token;

          if (!instanceName) {
            instanceName = await createInstanceAutocomplete(
              'Domo instance on which to set the token (e.g. company.domo.com)',
              true,
            );
          }

          if (!devtoken) {
            devtoken = await createInput(
              'Token (can be found in the Admin section of Domo and pasted here)',
            );
          }

          const devToken = true;
          new Login(instanceName).persistLogin(devtoken, devToken);
          log.ok(
            `Token set for ${instanceName}`,
            'Future CLI commands to this instance will not require username/password. \nUse the "domo token remove" command to undo this action.',
          );
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
