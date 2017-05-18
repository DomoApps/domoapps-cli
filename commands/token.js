var inquirer = require('inquirer');
var chalk = require('chalk');
var _ = require('lodash');
var Domo = require('ryuu-client');
var Login = require('../util/login');
var log = require('../util/log');
var sidUtil = require('../util/sid');
var multichoice = require('../util/multichoice');

module.exports = function(program) {
  program
    .command('token')
    .description('create, add, or remove a developer token')
    .arguments('<cmd>')
    .action(function(cmd) {
      var login = Login.getMostRecentLogin();
      var previousLogins = Login.getPreviousLogins();

      switch (cmd) {
        case "create":
          if (previousLogins.length < 1){
            log.fail('domo token create requires a succesful initial login', 'Please login first using `domo login` or `domo token add`');
          }

          inquirer.prompt([
            multichoice({
              type: "list",
              choices: function(){
                return _.map(previousLogins, 'instance');
              },
              message: "Domo instance on which to create a token " + chalk.grey("e.g. company.domo.com "),
              name: 'instance',
              default: login.instance
            }),
            multichoice({
              type: "list",
              name: "days",
              choices: [{name: "30 days", value: 30}, {name: "60 days", value: 60}, {name: "90 days", value: 90},{name: "180 days", value: 180},{name: "1 year", value: 365}, {name: "5 years", value: 1825}, {name: "10 years", value: 3650}],
              message: "Expires after",
              default: 4
            })
            ], function(answers){
              var selectedLogin = Login.getLogin(answers.instance);
              var domo = new Domo(selectedLogin.instance, selectedLogin.sid, selectedLogin.devtoken);

              var userId = sidUtil.parse(login.sid).userId;

              domo.createDevToken(userId, answers.days)
                  .then(function(res){
                    delete login.sid;
                    login.devtoken = res.token;
                    login.user = res.ownerEmail;
                    Login.writeLogin(login);
                    log.ok(`Token created and set for ${login.instance}`, 'Future CLI commands to this instance will not require username/password. \nUse the "domo token remove" command to undo this action.');
                  })
                  .catch(function(e){
                    switch (e.reason){
                      case "tokenexists":
                        log.fail(`${answers.instance} already has a token associated with it.`, 'To create a new one please run `domo token remove`, then `domo login` with username/password, then `domo token create`.');
                        break;
                      case "nosid":
                        log.fail('Not authenticated with username/password', 'This command requires an initial `domo login` with username/password. Alternatively you can create a token in the Admin section of Domo and use `domo token add`.');
                        break;
                      default:
                        log.notAuthenticated(login);
                    }
                  })
          })

          break;

        case "remove":
          inquirer.prompt([
            multichoice({
              type: "list",
              choices: function(){
                return _.map(previousLogins, 'instance');
              },
              message: "Domo instance on which to remove the token " + chalk.grey("e.g. company.domo.com "),
              name: 'instance',
              default: login.instance
            })
            ], function(answers){
              if (answers.instance){
                var selectedLogin = Login.getLogin(answers.instance);
                delete selectedLogin.devtoken;
                Login.writeLogin(selectedLogin);
                log.ok(`Token removed for ${answers.instance}`, 'Future CLI commands to this instance will require username/password. \nUse the "domo token create" or "domo token add" commands to use another token.')
              }
          })
          break;

        case "add":
          inquirer.prompt([
            multichoice({
              type: "list",
              choices: function(){
                var options = _.map(previousLogins, 'instance');
                options.push('new instance');
                return options;
              },
              message: "Domo instance on which to set the token " + chalk.grey("e.g. company.domo.com "),
              name: 'instance',
              default: login.instance
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
              name: 'devtoken',
              type: 'input',
              message: 'Token (can be found in the Admin section of Domo and pasted here)'
            }], function(answers){
              Login.writeLogin(answers);
              log.ok(`Token set for ${answers.instance}`, 'Future CLI commands to this instance will not require username/password. \nUse the "domo token remove" command to undo this action.')
            })
          break;

          default:
            log.fail('Invalid option "' + cmd + '"\nValid options are "create", "remove", and "add"');
      }

    });
}