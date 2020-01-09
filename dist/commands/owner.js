var validator = require('validator');
var Domo = require('ryuu-client');
var Manifest = require('../util/manifest');
var Login = require('../util/login');
var evoke = require('../util/evoke');
var log = require('../util/log');
var constants = require('../util/constants');
module.exports = function (program) {
    program
        .command('owner <add|rm|ls> [user-emails]')
        .description('manage design owners')
        .option('-i, --design_id <id>', 'Specify design ID, otherwise it is retrieved from a manifest file')
        .action(function (action, users, options) {
        var designId;
        if (options.design_id) {
            designId = options.design_id;
            if (!designId || !validator.isUUID(designId))
                return log.fail('The value specified for option -i is not a valid design ID', designId);
        }
        else {
            var manifest = Manifest.get(program.manifest);
            if (!manifest)
                return log.fail('No manifest found. Please supply design id using -i or change to a directory with a valid manifest file');
            if (!manifest.id)
                return log.fail('No manifest id. Please publish your design before attempting to add owners to it.');
            designId = manifest.id;
        }
        Login.getMostRecentLogin().then(function (domo) {
            switch (action) {
                case 'add':
                    if (users) {
                        domo.addOwners(designId, users)
                            .tap(evoke(log.ok, 'Owners added ' + users))
                            .catch(evoke(log.fail, 'Error adding owners'))
                            .finally(process.exit);
                    }
                    break;
                case 'rm':
                    if (users) {
                        domo.removeOwners(designId, users)
                            .tap(evoke(log.ok, 'Owners removed ' + users))
                            .catch(evoke(log.fail, 'Error removing owners'))
                            .finally(process.exit);
                    }
                    break;
                case 'ls':
                    domo.getOwners(designId)
                        .tap(function listUsers(res) {
                        res.sort();
                        log.ok("Owners for design " + designId);
                        res.forEach(function (element, index, array) {
                            console.log("\t" + element);
                        });
                    })
                        .catch(evoke(log.fail, 'Error retrieving owners'))
                        .finally(process.exit);
                    break;
            }
        }).catch(log.notAuthenticated);
    });
};
//# sourceMappingURL=owner.js.map