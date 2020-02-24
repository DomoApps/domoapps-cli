"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var inquirer = require("inquirer");
var manifest_1 = require("../util/manifest");
var login_1 = require("../util/login");
var log_1 = require("../util/log");
var appStructure = require("../util/appStructure");
var index_1 = require("../models/index");
module.exports = function (program) {
    program
        .command('release')
        .description('prepare a design for app store release')
        .action(function () {
        login_1.Login.getMostRecentLogin().then(function (domo) {
            var manifest = manifest_1.Manifest.get(program.manifest);
            // make sure app has been published first
            if (!manifest.id) {
                log_1.log.fail('Can\'t release until design is published.', 'Please publish your Custom App design (with the `domo publish` command) first');
            }
            // make sure there is a thumbnail.png when releasing
            if (!appStructure.hasThumbnail()) {
                log_1.log.fail(index_1.constant.THUMBNAIL_CREATE_WARNING, index_1.constant.CREATE_THUMBNAIL);
            }
            // prompt the user for which design version they want to release, defaulting to latest
            domo.getVersions(manifest.id)
                .then(function (versions) {
                versions.reverse();
                versions.unshift('latest');
                inquirer.prompt([{
                        type: 'list',
                        message: 'select a version to release',
                        name: 'version',
                        choices: versions
                    }])
                    .then(function (answers) {
                    // release the kraken
                    domo.release(manifest.id, answers.version)
                        .tap(function () { return log_1.log.ok('Design version (' + answers.version + ') released'); })
                        .catch(log_1.log.fail)
                        .finally(process.exit);
                });
            })
                .catch(function () { return log_1.log.clientRequestFailed('Error releasing app design'); });
        }).catch(log_1.log.notAuthenticated);
    });
};
//# sourceMappingURL=release.js.map