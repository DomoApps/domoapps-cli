var Promise = require('bluebird');
var inquirer = require('inquirer');
var Domo = require('ryuu-client');
var Manifest = require('../util/manifest');
//import * as Manifest from '../util/manifest';
var Login = require('../util/login');
var log = require('../util/log');
var constants = require('../util/constants');

module.exports = function(program){
  program
    .command('migrate')
    .description('migrate a mason app to a Custom App')
    .option('-i, --instance <value>', 'Domo instance')
    .option('-a, --app-id <id>', 'app id')
    .action(function(args){
      var manifest = Manifest.get(program.manifest);
      Login.getMostRecentLogin().then(function(mostRecent) {
        if (!manifest) return;

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

        inquirer.prompt(prompts)
          .then(function(answers) {
            answers.instance = args.instance || answers.instance;
            answers.id = args.appId || answers.id;
            Login.getLogin(answers.instance).then(function(domo) {
              migrateApp(domo, answers.id, manifest)
                .tap((message) => log.ok(`Migration successful ${message}`))
                .catch((err) => log.fail(`Migration unsuccessful ${err}`))
                .finally(process.exit);
            }).catch(log.notAuthenticated);
          });
      }).catch(log.notAuthenticated);
    });
};


/**
 * migrate a mason app to a Custom App
 * 1. get the kpi info
 * 2. create a new Custom App design
 * 3. publish design assets
 * 4. create a new Custom App
 * 5. update the kpi
 */
function migrateApp(domo, appId, manifest){
  return Promise.all([
    domo.getKpi(appId),
    // publish new design (and persist id) if not already published
    domo.createDesign(manifest)
      .tap((message) => log.ok(`Design published ${message}`))
      .then(function(designResult){
        var design = designResult[0];
        return Manifest.persistDesignId(design, manifest);
      })
      .catch(function(){
        return manifest;
      })
  ])
  .spread(function(kpi, design){
    return domo
        .createApp(design.id)
        .tap((message) => log.ok(`New Custom App created ${message}`))
        .catch((err) => log.fail(`Error creating new Custom App ${err}`))
        .then(function(domoapp){
          kpi.type = kpi.metadata.chartType = kpi.metadata.kpiType = 'domoapp';
          kpi.domoapp.id = domoapp.id;

          return domo.updateKpi(kpi)
              .tap(log.ok('Card type updated and linked'))
              .catch(log.fail('Error updating card'))
              .then(function(){
                return domo.uploadAllAssets(manifest);
              })
              .tap(log.ok('Assets uploaded'))
              .catch(log.fail('Error uploading assets'));
        });
  });

}
