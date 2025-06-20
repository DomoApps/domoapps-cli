import inquirer = require('inquirer');
import autocompletePrompt = require('inquirer-autocomplete-prompt');
import * as chalk from 'chalk';
import * as fs from 'fs-extra';
import Domo = require('ryuu-client');
import {Login} from '../util/login';
import multichoice from '../util/multichoice';
import { BaseCommand, CommandOptions } from '../util/BaseCommand';

import {Command} from 'commander';
import {logo} from '../models/enums/constant';

let autoUpdate = false;
const NEW_INSTANCE = 'new instance';
// @ts-ignore
inquirer.registerPrompt('autocomplete', autocompletePrompt);

class LoginCommand extends BaseCommand {
  constructor(program: Command) {
    super(program);
  }

  protected configure(): void {
    this.program
      .command('login')
      .description('login to Domo')
      .option('-i, --instance <value>', 'Domo instance')
      .option('-u, --user-email <value>', 'user email')
      .option('-f, --manifest-file <file>', 'use a specific manifest file')
      .option('-t, --transfer', 'transfer login files from ryuu 3.x')
      // .option('-o, --oauth', 'setup oauth')
      .option('--no-upgrade-check', 'do not check for new versions')
      .option(
        '--upgrade-download',
        'Automatically download newer version if available. ',
      )
      .action(this.run.bind(this));
  }

  public async run(args: CommandOptions) {
    if (args.upgradeDownload) {
      autoUpdate = true;
    }
    if (args.transfer) {
      const isWin = process.platform === 'win32';
      const homeEnv = process.env[isWin ? 'USERPROFILE' : 'HOME'];
      const deprecatedLoginDir = `${homeEnv}/.domo/login/`;

      if (fs.existsSync(deprecatedLoginDir)) {
        try {
          fs.copySync(deprecatedLoginDir, `${Domo.getHomeDir()}/ryuu/`, {
            overwrite: false,
          });
        } catch (error) {
          this.logFail('Failed to transfer logins:', error);
        }
      } else {
        this.logFail(
          'You do not have any ryuu 3.x logins to transfer to ryuu 4.x. Run this command without the -t flag to log in.',
        );
      }
    }
    const previousLogins = Login.getPreviousLogins();
    const currentLogin = Login.getCurrentLogin().instance;
    const prompts = [];

    if (!args.instance) {
      prompts.push(
        multichoice(
          {
            //@ts-ignore
            type: 'autocomplete',
            source: (prevAnswers: inquirer.Answers, input: string) => {
              const filtered = previousLogins
                .map(login => login.instance)
                .filter(c =>
                  input === undefined ? true : c.indexOf(input) >= 0,
                );
              filtered.push(NEW_INSTANCE);
              return Promise.resolve(filtered);
            },
            message: 'Domo instance ' + chalk.grey('e.g. company.domo.com '),
            name: 'instance',
            default: currentLogin,
            when: previousLogins.length > 0,
          },
          previousLogins,
          NEW_INSTANCE,
        ),
        {
          type: 'input',
          message: 'Domo instance ' + chalk.grey('e.g. company.domo.com '),
          name: 'newInstance',
          when: (answers: inquirer.Answers) => {
            return !answers.instance || answers.instance === NEW_INSTANCE;
          },
          validate: (input: string) => {
            const acceptedDomains = ['domo.com', 'domotech.io', 'domorig.io'];
            if (acceptedDomains.some(domain => input.endsWith(domain))) {
              return true;
            }
            return (
              'Please login using the full Domo instance. ' +
              chalk.grey('Example: "company.domo.com"')
            );
          },
        },
      );
    }

    try {
      const answers = await inquirer.prompt(prompts);
      const instance = args.instance ?? answers.newInstance ?? answers.instance;
      const login = new Login(instance);
      const client = await login.getClient();
      const loginData = await client.login();
      console.log(chalk.grey(logo));
      this.logOk(
        'Login to ' + instance + ' successful.',
        //@ts-ignore
        'Welcome, ' + loginData.displayName + '.',
      );
      
      login.persistLogin(
        //@ts-ignore
        loginData.refreshToken,
        client.getDevToken(),
      );
      process.exit(0);
    } catch (err: any) {
      this.logFail('Login failed. Please check your credentials and network connection.');
      console.error(chalk.red('Error:'), err);
    }
  }
}

module.exports = (program: Command) => {
  new LoginCommand(program);
};