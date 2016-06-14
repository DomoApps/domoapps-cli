var inquirer = require('inquirer');
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
          inquirer.prompt([{
            name: 'fosho',
            message: `Are you sure you want to stop using a token for ${login.instance}?`,
            type: 'confirm'
          }], function(answers){
            if (answers.fosho){
              delete login.devtoken;
              Login.persistLogin(login.instance, login.user)(login);
              log.ok(`Token removed for ${login.instance}`, 'Future CLI commands to this instance will require username/password. \nUse the "domo token add" command to use another token.')
            }
          })
          break;
        
        case "add":
          inquirer.prompt([{
            name: 'devtoken',
            type: 'input',
            message: 'Token (can be found in the Admin section of Domo)'
          }], function(answers){
            login.devtoken = answers.devtoken;
            Login.persistLogin(login.instance, login.user)(login);
            log.ok(`Token set for ${login.instance}`, 'Future CLI commands to this instance will not require username/password. \nUse the "domo token remove" command to undo this action.')
          })
          break;
      }
      
    });
}
