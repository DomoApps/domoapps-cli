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
    .arguments('<cmd>')
    .action(function(cmd) {
      var login = Login.getMostRecentLogin();
      var previousLogins = Login.getPreviousLogins();
      var domo = new Domo(login.instance, login.sid, login.devtoken);
      
      switch (cmd) {
        case "create":
          var sid = sidUtil.parse(login.sid);
          
          inquirer.prompt([
            multichoice({
              type: "list",
              name: "days",
              choices: [{name: "30 days", value: 30}, {name: "60 days", value: 60}, {name: "90 days", value: 90},{name: "180 days", value: 180},{name: "1 year", value: 365}, {name: "5 years", value: 1825}, {name: "10 years", value: 3650}],
              message: "Expires after",
              default: 4
            })
            ], function(answers){
              domo.createDevToken(sid.userId, answers.days)
                  .then(function(res){
                    login.devtoken = res.token;
                    Login.persistLogin(login.instance, login.user)(login);
                    log.ok(`Token created and set for ${login.instance}`, 'Future CLI commands to this instance will not require username/password. \nUse the "domo token remove" command to undo this action.')
                  })
                  .catch(function(e){
                    log.fail(e, 'Please login first using the `domo login` command. \nTokens may also be created in the Admin section of Domo, then manually added to the CLI with the `domo token add` command');
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
              message: "Domo instance on which to remove the token " + chalk.grey("e.g. ebay.domo.com "),
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
              message: "Domo instance on which to set the token " + chalk.grey("e.g. ebay.domo.com "),
              name: 'instance',
              default: login.instance
            }),
            {
              type: "input",
              message: "Domo instance " + chalk.grey("e.g. ebay.domo.com "),
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
      }
      
    });
}
