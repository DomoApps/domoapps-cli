var inquirer = require('inquirer');
var chalk = require('chalk');
var Login = require('../util/login');
var log = require('../util/log');
var Domo = require('ryuu-client');
var multichoice = require('../util/multichoice');

module.exports = function(program) {
  program
    .command('token')
    .description('add or remove a developer token')
    .arguments('<cmd>')
    .option('-i, --instance <value>', 'Domo instance')
    .option('-t, --token <value>', 'dev token value used with token add')
    .action(function(cmd, options) {
      var mayNotBeAuthenticated = true;
      var login = Login.getMostRecentLogin(mayNotBeAuthenticated);
      var previousLogins = Login.getPreviousLogins();

      var prompts = [];

      switch (cmd) {
        case "remove":
          if (!options.instance) {
            prompts.push(multichoice({
              type: "list",
              choices: function(){
                return previousLogins.map(item => item.instance);
              },
              message: "Domo instance on which to remove the token " + chalk.grey("e.g. company.domo.com "),
              name: 'instance',
              default: login.instance
            }));
          }

          inquirer.prompt(prompts, function(answers){
            answers.instance = options.instance || answers.instance;
              if (answers.instance){
                var selectedLogin = Login.getLogin(answers.instance);
                delete selectedLogin.devtoken;
                Login.writeLogin(selectedLogin);
                log.ok(`Token removed for ${answers.instance}`, 'Future CLI commands to this instance will require username/password. \nUse the "domo token add" command to use another token.')
              }
          })
          break;

        case "add":
          if (!options.instance) {
            prompts.push(multichoice({
                type: "list",
                choices: function(){
                  var options = previousLogins.map(item => item.instance);
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
              });
          }

          if (!options.token) {
            prompts.push({
              name: 'devtoken',
              type: 'input',
              message: 'Token (can be found in the Admin section of Domo and pasted here)'
            });
          }

          inquirer.prompt(prompts, function(answers){
              answers.instance = options.instance || answers.instance;
              answers.devtoken = options.token || answers.devtoken;
              var devToken = true; 
              Login.persistLogin(answers.instance, answers.devtoken, devToken);
              log.ok(`Token set for ${answers.instance}`, 'Future CLI commands to this instance will not require username/password. \nUse the "domo token remove" command to undo this action.')
            })
          break;

          default:
            log.fail('Invalid option "' + cmd + '"\nValid options are "remove", and "add"');
      }

    });
}