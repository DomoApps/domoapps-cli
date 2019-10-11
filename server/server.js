"use strict";
/**
 * domo dev server
 */
Object.defineProperty(exports, "__esModule", { value: true });
var path = require("path");
var _ = require("lodash");
var fs = require("fs-extra");
var Promise = require("bluebird");
//const Promise = require('bluebird');
var bs = require('browser-sync').create();
var portfinder = require("portfinder");
portfinder.basePort = 3000;
var session = require("../util/session");
var appStructure = require("../util/appStructure");
var Manifest = require("../util/manifest");
var Domo = require("ryuu-client");
var express = require("express");
var app = express();
var Proxy = require('@domoinc/ryuu-proxy').Proxy;
var config = { manifest: Manifest.get() };
var proxy = new Proxy(config);
var manifest = Manifest.get();
var context;
var isValidContext = true;
var domoApp = { domo: {}, options: {} };
app.get('/', function (req, res) {
    var isValidSession = session.check(domoApp.domo)
        .then(function () {
        manifest = fs.readJsonSync(path.resolve(process.cwd() + '/' + (domoApp.options.manifest || 'manifest.json')));
        return createContext(manifest.id, manifest.mapping);
    })
        .then(function (appContext) {
        context = appContext;
        if (!context) {
            isValidContext = false;
            context = { id: 0 };
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
        var userId = domoApp.options.userId || appData.user.id;
        var customerId = 1 || appData.customer;
        var url = "index.html?userId=" + userId + "&customer=" + customerId + "&locale=en-US&platform=desktop&context=" + context.id;
        var hasThumbnail = appStructure.hasThumbnail();
        var template = _.template(fs.readFileSync(path.resolve(__dirname + '/../server/domodev/index.html')));
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
                domoApp.domo = domo;
                domoApp.options = options;
                session.check(domoApp.domo)
                    .then(function () {
                    var external = Boolean(domoApp.options.external);
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
                    bs.instance.logger.info('Instance: ' + domoApp.domo.instance);
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
    return domoApp.domo.instance.match(regexp)[1];
}
function getEnv() {
    var regexp = /([-_\w]+)\.(.*)/;
    return domoApp.domo.instance.match(regexp)[2];
}
/**
 * Fetch domoapps environment data from maestro.
 * Fallback to inferring it by the instance URL.
 */
function getDomoappsData() {
    var manifest = fs.readJsonSync(path.resolve(process.cwd() + '/' + (domoApp.options.manifest || 'manifest.json')));
    var uuid = (manifest['proxyId']) ? manifest.proxyId : Domo.createUUID();
    var options = {
        url: 'https://' + domoApp.domo.instance + '/api/content/v1/mobile/environment'
    };
    return domoApp.domo.processRequest(options)
        .then(function (res) {
        var data = JSON.parse(res);
        data.url = 'https://' + uuid + '.' + JSON.parse(res).domoappsDomain;
        return data;
    }).catch(function () {
        var data = { url: 'https://' + uuid + '.domoapps.' + getEnv() };
        return data;
    });
}
function createContext(designId, mapping) {
    var options = {
        url: 'https://' + domoApp.domo.instance + '/domoapps/apps/v2/contexts',
        method: 'POST',
        json: { designId: designId, mapping: mapping }
    };
    return domoApp.domo.processRequest(options)
        .then(function (res) {
        return res[0];
    }).catch(function (err) {
        console.log("Error: ", err.message);
        return;
    });
}
//# sourceMappingURL=server.js.map