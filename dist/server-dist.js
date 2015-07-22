/**
 * domo dev server
 */

'use strict';

require('babel-core/polyfill');
var fs = require('fs-extra');
var path = require('path');
var _ = require('lodash');
var koa = require('koa');
var Router = require('koa-router');
var bs = require('browser-sync').create();
var request = require('request');
var Domo = require('ryuu-client');
var inquirer = require("inquirer");
var Promise = require('bluebird');
var app = koa();
var api = new Router();
var portfinder = require('portfinder');
portfinder.basePort = 3000;

api.get('/', regeneratorRuntime.mark(function callee$0$0() {
  var template, manifest, sizeMultiplier, width, height, url, mapping;
  return regeneratorRuntime.wrap(function callee$0$0$(context$1$0) {
    while (1) switch (context$1$0.prev = context$1$0.next) {
      case 0:
        template = _.template(fs.readFileSync(path.resolve(__dirname + '/../server/wrapper.html')));
        manifest = fs.readJsonSync(path.resolve(process.cwd() + '/manifest.json'));
        sizeMultiplier = {
          width: 235,
          height: 290
        };
        width = 235 * manifest.size.width - 10;
        height = 290 * manifest.size.height - 40;
        url = "/index.html?userId=27&customer=dev&locale=en-US&platform=desktop";
        mapping = encodeURIComponent(JSON.stringify(manifest.mapping));

        url += "&mappingOverride=" + mapping;

        this.body = template({ manifest: manifest, width: width, height: height, url: url });

      case 9:
      case 'end':
        return context$1$0.stop();
    }
  }, callee$0$0, this);
}));

// Proxy requests to the correct domoapps service for the environment they're logged into.
api.get('/data/v1/:query', regeneratorRuntime.mark(function callee$0$0() {
  var manifest, baseUrl, j, url, auth, cookie;
  return regeneratorRuntime.wrap(function callee$0$0$(context$1$0) {
    while (1) switch (context$1$0.prev = context$1$0.next) {
      case 0:
        manifest = fs.readJsonSync(path.resolve(process.cwd() + '/manifest.json'));
        context$1$0.next = 3;
        return getDomoappsDomain();

      case 3:
        baseUrl = context$1$0.sent;
        j = request.jar();
        url = baseUrl + this.request.url;
        auth = 'DA-SID-' + getCustomer() + '="' + app.domo.sid + '"';
        cookie = request.cookie(auth);

        j.setCookie(cookie, baseUrl);
        this.body = request({ url: url, jar: j, headers: { referer: this.request.headers.referer } });

      case 10:
      case 'end':
        return context$1$0.stop();
    }
  }, callee$0$0, this);
}));

app.use(api.middleware());
app.use(require('koa-static')('.'));

module.exports = {
  start: function start(domo) {
    portfinder.getPorts(2, function (err, ports) {
      var assetsPort = ports[0];
      var dataPort = ports[1];
      app.domo = domo;

      app.listen(dataPort);

      bs.init({
        proxy: "localhost:" + dataPort,
        port: assetsPort,
        notify: false,
        ui: false,
        logLevel: 'info',
        // TODO: add user's ignored files here too?
        files: ['**/*', '!node_modules/**/*']
      });
    });
  }
};

function getCustomer() {
  var regexp = /([\w]+)[\.|-]/;
  return app.domo.instance.match(regexp)[1];
}

function getEnv() {
  var regexp = /([-_\w]+)\.(.*)/;
  return app.domo.instance.match(regexp)[2];
}

/**
 * Fetch domoapps domain from maestro.
 * Fallback to inferring it by the instance URL.
 */
function getDomoappsDomain() {
  var uuid = Domo.createUUID();
  var j = request.jar();
  var auth = 'SID="' + app.domo.sid + '"';
  var cookie = request.cookie(auth);
  j.setCookie(cookie, 'https://' + app.domo.instance);

  return new Promise(function (resolve, reject) {
    request({ url: 'https://' + app.domo.instance + '/api/content/v1/mobile/environment', jar: j }, function (err, res) {
      if (res.statusCode === 200) {
        resolve('https://' + uuid + '.' + JSON.parse(res.body).domoappsDomain);
      } else {
        resolve('https://' + uuid + '.domoapps.' + getEnv());
      }
    });
  });
}

/**
 * Convert mapping to short syntax.
 * Datasourceid followed by any field aliases.
 * Will use this in the future.
 */
// function shortenMapping(mapping){
//   var res = [];
//   mapping.forEach(function(datapoint){
//     res.push(datapoint.dataSourceId);
//     datapoint.fields.forEach(function(field){
//       res.push(field.columnName);
//     });
//   });
//  
//   return JSON.stringify(res);
// }

// sizes consistent with Domo Web

// var mapping = shortenMapping(manifest.mapping);
//# sourceMappingURL=server-dist.js.map
