var inquirer = require('inquirer');
var Login = require('../util/login');
var Domo = require('ryuu-client');
var log = require('../util/log');
var evoke = require('../util/evoke');


module.exports = function(program){
  program
    .command('revert')
    .description('revert a migration, turning a Custom App back into a mason app')
    .option('-i, --instance <value>', 'Domo instance')
    .option('-a, --app-id <id>', 'app id')
    .action(function(args){
      var mostRecent = Login.getMostRecentLogin();
      var prompts = [];

      if (!args.instance) {
        prompts.push({
          type: "input",
          message: "Domo instance",
          name: "instance",
          default: mostRecent.instance
        });
      }

      if (!args.appId) {
        prompts.push({
          type: "input",
          message: "app id",
          name: "id"
        });
      }

      inquirer.prompt(prompts, function(answers) {
        answers.instance = args.instance || answers.instance;
        answers.id = args.appId || answers.id;

        var login = Login.getLogin(answers.instance);
        Login.verifyLogin(login);

        var domo = new Domo(answers.instance, login.refreshToken);
        domo.getKpi(answers.id)
            .then(function(kpi){
              kpi.type = kpi.metadata.chartType = kpi.metadata.kpiType = 'mason';
              return kpi;
            })
            .then(function(kpi){
              return domo.updateKpi(kpi);
            })
            .tap(evoke(log.ok, 'Card reverted back to a mason app'))
            .catch(evoke(log.fail, 'Error attempting to revert card'))
            .finally(process.exit)
      });

    });

}
