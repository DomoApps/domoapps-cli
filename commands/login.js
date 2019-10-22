var inquirer = require("inquirer");
var _ = require('lodash');
var chalk = require('chalk');
var shell = require('shelljs');
var multichoice = require('../util/multichoice');
var log = require('../util/log');
var Login = require('../util/login');
var evoke = require('../util/evoke');
var Domo = require('ryuu-client');
var Promise = require('bluebird');
var path = require('path');
var request = Promise.promisify(require('request'));
var constants = require('../util/constants');
var Oauth = require('../util/oauth');

var logo = `
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


module.exports = function(program){
  program
    .command('login')
    .description('login to Domo')
    .option('-i, --instance <value>', 'Domo instance')
    .option('-u, --user-email <value>', 'user email')
    .option('-f, --manifest-file <file>', 'use a specific manifest file')
    .option('--no-upgrade-check', 'do not check for new versions')
    .action(function(args){

      var previousLogins = Login.getPreviousLogins();
      var mayNotBeAuthenticated = true;
      Login.getMostRecentLogin(mayNotBeAuthenticated).then(function(mostRecent) {
        var prompts = [];

        var versionCheckFn = !args.upgradeCheck ?
          function (x) { return x; } :
          verifyVersion;

        if (!args.instance) {
          prompts.push(multichoice({
            type: "list",
            choices: function(){
              var options = _.pluck(previousLogins, 'instance');
              options.push('new instance');
              return options;
            },
            message: "Domo instance " + chalk.grey("e.g. company.domo.com "),
            name: 'instance',
            default: mostRecent.instance,
            // only show up if they have previous logins
            when: function(answers){
              return previousLogins.length > 0;
            }
          }),
          {
            type: "input",
            message: "Domo instance " + chalk.grey("e.g. company.domo.com "),
            name: "instance",
            when: function(answers){
              // only ask if the instance selector wasn't used or new one was selected
              return !answers.instance || answers.instance === 'new instance';
            }
          });
        }

        // prompt user
        inquirer.prompt(prompts, function(answers) {

          answers.instance = args.instance || answers.instance;

          if (!answers.instance.endsWith('domo.com') && !answers.instance.endsWith('domotech.io') && !answers.instance.endsWith('domorig.io')){
            log.fail('Please login using the full Domo instance.', 'Example: "company.domo.com"');
          }
          Login.getLogin(answers.instance).then(function(domo) {
            domo
              .login()
              .then(function(l){
                return login = l;
              })
              .then(function(){
                const manifest = (args.manifestFile !== undefined) ? (args.manifestFile) : ('manifest.json');

                if (Oauth.isOAuthEnabled(manifest)) {
                  if (Oauth.hasAppProxyId(manifest)) {
                    return setupOauth(answers.instance, manfiest, Oauth.getAppProxyId(manifest));
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
              .catch(evoke(log.fail, 'Login unsuccessful'))
              .finally(process.exit)
          }).catch(log.notAuthenticated);
        });
      }).catch(log.notAuthenticated);
    });
}

/**
 * E.T. phone home
 */
function checkVersion(instance){
  var cliVersion = require(path.resolve(__dirname + '/../package.json')).version;
  var options = {
    url: 'https://' + instance + '/domoapps/admin/checkversion?version=' + cliVersion,
    method: 'GET',
    json: true
  };

  return request(options);
}


/**
 * log message based on the action
 * if action is 'block' then 'fail' will get called and end the process early
 */
function verifyVersion(res){

  var body = res[0].body;
  if (body.action === 'block'){
    log.fail(body.message);
  }

  if (body.action === 'warn'){
    log.warn(body.message);
    return promptUpgrade(body.latest);
  }

  if (body.action === 'info'){
    log.info(body.message);
    return promptUpgrade(body.latest);
  }
}

function promptUpgrade(latest){
  return new Promise(function(resolve, reject){
    inquirer.prompt([
      {
        type: "confirm",
        message: "Would you like to upgrade now?",
        name: "upgrade",
        default: true
      }

    ], function(answers) {
      if (answers.upgrade){
        log.info('Upgrading to latest version', 'Hang tight, this may take a moment...');
        var output = shell.exec('npm install ryuu -g', {async: false, silent: true});
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
function promptAppProxyId() {
  return new Promise(function(resolve, reject){
    inquirer.prompt([
      {
        type: 'input',
        message: 'Please enter the app instance id ' + chalk.grey('(oauth proxy) '),
        name: 'proxyId'
      }
    ], (answer) => resolve(answer.proxyId.trim()));
  });
}

function setupOauth(instance, manifestName, proxyId) {
  if (!Oauth.hasTokens({ instance, manifestName, proxyId })) {
    return Oauth.register({instance, manifestName, proxyId})
      .then(result => {
        log.ok('Valid Device Id');
        return Oauth.verifyRegistration({
          instance,
          manifestName,
          proxyId,
          verificationUri: result.verification_uri,
          userCode: result.user_code,
          deviceCode: result.device_code
        });
      })
      .then(result => {
        log.ok('Retrieved Oauth Tokens');
        Oauth.persistTokens({
          instance,
          manifestname,
          proxyId,
          accessToken: result.access_token,
          refreshToken: result.refresh_token
        });
      })
      .catch(error => {
        log.fail(error);
      });
  }
}
