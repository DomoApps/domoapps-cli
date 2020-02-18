"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var inquirer = require("inquirer");
var _ = require("lodash");
var chalk_1 = require("chalk");
var shell = require("shelljs");
var log_1 = require("../util/log");
var login_1 = require("../util/login");
var Promise = require("bluebird");
var path = require("path");
var request = require("request-promise");
var oauth_1 = require("../util/oauth");
var autoUpdate = false;
var logo = "\n\u250F\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2513\n\u2503                                                            \u2503\n\u2503                                                            \u2503\n\u2503                                                            \u2503\n\u2503                                                            \u2503\n\u2503                                                            \u2503\n\u2503                                                            \u2503\n\u2503                                                            \u2503\n\u2503                                                            \u2503\n\u2503                                                            \u2503\n\u2503                                                            \u2503\n\u2503\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588      \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588  \u2588\u2588\u2588            \u2588\u2588   \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588  \u2503\n\u2503\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588  \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588        \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2503\n\u2503\u2588\u2588\u2588      \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588        \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588    \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588        \u2588\u2588\u2588\u2503\n\u2503\u2588\u2588\u2588       \u2588\u2588\u2588\u2588\u2588\u2588          \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588          \u2588\u2588\u2503\n\u2503\u2588\u2588\u2588      \u2588\u2588\u2588\u2588\u2588\u2588\u2588          \u2588\u2588\u2588\u2588\u2588\u2588 \u2588\u2588\u2588\u2588\u2588\u2588\u2588  \u2588\u2588\u2588\u2588\u2588\u2588          \u2588\u2588\u2503\n\u2503\u2588\u2588\u2588     \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588       \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588   \u2588\u2588\u2588    \u2588\u2588\u2588\u2588\u2588\u2588\u2588       \u2588\u2588\u2588\u2588\u2503\n\u2503\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588  \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588          \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2503\n\u2503\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588      \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588  \u2588\u2588\u2588\u2588          \u2588\u2588\u2588   \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588  \u2503\n\u2503                                                            \u2503\n\u2503                                                            \u2503\n\u2503                                                            \u2503\n\u2503                                                            \u2503\n\u2503                                                            \u2503\n\u2503                                                            \u2503\n\u2503                                                            \u2503\n\u2503                                                            \u2503\n\u2503                                                            \u2503\n\u2503                                                            \u2503\n\u2517\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u251B";
module.exports = function (program) {
    program
        .command('login')
        .description('login to Domo')
        .option('-i, --instance <value>', 'Domo instance')
        .option('-u, --user-email <value>', 'user email')
        .option('-f, --manifest-file <file>', 'use a specific manifest file')
        .option('--no-upgrade-check', 'do not check for new versions')
        .option('--upgrade-download', 'Automatically download newer version if available. ')
        .action(function (args) {
        if (args.upgradeDownload) {
            autoUpdate = true;
        }
        var previousLogins = login_1.Login.getPreviousLogins();
        var mayNotBeAuthenticated = true;
        var login;
        login_1.Login.getMostRecentLogin(mayNotBeAuthenticated).then(function (mostRecent) {
            var prompts = [];
            var versionCheckFn = !args.upgradeCheck ?
                function (x) { return x; } :
                verifyVersion;
            if (!args.instance) {
                prompts.push({
                    type: "list",
                    choices: function () {
                        var options = _.map(previousLogins, 'instance');
                        options.push('new instance');
                        return options;
                    },
                    message: "Domo instance " + chalk_1.default.grey("e.g. company.domo.com "),
                    name: 'instance',
                    default: mostRecent.getInstance,
                    // only show up if they have previous logins
                    when: function (answers) {
                        return previousLogins.length > 0;
                    }
                }, {
                    type: "input",
                    message: "Domo instance " + chalk_1.default.grey("e.g. company.domo.com "),
                    name: "instance",
                    when: function (answers) {
                        // only ask if the instance selector wasn't used or new one was selected
                        return !answers.instance || answers.instance === 'new instance';
                    }
                });
            }
            // prompt user
            inquirer.prompt(prompts).then(function (answers) {
                answers.instance = args.instance || answers.instance;
                if (!answers.instance.endsWith('domo.com') && !answers.instance.endsWith('domotech.io') && !answers.instance.endsWith('domorig.io')) {
                    log_1.log.fail('Please login using the full Domo instance.', 'Example: "company.domo.com"');
                }
                login_1.Login.getLogin(answers.instance).then(function (domo) {
                    domo
                        .login()
                        .then(function (l) {
                        login = l;
                    })
                        .then(function () {
                        var manifest = (args.manifestFile !== undefined) ? (args.manifestFile) : ('manifest.json');
                        if (oauth_1.Oauth.isOAuthEnabled(manifest)) {
                            if (oauth_1.Oauth.hasAppProxyId(manifest)) {
                                return setupOauth(answers.instance, manifest, oauth_1.Oauth.getAppProxyId(manifest));
                            }
                            else {
                                return promptAppProxyId().then(function (proxyId) {
                                    return setupOauth(answers.instance, manifest, proxyId);
                                });
                            }
                        }
                    })
                        .then(checkVersion.bind(null, answers.instance))
                        .then(versionCheckFn)
                        .then(function () {
                        console.log(chalk_1.default.grey(logo));
                        log_1.log.ok('Login to ' + answers.instance + ' successful.', 'Welcome, ' + login.displayName + '.');
                        return login_1.Login.persistLogin(answers.instance, login.refreshToken);
                    })
                        .catch(function (err) { return log_1.log.fail("Login unsuccessful: " + err); })
                        .finally(process.exit);
                }).catch(log_1.log.notAuthenticated);
            });
        }).catch(log_1.log.notAuthenticated);
    });
};
/**
 * E.T. phone home
 */
function checkVersion(instance) {
    var cliVersion = require(path.resolve(__dirname + '/../package.json')).version;
    var options = {
        url: 'https://' + instance + '/domoapps/admin/checkversion?version=' + cliVersion,
        method: 'GET',
        json: true,
        resolveWithFullResponse: true
    };
    return request(options);
}
/**
 * log message based on the action
 * if action is 'block' then 'fail' will get called and end the process early
 */
function verifyVersion(res) {
    var body = (Array.isArray(res))
        ? (res[0].body)
        : (res.body);
    if (body.action === 'block') {
        log_1.log.fail(body.message);
    }
    if (res.action === 'warn') {
        log_1.log.warn(res.message);
        return promptUpgrade(res.latest);
    }
    if (res.action === 'info') {
        log_1.log.info(res.message);
        return promptUpgrade(res.latest);
    }
}
function promptUpgrade(latest) {
    return new Promise(function (resolve, reject) {
        var prompts = [];
        if (!autoUpdate) {
            prompts.push({
                type: "confirm",
                message: "Would you like to upgrade now?",
                name: "upgrade",
                default: true
            });
        }
        inquirer.prompt(prompts)
            .then(function (answers) {
            if (autoUpdate === true) {
                answers.upgrade = autoUpdate;
            }
            if (answers.upgrade) {
                log_1.log.info('Upgrading to latest version', 'Hang tight, this may take a moment...');
                var output = shell.exec('npm install ryuu -g', { async: false, silent: true });
                if (output.code === 0) {
                    log_1.log.ok('Upgrade to version ' + latest + ' successful');
                    resolve();
                }
                else {
                    log_1.log.warn('Upgrade unsuccessful', 'Please try upgrading manually with npm install -g ryuu');
                }
            }
            else {
                resolve();
            }
        });
    });
}
/**
 * Oauth Code
 */
function promptAppProxyId() {
    return new Promise(function (resolve, reject) {
        inquirer.prompt([
            {
                type: 'input',
                message: 'Please enter the app instance id ' + chalk_1.default.grey('(oauth proxy) '),
                name: 'proxyId'
            }
        ])
            .then(function (answer) { return resolve(answer.proxyId.trim()); });
    });
}
function setupOauth(instance, manifestName, proxyId) {
    if (!oauth_1.Oauth.hasTokens({ instance: instance, manifestName: manifestName, proxyId: proxyId })) {
        return oauth_1.Oauth.register({ instance: instance, manifestName: manifestName, proxyId: proxyId })
            .then(function (result) {
            log_1.log.ok('Valid Device Id');
            return oauth_1.Oauth.verifyRegistration({
                instance: instance,
                manifestName: manifestName,
                proxyId: proxyId,
                verification_uri: result.verification_uri,
                user_code: result.user_code,
                device_code: result.device_code
            });
        })
            .then(function (result) {
            log_1.log.ok('Retrieved Oauth Tokens');
            oauth_1.Oauth.persistTokens({
                instance: instance,
                manifestName: manifestName,
                proxyId: proxyId,
                accessToken: result['access_token'],
                refreshToken: result['refresh_token']
            });
        })
            .catch(function (error) {
            log_1.log.fail(error);
        });
    }
}
//# sourceMappingURL=login.js.map