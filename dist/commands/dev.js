"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var login_1 = require("../util/login");
var log_1 = require("../util/log");
module.exports = function (program) {
    program
        .command('dev')
        .description('work locally on a Custom App')
        .option('-u, --userId <value>', 'Use a specific userId')
        .option('-e, --external', 'Allow external connection to access the dev site')
        .action(function (opts) {
        var options = {
            userId: opts.userId,
            external: opts.external,
            manifest: opts.manifest,
        };
        login_1.Login.getMostRecentLogin().then(function (domo) {
            //session will stop authenticated users
            var server = require('../server/server');
            server.start(domo, options).catch(log_1.log.fail);
        }).catch(function (err) {
            if (err.message) {
                log_1.log.fail(log_1.log.handleErrorMessage(err, err.message));
            }
            else {
                log_1.log.notAuthenticated();
            }
        });
    });
};
//# sourceMappingURL=dev.js.map