import Promise = require('bluebird');
import inquirer = require('inquirer');
import autocompletePrompt = require('inquirer-autocomplete-prompt');
import * as chalk from 'chalk';
import _ = require('lodash');
import path = require('path');
import * as fs from 'fs-extra';
import shell = require('shelljs');
import axios, {AxiosRequestConfig, AxiosResponse} from 'axios';
import Domo = require('ryuu-client');
import {log} from '../util/log';
import {Login} from '../util/login';
import multichoice from '../util/multichoice';
import {Oauth} from '../util/oauth';

import {Command} from 'commander';
import {LoginData} from 'ryuu-client/lib/models';
import {IncomingMessage} from 'http';

let autoUpdate = false;
const logo = `
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                                                            ┃
┃                                                            ┃
┃                                                            ┃
┃                                                            ┃
┃                                                            ┃
┃                                                            ┃
┃                                                            ┃
┃                                                            ┃
┃                                                            ┃
┃                                                            ┃
┃██████████      ██████████  ███            ██   ██████████  ┃
┃████████████  ███████████████████        ███████████████████┃
┃███      ████████        ██████████    ██████████        ███┃
┃███       ██████          ██████████████████████          ██┃
┃███      ███████          ██████ ███████  ██████          ██┃
┃███     █████████       ████████   ███    ███████       ████┃
┃████████████  ██████████████████          ██████████████████┃
┃██████████      ██████████  ████          ███   ██████████  ┃
┃                                                            ┃
┃                                                            ┃
┃                                                            ┃
┃                                                            ┃
┃                                                            ┃
┃                                                            ┃
┃                                                            ┃
┃                                                            ┃
┃                                                            ┃
┃                                                            ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛`;
const NEW_INSTANCE = 'new instance';
const isWin = process.platform === 'win32';
inquirer.registerPrompt('autocomplete', autocompletePrompt);

module.exports = function (program: Command) {
  program
    .command('login')
    .description('login to Domo')
    .option('-i, --instance <value>', 'Domo instance')
    .option('-u, --user-email <value>', 'user email')
    .option('-f, --manifest-file <file>', 'use a specific manifest file')
    .option('-t, --transfer', 'transfer login files from ryuu 3.x')
    .option('-o, --oauth', 'setup oauth')
    .option('--no-upgrade-check', 'do not check for new versions')
    .option(
      '--upgrade-download',
      'Automatically download newer version if available. ',
    )
    .action(function (args) {
      if (args.upgradeDownload) {
        autoUpdate = true;
      }
      if (args.transfer) {
        if (
          fs.existsSync(
            `${
              process.env[process.platform == 'win32' ? 'USERPROFILE' : 'HOME']
            }/.domo/login/`,
          )
        ) {
          fs.copySync(
            `${
              process.env[process.platform == 'win32' ? 'USERPROFILE' : 'HOME']
            }/.domo/login/`,
            `${Domo.getHomeDir()}/ryuu/`,
            {overwrite: false},
          );
        } else {
          log.fail(
            'You do not have any ryuu 3.x logins to transfer to ryuu 4.x, run this command without the -t command to login',
          );
        }
      }
      const previousLogins = Login.getPreviousLogins();
      const mayNotBeAuthenticated = true;
      let login: LoginData;
      Login.getMostRecent()
        .then(function (mostRecent) {
          let prompts = [];
          let versionCheckFn = !args.upgradeCheck
            ? function (x: IncomingMessage) {
                return x;
              }
            : verifyVersion;

          if (!args.instance) {
            prompts.push(
              multichoice(
                {
                  type: 'autocomplete',
                  source: (prevAnswers: inquirer.Answers, input: string) => {
                    let options = _.map(previousLogins, 'instance');
                    const filtered = options.filter(c =>
                      input === undefined ? true : c.indexOf(input) >= 0,
                    );
                    filtered.push(NEW_INSTANCE);
                    return Promise.resolve(filtered);
                  },
                  message:
                    'Domo instance ' + chalk.grey('e.g. company.domo.com '),
                  name: 'instance',

                  default: function () {
                    if (mostRecent) return mostRecent;
                    else return;
                  },
                  // only show up if they have previous logins
                  when: function (answers: inquirer.Answers) {
                    return previousLogins.length > 0;
                  },
                },
                previousLogins,
                NEW_INSTANCE,
              ),
              {
                type: 'input',
                message:
                  'Domo instance ' + chalk.grey('e.g. company.domo.com '),
                name: 'newInstance',
                when: function (answers: inquirer.Answers) {
                  // only ask if the instance selector wasn't used or new one was selected
                  return !answers.instance || answers.instance === NEW_INSTANCE;
                },
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
              },
            );
          }

          // prompt user
          inquirer
            .prompt(prompts)
            .then(function (answers: inquirer.Answers) {
              if (args.instance) {
                answers.instance = args.instance;
              } else if (answers.newInstance) {
                answers.instance = answers.newInstance;
              }
              Login.getLogin(answers.instance)
                .then(function (domo: Domo) {
                  domo
                    .login()
                    .then(function (l: LoginData) {
                      login = l;
                    })
                    .catch(() =>
                      log.fail(
                        'Failure to get user from server',
                        'Possible instance name issue, authorization issue, or timeout on given instance',
                      ),
                    )
                    .then(function () {
                      if (args.oauth) {
                        const manifest: string =
                          args.manifestFile !== undefined
                            ? args.manifestFile
                            : 'manifest.json';
                        if (Oauth.isOAuthEnabled(manifest)) {
                          if (Oauth.hasAppProxyId(manifest)) {
                            return setupOauth(
                              answers.instance,
                              manifest,
                              Oauth.getAppProxyId(manifest),
                            );
                          } else {
                            return promptAppProxyId().then(proxyId => {
                              return setupOauth(
                                answers.instance,
                                manifest,
                                proxyId,
                              );
                            });
                          }
                        }
                      } else return;
                    })
                    .catch(() => log.fail('Failure to setup oauth'))
                    /*
              .then(
                checkVersion.bind(null, answers.instance)
              )
              //@ts-ignore
              .then(versionCheckFn)
              .catch(() => console.log ("NPM servers are down, skipping checking for latest version."))
              */
                    .then(function () {
                      console.log(chalk.grey(logo));
                      log.ok(
                        'Login to ' + answers.instance + ' successful.',
                        'Welcome, ' + login.displayName + '.',
                      );
                      return Login.persistLogin(
                        answers.instance,
                        login.refreshToken,
                        domo.getDevToken(),
                      );
                    })
                    //@ts-ignore
                    .catch(err =>
                      log.fail(`Login unsuccessful: ${JSON.stringify(err)}`),
                    )
                    .finally(process.exit);
                })
                .catch(test => {
                  console.log(test);
                  return log.notAuthenticated;
                });
            })
            .catch(err =>
              log.fail(
                `Login failed, likely an issue with data in ~/.config/configstore/ryuu: ${err}`,
              ),
            );
        })
        .catch(test => {
          console.log(test);
          return log.notAuthenticated;
        });
    });
};

/**
 * E.T. phone home
 */
function checkVersion(instance: string) {
  const cliVersion = require(path.resolve(
    __dirname + '/../package.json',
  )).version;
  const options: AxiosRequestConfig = {
    url:
      'https://' +
      instance +
      '/domoapps/admin/checkversion?version=' +
      cliVersion,
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  };
  return axios(options);
}

/**
 * log message based on the action
 * if action is 'block' then 'fail' will get called and end the process early
 */
function verifyVersion(res: AxiosResponse) {
  const body = Array.isArray(res.data) ? res[0].data : res.data;

  if (body.action === 'block') {
    log.fail(body.message);
  }

  if (body.action === 'warn') {
    log.warn(body.message);
    return promptUpgrade(body.latest);
  }

  if (body.action === 'info') {
    log.info(body.message);
    return promptUpgrade(body.latest);
  }
}

function promptUpgrade(latest: string) {
  return new Promise(function (resolve, reject) {
    let prompts = [];
    if (!autoUpdate) {
      prompts.push({
        type: 'confirm',
        message: 'Would you like to upgrade now?',
        name: 'upgrade',
        default: true,
      });
    }
    inquirer.prompt(prompts).then(function (answers: inquirer.Answers) {
      if (autoUpdate === true) {
        answers.upgrade = autoUpdate;
      }
      if (answers.upgrade) {
        log.info(
          'Upgrading to latest version',
          'Hang tight, this may take a moment...',
        );
        const output = shell.exec('npm install ryuu -g', {
          async: false,
          silent: true,
        });
        if (output.code === 0) {
          log.ok('Upgrade to version ' + latest + ' successful');
          resolve();
        } else {
          log.warn(
            'Upgrade unsuccessful',
            'Please try upgrading manually with npm install -g ryuu',
          );
        }
      } else {
        resolve();
      }
    });
  });
}

/**
 * Oauth Code
 */
function promptAppProxyId(): Promise<string> {
  return new Promise(function (resolve, reject) {
    inquirer
      .prompt([
        {
          type: 'input',
          message:
            'Please enter the app instance id ' + chalk.grey('(oauth proxy) '),
          name: 'proxyId',
        },
      ])
      .then((answer: inquirer.Answers) => resolve(answer.proxyId.trim()));
  });
}

function setupOauth(instance: string, manifestName: string, proxyId: string) {
  if (!Oauth.hasTokens({instance, manifestName, proxyId})) {
    return Oauth.register({instance, manifestName, proxyId})
      .then(response => {
        const result = response.data;
        log.ok('Valid Device Id');
        return Oauth.verifyRegistration({
          instance,
          manifestName,
          proxyId,
          verification_uri: result['verification_uri'],
          user_code: result['user_code'],
          device_code: result['device_code'],
        });
      })
      .then(response => {
        const result = response.data;
        log.ok('Retrieved Oauth Tokens');
        Oauth.persistTokens({
          instance,
          manifestName,
          proxyId,
          accessToken: result['access_token'],
          refreshToken: result['refresh_token'],
        });
      })
      .catch(error => {
        log.fail(error);
      });
  }
}
