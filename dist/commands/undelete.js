"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var login_1 = require("../util/login");
var design = require("../util/design");
var log_1 = require("../util/log");
var inquirer = require("inquirer");
module.exports = function (program) {
    program
        .command('undelete [id]')
        .description('undelete a soft-deleted design')
        .action(function (arg, options) {
        var designId = design.getDesignId(arg, null, program.manifest);
        inquirer.prompt([{
                type: 'confirm',
                message: 'Are you sure you want to undelete design with id: ' + designId + '?',
                name: 'undelete',
                default: true
            }])
            .then(handleUserResponse);
        function handleUserResponse(answer) {
            if (answer.undelete) {
                login_1.Login.getMostRecentLogin().then(function (domo) {
                    domo.unDeleteDesign(designId)
                        .tap(function () { return log_1.log.ok('Undeleted design ' + designId); })
                        .catch(function () { return log_1.log.clientRequestFailed('Unable to undelete design ' + designId); })
                        .finally(process.exit);
                }).catch(log_1.log.notAuthenticated);
            }
            else {
                log_1.log.fail('Undelete command aborted');
            }
        }
    });
};
//# sourceMappingURL=undelete.js.map