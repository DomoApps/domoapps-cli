var inquirer = require('inquirer');
var Login = require('../util/login');
var Domo = require('ryuu-client');
var log = require('../util/log');
var evoke = require('../util/evoke');


module.exports = function(program){
  program
    .command('revert')
    .description('Revert a migration, turning a Custom App back into a mason app')
    .action(function(){
      var mostRecent = Login.getMostRecentLogin();

      inquirer.prompt([
        {
          type: "input",
          message: "Domo instance",
          name: "instance",
          default: mostRecent.instance
        },
        {
          type: "input",
          message: "app id",
          name: "id"
        }
      ], function(answers) {
        var login = Login.getLogin(answers.instance);
        Login.verifyLogin(login);

        var domo = new Domo(answers.instance, login.sid, login.devtoken);
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
