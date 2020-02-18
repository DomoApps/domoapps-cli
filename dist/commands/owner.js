"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var validator_1 = require("validator");
var manifest_1 = require("../util/manifest");
var login_1 = require("../util/login");
var log_1 = require("../util/log");
module.exports = function (program) {
    program
        .command('owner <add|rm|ls> [user-emails]')
        .description('manage design owners')
        .option('-i, --design_id <id>', 'Specify design ID, otherwise it is retrieved from a manifest file')
        .action(function (action, users, options) {
        var designId;
        if (options.design_id) {
            designId = options.design_id;
            if (!designId || !validator_1.default.isUUID(designId))
                return log_1.log.fail('The value specified for option -i is not a valid design ID', designId);
        }
        else {
            var manifest = manifest_1.Manifest.get(program.manifest);
            if (!manifest)
                return log_1.log.fail('No manifest found. Please supply design id using -i or change to a directory with a valid manifest file');
            if (!manifest.id)
                return log_1.log.fail('No manifest id. Please publish your design before attempting to add owners to it.');
            designId = manifest.id;
        }
        login_1.Login.getMostRecentLogin().then(function (domo) {
            switch (action) {
                case 'add':
                    if (users) {
                        domo.addOwners(designId, users)
                            .tap(function () { return log_1.log.ok('Owners added ' + users); })
                            .catch(function () { return log_1.log.fail('Error adding owners'); })
                            .finally(process.exit);
                    }
                    break;
                case 'rm':
                    if (users) {
                        domo.removeOwners(designId, users)
                            .tap(function () { return log_1.log.ok('Owners removed ' + users); })
                            .catch(function () { return log_1.log.fail('Error removing owners'); })
                            .finally(process.exit);
                    }
                    break;
                case 'ls':
                    domo.getOwners(designId)
                        .tap(function listUsers(res) {
                        res.sort();
                        log_1.log.ok("Owners for design " + designId);
                        res.forEach(function (element, index, array) {
                            console.log("\t" + element);
                        });
                    })
                        .catch(function () { return log_1.log.fail('Error retrieving owners'); })
                        .finally(process.exit);
                    break;
            }
        }).catch(log_1.log.notAuthenticated);
    });
};
//# sourceMappingURL=owner.js.map