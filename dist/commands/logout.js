"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var login_1 = require("../util/login");
var log = require("../util/log");
module.exports = function (program) {
    program
        .command('logout')
        .description('logout of Domo')
        .option('-i, --instance <value>', 'Domo instance')
        .action(function (args) {
        var instance;
        var login;
        if (args.instance) {
            instance = args.instance;
            login_1.Login.getLogin(instance)
                .then(function (login) {
                verifyLogout(login, instance);
            })
                .catch(function () {
                log.fail('No current login with instance ' + instance);
            });
        }
        else {
            var mayNotBeAuthenticated = true;
            login_1.Login.getMostRecentLogin(mayNotBeAuthenticated).then(function (login) {
                instance = login.getInstance();
                verifyLogout(login, instance);
            }).catch(log.notAuthenticated);
        }
    });
};
function verifyLogout(login, instance) {
    login_1.Login.verifyLogout(login, instance).then(function (logout) {
        if (logout) {
            process.exit();
        }
        login_1.Login.deleteRefreshToken(login).then(function () {
            login_1.Login.verifyLogout(login, instance);
        }).then(function (logout) {
            process.exit();
        }).catch(function () {
            log.fail('Failed to logout');
        });
    });
}
//# sourceMappingURL=logout.js.map