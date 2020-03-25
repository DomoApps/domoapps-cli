"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var inquirer = require("inquirer");
var chalk_1 = require("chalk");
var login_1 = require("../util/login");
var log_1 = require("../util/log");
module.exports = function (program) {
    program
        .command('token')
        .description('add or remove a developer token')
        .arguments('<cmd>')
        .option('-i, --instance <value>', 'Domo instance')
        .option('-t, --token <value>', 'dev token value used with token add')
        .action(function (cmd, options) {
        var mayNotBeAuthenticated = true;
        login_1.Login.getMostRecentLogin(mayNotBeAuthenticated).then(function (login) {
            var previousLogins = login_1.Login.getPreviousLogins();
            var prompts = [];
            switch (cmd) {
                case "remove":
                    if (!options['instance']) {
                        prompts.push({
                            type: "list",
                            choices: function () {
                                return previousLogins.map(function (item) { return item.instance; });
                            },
                            message: "Domo instance on which to remove the token " + chalk_1.default.grey("e.g. company.domo.com "),
                            name: 'instance',
                            default: login.getInstance()
                        });
                    }
                    inquirer.prompt(prompts).then(function (answers) {
                        answers.instance = options['instance'] || answers.instance;
                        if (answers.instance) {
                            login_1.Login.getLogin(answers.instance).then(function (selectedLogin) {
                                //fix this with a function in client
                                selectedLogin.deleteDevToken();
                                login_1.Login.persistLogin(selectedLogin.getInstance(), selectedLogin.getRefreshToken(), selectedLogin.getDevToken());
                                log_1.log.ok("Token removed for " + answers.instance, 'Future CLI commands to this instance will require username/password. \nUse the "domo token add" command to use another token.');
                            });
                        }
                    });
                    break;
                case "add":
                    if (!options['instance']) {
                        prompts.push({
                            type: "list",
                            choices: function () {
                                var options = previousLogins.map(function (item) { return item.instance; });
                                options.push('new instance');
                                return options;
                            },
                            message: "Domo instance on which to set the token " + chalk_1.default.grey("e.g. company.domo.com "),
                            name: 'instance',
                            default: login.getInstance()
                        }),
                            {
                                type: "input",
                                message: "Domo instance " + chalk_1.default.grey("e.g. company.domo.com "),
                                name: "instance",
                                when: function (answers) {
                                    // only ask if the instance selector wasn't used or new one was selected
                                    return !answers.instance || answers.instance === 'new instance';
                                }
                            };
                    }
                    if (!options['token']) {
                        prompts.push({
                            name: 'devtoken',
                            type: 'input',
                            message: 'Token (can be found in the Admin section of Domo and pasted here)'
                        });
                    }
                    inquirer.prompt(prompts).then(function (answers) {
                        answers.instance = options['instance'] || answers.instance;
                        answers.devtoken = options['token'] || answers.devtoken;
                        var devToken = true;
                        login_1.Login.persistLogin(answers.instance, answers.devtoken, devToken);
                        log_1.log.ok("Token set for " + answers.instance, 'Future CLI commands to this instance will not require username/password. \nUse the "domo token remove" command to undo this action.');
                    });
                    break;
                default:
                    log_1.log.fail('Invalid option "' + cmd + '"\nValid options are "remove", and "add"');
            }
        });
    });
};
//# sourceMappingURL=token.js.map