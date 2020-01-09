var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
var fs = require('fs-extra');
var path = require('path');
var Domo = require('ryuu-client');
var home = Domo.getHomeDir();
var keytar = require('keytar');
var Manifest = require('./manifest');
var Promise = require('bluebird');
var request = require('request');
var open = require('open');
var chalk = require('chalk');
module.exports = {
    isOAuthEnabled: function (manifestName) {
        if (Manifest.hasManifest(manifestName)) {
            var manifest = Manifest.get(manifestName);
            return !!manifest.oAuthEnabled;
        }
        return false;
    },
    hasAppProxyId: function (manifestName) {
        var manifest = Manifest.get(manifestName);
        return !!Object.keys(manifest).includes('cardId')
            || !!(Object.keys(manifest).includes('proxyId'))
            || !!(Object.keys(manifest).includes('appContextId'));
    },
    /**
     * Requires there to be an appProxyId
     */
    getAppProxyId: function (manifestName) {
        var manifest = Manifest.get(manifestName);
        if (!!Object.keys(manifest).includes('cardId')) {
            return manifest.cardId;
        }
        if (!!Object.keys(manifest).includes('appContextId')) {
            return manifest.appContextId;
        }
        return manifest.proxyId;
    },
    getScopes: function (manifestName) {
        var manifest = Manifest.get(manifestName);
        if (!!Object.keys(manifest).includes('scopes')) {
            return __spreadArrays([
                'domoapps'
            ], manifest.scopes);
        }
        return ['domoapps'];
    },
    hasTokens: function (_a) {
        var instance = _a.instance, manifestName = _a.manifestName, proxyId = _a.proxyId;
        var scopes = JSON.stringify(this.getScopes(manifestName));
        var instanceFilePath = path.resolve(home + '/login/' + instance + '.json');
        if (fs.existsSync(instanceFilePath)) {
            var instanceData = fs.readJsonSync(instanceFilePath);
            return instanceData.proxyId === proxyId && instanceData.scopes === scopes;
        }
        return false;
    },
    register: function (_a) {
        var _this = this;
        var instance = _a.instance, manifestName = _a.manifestName, proxyId = _a.proxyId;
        return new Promise(function (resolve, reject) {
            request.post({
                url: "https://" + instance + "/api/oauth2/device_authorization",
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                form: {
                    client_id: "domo:ryuu:" + proxyId,
                    scope: _this.getScopes(manifestName).join(' '),
                }
            }, function (error, httpResponse, body) {
                if (httpResponse.statusCode !== 200)
                    reject(body.trim());
                resolve(JSON.parse(body));
            });
        });
    },
    verifyRegistration: function (_a) {
        var _this = this;
        var instance = _a.instance, manifestName = _a.manifestName, proxyId = _a.proxyId, verificationUri = _a.verificationUri, userCode = _a.userCode, deviceCode = _a.deviceCode;
        return new Promise(function (resolve, reject) {
            //possible url issue?
            open(verificationUri + "?user_code=" + userCode);
            // scopes are space separated
            var scopes = _this.getScopes(manifestName).join(' ');
            var checkRegistration = setInterval(function () {
                new Promise(function (resolve, reject) {
                    request.get({
                        url: "https://" + instance + "/domoapps/admin/device-registration/" + proxyId + "?scope=" + scopes + "&device_code=" + deviceCode
                    }, function (error, httpResponse, body) {
                        if (httpResponse.statusCode !== 200)
                            reject(body.trim());
                        resolve(JSON.parse(body));
                    });
                })
                    .then(function (result) {
                    clearInterval(checkRegistration);
                    resolve(result);
                })
                    .catch(function (error) {
                    console.log(chalk.grey('Waiting for browser oauth registration'));
                });
            }, 1000);
            setTimeout(function () {
                clearInterval(checkRegistration);
                reject('Timed out for oauth registration verification.');
            }, 10000);
        });
    },
    getLoginData: function (_a) {
        var loginFile = _a.loginFile;
        return (fs.existsSync(loginFile))
            ? (fs.readJsonSync(loginFile))
            : ({});
    },
    /**
     * persist login to user's domo home
     * TODO: REFACTOR w writeLogin
     */
    persistTokens: function (_a) {
        var instance = _a.instance, manifestName = _a.manifestName, proxyId = _a.proxyId, accessToken = _a.accessToken, refreshToken = _a.refreshToken;
        var loginFile = path.resolve(home + '/login/' + instance + '.json');
        var loginData = this.getLoginData(loginFile);
        var scopes = this.getScopes(manifestName);
        fs.ensureFileSync(loginFile);
        var data = __assign(__assign({}, loginData), { instance: instance, scopes: JSON.stringify(scopes), // save scopes to the login file
            proxyId: proxyId });
        keytar.setPassword("domoapps-oauth-access-" + scopes.join('-'), instance + "-" + proxyId, accessToken);
        keytar.setPassword("domoapps-oauth-refresh-" + scopes.join('-'), instance + "-" + proxyId, refreshToken);
        fs.writeJsonSync(loginFile, data);
        return { accessToken: accessToken, refreshToken: refreshToken };
    },
    deleteTokens: function (_a) {
        var instance = _a.instance, manifestName = _a.manifestName;
        var scopes = this.getScopes(manifestName);
        var instanceData = fs.readJsonSync(path.resolve(home + '/login/' + instance + '.json'), { throws: false });
        return new Promise.all([
            keytar.deletePassword("domoapps-oauth-access-" + scopes.join('-'), instance + "-" + instanceData.proxyId),
            keytar.deletePassword("domoapps-oauth-refresh-" + scopes.join('-'), instance + "-" + instanceData.proxyId),
        ]);
    },
    getTokens: function (_a) {
        var instance = _a.instance, manifestName = _a.manifestName;
        var scopes = this.getScopes(manifestName);
        var instanceData = fs.readJsonSync(path.resolve(home + '/login/' + instance + '.json'), { throws: false });
        return new Promise.all([
            keytar.getPassword("domoapps-oauth-access-" + scopes.join('-'), instance + "-" + instanceData.proxyId),
            keytar.getPassword("domoapps-oauth-refresh-" + scopes.join('-'), instance + "-" + instanceData.proxyId),
        ]).then(function (accessToken, refreshToken) { accessToken, refreshToken; });
    }
};
//# sourceMappingURL=oauth.js.map