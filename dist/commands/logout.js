var Login = require('../util/login');
var log = require('../util/log');
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
            Login.getLogin(instance).then(function (login) {
                verifyLogout(login, instance);
            }).catch(function () {
                log.fail('No current login with instance ' + instance);
            });
        }
        else {
            var mayNotBeAuthenticated = true;
            Login.getMostRecentLogin(mayNotBeAuthenticated).then(function (login) {
                instance = login.instance;
                verifyLogout(login, instance);
            }).catch(log.notAuthenticated);
        }
        function verifyLogout(login, instance) {
            Login.verifyLogout(login, instance).then(function (logout) {
                if (logout) {
                    process.exit();
                }
                Login.deleteRefreshToken(login).then(function () {
                    Login.verifyLogout(login, instance);
                }).then(function (logout) {
                    process.exit();
                }).catch(function () {
                    log.fail('Failed to logout');
                });
            });
        }
    });
};
//# sourceMappingURL=logout.js.map