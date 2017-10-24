var Login = require('../util/login');
var Domo = require('ryuu-client');
var log = require('../util/log');
var session = require('../util/session');
var chalk = require('chalk');

module.exports = function(program){
  program
    .command('ls')
    .description('get a list of all your Custom App designs')
    .action(function(){
      var login = Login.getMostRecentLogin();
      Login.verifyLogin(login);
      var domo = new Domo(login.instance, login.sid, login.devtoken);

      session.check(domo)
        .then(function(){
          domo.getDesigns().then(function(designs){
            var windowWidth = process.stdout.columns;
            if (windowWidth >= 130) {
              var Table = require('cli-table');

              // instantiate
              var table = new Table({
                head: [chalk.cyan('Design Name'), chalk.cyan('Design Id'), chalk.cyan('Date Created'), chalk.cyan('Last Updated')],
                colWidths: [(windowWidth - 105), 38, 31, 31]
              });

              designs.forEach(function(design){
                table.push([design.design.name, design.design.id, new Date(design.design.createdDate).toUTCString(), new Date(design.design.lastModifiedDate).toUTCString()]);
              });

              console.log(table.toString());
            }

            else {
              designs.forEach(function(design){
                console.log('Design Name: ' + design.design.name);
                console.log('Design Id: ' + design.design.id);
                console.log('Date Created: ' + new Date(design.design.createdDate).toUTCString());
                console.log('Last Updated: ' + new Date(design.design.lastModifiedDate).toUTCString() + '\n');
              });
            }


            if (designs.length === 0){
              log.fail('No Designs Published', "`domo ls` will list designs once they're published to Domo");
            }
          })
          .catch(function(e){
            log.fail('Unable to fetch designs', 'You may not have any designs published yet.');
          })
          .finally(process.exit)

        })
        .catch(log.notAuthenticated);
    });
}
