"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var login_1 = require("../util/login");
var design = require("../util/design");
var log_1 = require("../util/log");
var inquirer = require("inquirer");
module.exports = function (program) {
    program
        .command('delete [id]')
        .description('delete a published design')
        .option('-i, --design_id <id>', '[DEPRECATED] Specify design ID, otherwise it is retrieved from a manifest file')
        .option('-f, --force', 'Delete the design even if it is referenced by Custom Apps')
        .option('-c, --confirm', 'Confirm deleting the app')
        .action(function (arg, options) {
        var designId = design.getDesignId(arg, options['design_id'], program.manifest);
        if (options['confirm']) {
            var answer = { delete: true };
            handleUserResponse(answer);
        }
        else {
            inquirer
                .prompt([{
                    type: 'confirm',
                    message: 'Are you sure you want to delete design with id: ' + designId + '?',
                    name: 'delete',
                    default: false
                }])
                .then(handleUserResponse);
        }
        function handleUserResponse(answer) {
            if (answer.delete) {
                var force = false;
                login_1.Login.getMostRecentLogin().then(function (domo) {
                    if (options['force'])
                        force = true;
                    domo.deleteDesign(designId, force)
                        .tap(function () { return log_1.log.ok('Deleted design ' + designId); })
                        .catch(function () { return log_1.log.clientRequestFailed('Unable to delete design ' + designId); })
                        .finally(process.exit);
                }).catch(log_1.log.notAuthenticated);
            }
            else {
                log_1.log.fail('Delete command aborted');
            }
        }
    });
};
//# sourceMappingURL=delete.js.map