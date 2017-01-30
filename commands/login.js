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
    .description('Login to Domo')
    .action(function(){

      var previousLogins = Login.getPreviousLogins();
      var mostRecent = Login.getMostRecentLogin();

      // prompt user
      inquirer.prompt([
        multichoice({
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
        },
        {
          type: "input",
          message: "user email",
          name: "email",
          default: function(answers){
            // populate with previous email used with this instance
            var previous = _.find(previousLogins, {instance: answers.instance});
            if (previous) return previous.user;
          },
          when: function(answers){
            var instanceLogin = Login.getLogin(answers.instance);
            return !instanceLogin.devtoken;
          }
        },
        {
          type: "password",
          message: "Domo password",
          name: "password",
          when: function(answers){
            var instanceLogin = Login.getLogin(answers.instance);
            return !instanceLogin.devtoken;
          }
        }
      ], function(answers) {
        if (!answers.instance.endsWith('domo.com') && !answers.instance.endsWith('domotech.io')){
          log.fail('Please login using the full Domo instance.', 'Example: "company.domo.com"');
        }

        var instanceLogin = Login.getLogin(answers.instance);
        if (instanceLogin.devtoken){
          // LATER: verify that devtoken is still valid
          // persist login anyway to make it the most recent
          checkVersion(answers.instance)
          .then(verifyVersion)
          .then(function(){
            Login.persistLogin(answers.instance, null, instanceLogin)(instanceLogin);
            console.log(chalk.grey(logo));
            log.ok('Login to ' + answers.instance + ' successful (using developer token)');
            process.exit();
          })
        }
        else{
          var login;
          var domo = new Domo(answers.instance, null, null);
          domo
            .login(answers.email, answers.password)
            .then(function(l){
              return login = l;
            })
            .then(checkVersion.bind(null, answers.instance))
            .then(verifyVersion)
            .then(function(){
                console.log(chalk.grey(logo));
                log.ok('Login to ' + answers.instance + ' successful.', 'Welcome, ' + login.user.USER_FULLNAME + '.');
                log.info(`If you don't want to login all the time you can create a developer token instead by using the \`domo token create\` command.`);
                return login;
            })
            .then(Login.persistLogin(answers.instance, answers.email))
            .catch(evoke(log.fail, 'Login unsuccessful'))
            .finally(process.exit)
        }

      });
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
      if(answers.upgrade){
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
