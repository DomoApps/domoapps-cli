"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs-extra");
var path = require("path");
var Domo = require("ryuu-client");
var keytar = require("keytar");
var manifest_1 = require("./manifest");
var Promise = require("bluebird");
var request = require("request");
var open = require("open");
var chalk_1 = require("chalk");
var home = Domo.getHomeDir();
var Oauth = /** @class */ (function () {
    function Oauth() {
    }
    Oauth.isOAuthEnabled = function (manifestName) {
        if (manifest_1.Manifest.hasManifest(manifestName)) {
            var manifest = manifest_1.Manifest.get(manifestName);
            return !!manifest.oAuthEnabled;
        }
        return false;
    };
    Oauth.hasAppProxyId = function (manifestName) {
        var manifest = manifest_1.Manifest.get(manifestName);
        return !!Object.keys(manifest).includes('cardId')
            || !!(Object.keys(manifest).includes('proxyId'))
            || !!(Object.keys(manifest).includes('appContextId'));
    };
    /**
     * Requires there to be an appProxyId
     */
    Oauth.getAppProxyId = function (manifestName) {
        var manifest = manifest_1.Manifest.get(manifestName);
        if (!!Object.keys(manifest).includes('cardId')) {
            return manifest.cardId;
        }
        if (!!Object.keys(manifest).includes('appContextId')) {
            return manifest.appContextId;
        }
        return manifest.proxyId;
    };
    Oauth.getScopes = function (manifestName) {
        var manifest = manifest_1.Manifest.get(manifestName);
        if (!!Object.keys(manifest).includes('scopes')) {
            return __spreadArrays([
                'domoapps'
            ], manifest.scopes);
        }
        return ['domoapps'];
    };
    Oauth.hasTokens = function (registration) {
        var scopes = JSON.stringify(this.getScopes(registration.manifestName));
        var instanceFilePath = path.resolve(home + '/login/' + registration.instance + '.json');
        if (fs.existsSync(instanceFilePath)) {
            var instanceData = fs.readJsonSync(instanceFilePath);
            return instanceData.proxyId === registration.proxyId && instanceData.scopes === scopes;
        }
        return false;
    };
    Oauth.register = function (registration) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            request.post({
                url: "https://" + registration.instance + "/api/oauth2/device_authorization",
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                form: {
                    client_id: "domo:ryuu:" + registration.proxyId,
                    scope: _this.getScopes(registration.manifestName).join(' '),
                }
            }, function (error, httpResponse, body) {
                if (httpResponse.statusCode !== 200)
                    reject(body.trim());
                resolve(JSON.parse(body));
            });
        });
    };
    //fix return type
    Oauth.verifyRegistration = function (registration) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            //possible url issue?
            open(registration.verification_uri + "?user_code=" + registration.user_code);
            // scopes are space separated
            var scopes = _this.getScopes(registration.manifestName).join(' ');
            var checkRegistration = setInterval(function () {
                new Promise(function (resolve, reject) {
                    request.get({
                        url: "https://" + registration.instance + "/domoapps/admin/device-registration/" + registration.proxyId + "?scope=" + scopes + "&device_code=" + registration.device_code
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
                    console.log(chalk_1.default.grey('Waiting for browser oauth registration'));
                });
            }, 1000);
            setTimeout(function () {
                clearInterval(checkRegistration);
                reject('Timed out for oauth registration verification.');
            }, 10000);
        });
    };
    Oauth.getLoginData = function (loginFile) {
        return (fs.existsSync(loginFile))
            ? (fs.readJsonSync(loginFile))
            : ({});
    };
    /**
     * persist login to user's domo home
     * TODO: REFACTOR w writeLogin
     */
    Oauth.persistTokens = function (registration) {
        var loginFile = path.resolve(home + '/login/' + registration.instance + '.json');
        var loginData = this.getLoginData(loginFile);
        var scopes = this.getScopes(registration.manifestName);
        fs.ensureFileSync(loginFile);
        var data = __assign(__assign({}, loginData), { instance: registration.instance, scopes: JSON.stringify(scopes), proxyId: registration.proxyId });
        keytar.setPassword("domoapps-oauth-access-" + scopes.join('-'), registration.instance + "-" + registration.proxyId, registration.accessToken);
        keytar.setPassword("domoapps-oauth-refresh-" + scopes.join('-'), registration.instance + "-" + registration.proxyId, registration.refreshToken);
        fs.writeJsonSync(loginFile, data);
        return { accessToken: registration.accessToken, refreshToken: registration.refreshToken };
    };
    Oauth.deleteTokens = function (registration) {
        var scopes = this.getScopes(registration.manifestName);
        var instanceData = fs.readJsonSync(path.resolve(home + '/login/' + registration.instance + '.json'), { throws: false });
        return Promise.all([
            keytar.deletePassword("domoapps-oauth-access-" + scopes.join('-'), registration.instance + "-" + instanceData.proxyId),
            keytar.deletePassword("domoapps-oauth-refresh-" + scopes.join('-'), registration.instance + "-" + instanceData.proxyId),
        ]);
    };
    return Oauth;
}());
exports.Oauth = Oauth;
//# sourceMappingURL=oauth.js.map