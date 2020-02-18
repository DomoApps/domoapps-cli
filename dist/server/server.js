"use strict";
/**
 * domo dev server
 */
Object.defineProperty(exports, "__esModule", { value: true });
var path = require("path");
var _ = require("lodash");
var fs = require("fs-extra");
var Promise = require("bluebird");
var bs = require('browser-sync').create();
var portfinder = require("portfinder");
portfinder.basePort = 3000;
var session_1 = require("../util/session");
var appStructure = require("../util/appStructure");
var manifest_1 = require("../util/manifest");
var Domo = require("ryuu-client");
var express = require("express");
var app = express();
var Proxy = require('@domoinc/ryuu-proxy').Proxy;
var config = { manifest: manifest_1.Manifest.get() };
var proxy = new Proxy(config);
var manifest = manifest_1.Manifest.get();
var context = {
    accountMapping: null,
    collections: null,
    designId: null,
    designVersion: null,
    id: null,
    isDisabled: null,
    mapping: null
};
var isValidContext = true;
var domoApp;
var domoOptions;
app.get('/', function (req, res) {
    //This line doesn't make any sense, I gotta figure out how to make domoApp something real/valid
    var isValidSession = session_1.Session.check(domoApp)
        .then(function () {
        manifest = fs.readJsonSync(path.resolve(process.cwd() + '/' + (domoOptions.manifest || 'manifest.json')));
        return createContext(manifest.id, manifest.mapping);
    })
        .then(function (appContext) {
        context = appContext;
        if (!context) {
            isValidContext = false;
            context.id = 0;
        }
        manifest.contextId = context.id;
        return getDomoappsData();
    })
        .then(function (appData) {
        // sizes consistent with Domo Web
        var sizeMultiplier = {
            width: 235,
            height: 290
        };
        var width = sizeMultiplier.width * manifest.size.width - 10 + 'px';
        var height = sizeMultiplier.height * manifest.size.height - 40 + 'px';
        var userId = domoOptions.userId || appData.user.id;
        var customerId = 1 || appData.customer;
        var url = "index.html?userId=" + userId + "&customer=" + customerId + "&locale=en-US&platform=desktop&context=" + context.id;
        var hasThumbnail = appStructure.hasThumbnail();
        var template = _.template(fs.readFileSync(path.resolve(__dirname + '/../server/domodev/index.html'), "utf8"));
        var fullpage = manifest.fullpage;
        res.send(template({
            manifest: manifest,
            width: width,
            height: height,
            url: url,
            isValidSession: isValidSession,
            isValidContext: isValidContext,
            hasThumbnail: hasThumbnail,
            fullpage: fullpage
        }));
    });
});
app.use('/domodev', express.static(path.resolve(__dirname + '/../server/domodev')));
app.use(express.static('.'));
app.use(proxy.express());
module.exports = {
    start: function (domo, options) {
        return new Promise(function (resolve, reject) {
            portfinder.getPorts(2, {}, function (err, ports) {
                var assetsPort = ports[0];
                var dataPort = ports[1];
                domoApp = domo;
                domoOptions = options;
                session_1.Session.check(domoApp)
                    .then(function () {
                    var external = Boolean(domoOptions.external);
                    app.listen(dataPort);
                    bs.init({
                        proxy: "localhost:" + dataPort,
                        port: assetsPort,
                        notify: false,
                        ui: false,
                        logLevel: 'info',
                        logPrefix: 'Domo Dev',
                        online: external,
                        // TODO: add user's ignored files here too?
                        files: ['**/*', '!node_modules/**/*'],
                    });
                    bs.instance.logger.info('Instance: ' + domoApp.getInstance());
                })
                    .catch(function (e) {
                    reject('Session expired. Please login again using domo login.');
                });
            });
        });
    }
};
function getCustomer() {
    var regexp = /([\w]+)[\.|-]/;
    return domoApp.getInstance().match(regexp)[1];
}
function getEnv() {
    var regexp = /([-_\w]+)\.(.*)/;
    return domoApp.getInstance().match(regexp)[2];
}
/**
 * Fetch domoapps environment data from maestro.
 * Fallback to inferring it by the instance URL.
 */
function getDomoappsData() {
    var manifest = fs.readJsonSync(path.resolve(process.cwd() + '/' + (domoOptions.manifest || 'manifest.json')));
    var uuid = (manifest['proxyId']) ? manifest.proxyId : Domo.createUUID();
    var options = {
        url: 'https://' + domoApp.getInstance() + '/api/content/v1/mobile/environment',
        resolveWithFullResponse: true
    };
    return domoApp.processRequest(options)
        .then(function (res) {
        var data = JSON.parse(res.toString());
        data.url = 'https://' + uuid + '.' + JSON.parse(res.toString()).domoappsDomain;
        return data;
    }).catch(function () {
        var data = { url: 'https://' + uuid + '.domoapps.' + getEnv() };
        return data;
    });
}
function createContext(designId, mapping) {
    var options = {
        url: 'https://' + domoApp.getInstance() + '/domoapps/apps/v2/contexts',
        method: 'POST',
        json: { designId: designId, mapping: mapping },
        resolveWithFullResponse: true
    };
    return domoApp.processRequest(options)
        .then(function (res) {
        return res[0];
    }).catch(function (err) {
        console.log("Error: ", err.message);
        return;
    });
}
//# sourceMappingURL=server.js.map