"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var glob = require("glob");
var fs = require('fs-extra');
var path = require('path');
var Domo = require('ryuu-client');
var home = Domo.getHomeDir();
var log = require('./log');
var keytar = require('keytar');
var $q = require('q');
var models_1 = require("../models");
//export = Login;
var Login = /** @class */ (function () {
    function Login() {
    }
    Login.getMostRecentLogin = function (mayNotBeAuthenticated) {
        var logins = glob.sync(home + "/login/*.json");
        if (logins.length === 0) {
            var d = $q.defer();
            d.resolve({});
            return d.promise;
        }
        var recent = logins.reduce(function (prev, next) {
            return fs.statSync(prev).mtime > fs.statSync(next).mtime ? prev : next;
        });
        var loginData = fs.readJsonSync(recent);
        return keytar.getPassword('domoapps-cli', loginData.instance).then(function (refreshToken) {
            loginData.refreshToken = refreshToken;
            if (!mayNotBeAuthenticated) {
                verifyLoginLocal(loginData);
            }
            return loginData;
        }).then(function (loginData) {
            return new Domo(loginData.instance, loginData.refreshToken, models_1.constant.CLIENT_ID, loginData.devToken);
        });
    };
    //[object{instance:string}, ...]
    Login.getPreviousLogins = function () {
        var logins = (glob.sync(home + "/login/*.json") || [])
            .map(function (file) {
            return fs.readJsonSync(file);
        });
        return logins;
    };
    /**
     * persist login to user's domo home
     */
    Login.persistLogin = function (instance, refreshToken, devToken) {
        var loginFile = path.resolve(home + '/login/' + instance + '.json');
        var loginData = fs.readJsonSync(loginFile, { throws: false });
        fs.ensureFileSync(loginFile);
        if (refreshToken) {
            keytar.setPassword('domoapps-cli', instance, refreshToken); //runs async to writing, not concerned about waiting
        }
        var data = {
            instance: instance,
            devToken: !!devToken
        };
        fs.writeJsonSync(loginFile, data);
        return { instance: instance, refreshToken: refreshToken, devToken: devToken };
    };
    Login.verifyLogin = function (login) {
        verifyLoginLocal(login);
    };
    Login.verifyLogout = function (login, instance) {
        return keytar.findPassword('domoapps-cli').then(function (refreshToken) {
            if (!login.refreshToken && !refreshToken) {
                log.ok('Successful logout from ' + instance);
                return true;
            }
            return false;
        });
    };
    Login.deleteRefreshToken = function (login) {
        var loginFile = path.resolve(home + '/login/' + login.instance + '.json');
        return keytar.deletePassword('domoapps-cli', login.instance); //runs async to delete, not concerned about waiting
    };
    Login.getLogin = function (instance) {
        return keytar.getPassword('domoapps-cli', instance).then(function (refreshToken) {
            try {
                var loginData = fs.readJsonSync(path.resolve(home + '/login/' + instance + '.json'), { throws: false });
                loginData.refreshToken = refreshToken;
                return new Domo(loginData.instance, loginData.refreshToken, models_1.constant.CLIENT_ID, loginData.devToken);
            }
            catch (ex) {
                return {};
            }
        });
    };
    return Login;
}());
exports.Login = Login;
;
function verifyLoginLocal(login) {
    if (!login.refreshToken) {
        log.fail('Not authenticated', 'Please login using "domo login"');
    }
}
;
//# sourceMappingURL=login.js.map