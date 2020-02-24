"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var inquirer = require("inquirer");
var login_1 = require("../util/login");
var log_1 = require("../util/log");
module.exports = function (program) {
    program
        .command('revert')
        .description('revert a migration, turning a Custom App back into a mason app')
        .option('-i, --instance <value>', 'Domo instance')
        .option('-a, --app-id <id>', 'app id')
        .action(function (args) {
        login_1.Login.getMostRecentLogin().then(function (mostRecent) {
            var prompts = [];
            if (!args.instance) {
                prompts.push({
                    type: "input",
                    message: "Domo instance",
                    name: "instance",
                    default: mostRecent.getInstance()
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
                .then(function (answers) {
                answers.instance = args.instance || answers.instance;
                answers.id = args.appId || answers.id;
                login_1.Login.getLogin(answers.instance).then(function (domo) {
                    domo.getKpi(answers.id)
                        .then(function (kpi) {
                        //@ts-ignore
                        kpi.type = kpi.metadata.chartType = kpi.metadata.kpiType = 'mason';
                        return kpi;
                    })
                        .then(function (kpi) {
                        return domo.updateKpi(kpi);
                    })
                        .tap(function () { return log_1.log.ok('Card reverted back to a mason app'); })
                        .catch(function () { return log_1.log.clientRequestFailed('Error attempting to revert card'); })
                        .finally(process.exit);
                }).catch(log_1.log.notAuthenticated);
            });
        }).catch(log_1.log.notAuthenticated);
    });
};
//# sourceMappingURL=revert.js.map