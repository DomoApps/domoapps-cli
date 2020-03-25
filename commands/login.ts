import inquirer = require("inquirer");
import _ = require('lodash');
import chalk from 'chalk';
import shell = require('shelljs');
import { log } from '../util/log';
import { LoginData } from 'ryuu-client/models';
import Domo = require('ryuu-client');
import { Command } from 'commander';
import { Login } from '../util/login';
import Promise = require('bluebird');
import path = require('path');
import request = require('request-promise');
import multichoice from '../util/multichoice';
import { Oauth } from '../util/oauth';
import { IncomingMessage } from "http";
import { ProcessedMessage } from "../models/index";
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
const NEW_INSTANCE = 'new instance'
const isWin = process.platform === 'win32';

module.exports = function(program: Command){
  program
    .command('login')
    .description('login to Domo')
    .option('-i, --instance <value>', 'Domo instance')
    .option('-u, --user-email <value>', 'user email')
    .option('-f, --manifest-file <file>', 'use a specific manifest file')
    .option('--no-upgrade-check', 'do not check for new versions')
    .option('--upgrade-download', 'Automatically download newer version if available. ')
    .action(function(args){
      if(args.upgradeDownload){
        autoUpdate = true
      }
      const previousLogins = Login.getPreviousLogins();
      const mayNotBeAuthenticated = true;
      let login: LoginData;
      Login.getMostRecentLogin(mayNotBeAuthenticated).then(function(mostRecent) {
        let prompts = [];
        let versionCheckFn = !args.upgradeCheck ?
          function (x: IncomingMessage) { return x; } :
          verifyVersion;

        if (!args.instance) {
          prompts.push(multichoice({
            type: "list",
            //@ts-ignore
            choices: function(){
              let options = _.map(previousLogins, 'instance');
              options.push(NEW_INSTANCE);
              return options;
            },
            message: "Domo instance " + chalk.grey("e.g. company.domo.com "),
            name: 'instance',

            default: mostRecent.getInstance(),
            // only show up if they have previous logins
            when: function(answers: inquirer.Answers){
              return previousLogins.length > 0;
            }
          }),
          {
            type: "input",
            message: "Domo instance " + chalk.grey("e.g. company.domo.com "),
            name: "newInstance",
            when: function(answers: inquirer.Answers){
              // only ask if the instance selector wasn't used or new one was selected
              return !answers.instance || answers.instance === NEW_INSTANCE;
            },
            validate: function(input: string) {
              const acceptedDomains = ['domo.com', 'domotech.io', 'domorig.io'];
              if (acceptedDomains.some(domain => input.endsWith(domain))) {
                return true;
              }

              return 'Please login using the full Domo instance. ' + chalk.grey('Example: "company.domo.com"');
            }
          });
        }

        // prompt user
        inquirer.prompt(prompts).then(function(answers: inquirer.Answers) {
          if (args.instance) {
            answers.instance = args.instance;
          } else if (answers.instance === NEW_INSTANCE) {
            answers.instance = answers.newInstance;
          }
          Login.getLogin(answers.instance).then(function(domo: Domo) {
            domo
              .login()
              .then(function(l: LoginData) {
                login = l;
              })
              .then(function() {
                const manifest: string = (args.manifestFile !== undefined) ? (args.manifestFile) : ('manifest.json');

                if (Oauth.isOAuthEnabled(manifest)) {
                  if (Oauth.hasAppProxyId(manifest)) {
                    return setupOauth(answers.instance, manifest, Oauth.getAppProxyId(manifest));
                  }
                  else {
                    return promptAppProxyId().then(proxyId => {
                      return setupOauth(answers.instance, manifest, proxyId);
                    });
                  }
                }
              })
              .then(checkVersion.bind(null, answers.instance))
              .then(versionCheckFn)
              .then(function(){
                console.log(chalk.grey(logo));
                log.ok('Login to ' + answers.instance + ' successful.', 'Welcome, ' + login.displayName + '.');
                return Login.persistLogin(answers.instance, login.refreshToken);
              })
              .catch((err) => log.fail(`Login unsuccessful: ${err}`))
              .finally(process.exit);
          }).catch(log.notAuthenticated);
        });
      }).catch(log.notAuthenticated);
    });
}

/**
 * E.T. phone home
 */
function checkVersion(instance: string): request.RequestPromise {
  const cliVersion = require(path.resolve(__dirname + '/../package.json')).version;
  const options = {
    url: 'https://' + instance + '/domoapps/admin/checkversion?version=' + cliVersion,
    method: 'GET',
    json: true,
    resolveWithFullResponse: true
  };
  return request(options);
}


/**
 * log message based on the action
 * if action is 'block' then 'fail' will get called and end the process early
 */
function verifyVersion(res: ProcessedMessage){
  const body = (Array.isArray(res))
    ? (res[0].body)
    : (res.body);

  if (body.action === 'block'){
    log.fail(body.message);
  }

  if (res.action === 'warn'){
    log.warn(res.message);
    return promptUpgrade(res.latest);
  }

  if (res.action === 'info'){
    log.info(res.message);
    return promptUpgrade(res.latest);
  }
}

function promptUpgrade(latest: string) {
  return new Promise(function(resolve, reject){
    let prompts = []
    if(!autoUpdate){
      prompts.push( {
        type: "confirm",
        message: "Would you like to upgrade now?",
        name: "upgrade",
        default: true
      })
    }
    inquirer.prompt(prompts)
      .then(function(answers: inquirer.Answers) {
        if(autoUpdate === true){
          answers.upgrade = autoUpdate;
        }
        if (answers.upgrade){
          log.info('Upgrading to latest version', 'Hang tight, this may take a moment...');
          const output = shell.exec('npm install ryuu -g', {async: false, silent: true});
          if (output.code === 0){
            log.ok('Upgrade to version '+latest+' successful');
            resolve();
          }
          else {
            log.warn('Upgrade unsuccessful', 'Please try upgrading manually with npm install -g ryuu');
          }
        }
        else{
          resolve();
        }
      });
  });
}

/**
 * Oauth Code
 */
function promptAppProxyId(): Promise<string> {
  return new Promise(function(resolve, reject){
    inquirer.prompt([
      {
        type: 'input',
        message: 'Please enter the app instance id ' + chalk.grey('(oauth proxy) '),
        name: 'proxyId'
      }
    ])
      .then((answer: inquirer.Answers) => resolve(answer.proxyId.trim()));
  });
}

function setupOauth(instance: string, manifestName: string, proxyId: string) {
  if (!Oauth.hasTokens({ instance, manifestName, proxyId })) {
    return Oauth.register({instance, manifestName, proxyId})
      .then(result => {
        log.ok('Valid Device Id');
        return Oauth.verifyRegistration({
          instance,
          manifestName,
          proxyId,
          verification_uri: result.verification_uri,
          user_code: result.user_code,
          device_code: result.device_code
        });
      })
      .then(result => {
        log.ok('Retrieved Oauth Tokens');
        Oauth.persistTokens({
          instance,
          manifestName,
          proxyId,
          accessToken: result['access_token'],
          refreshToken: result['refresh_token']
        });
      })
      .catch(error => {
        log.fail(error);
      });
  }
}
