/**
 * domo dev server
 */

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
var body_parser = require('koa-bodyparser');
var app = koa();
var api = new Router();
var portfinder = require('portfinder');
var serve = require('koa-static');
var mount = require('koa-mount');
var proxyaddr = require('proxy-addr');
var session = require('../util/session');
var appStructure = require('../util/appStructure');

portfinder.basePort = 3000;

api.get('/', function *(){
  var isValidSession = yield session.check(app.domo);
  var isValidContext = true;
  var hasThumbnail = appStructure.hasThumbnail();

  // TODO: figure out why this is being called twice
  // console.log("=========here why twice?");
  var template = _.template(fs.readFileSync(path.resolve(__dirname + '/../server/domodev/index.html')));

  var manifest = fs.readJsonSync(path.resolve(process.cwd() + '/' + (app.options.manifest || 'manifest.json')));
  var sizeMultiplier = {
    width: 235,
    height: 290
  }

  // sizes consistent with Domo Web
  var width = 235 * manifest.size.width - 10 + 'px';
  var height = 290 * manifest.size.height - 40 + 'px';
  var fullpage = manifest.fullpage;

  var context = yield createContext(manifest.id, manifest.mapping);

  if (!context){
    isValidContext = false;
    context = {id: 0};
  }

  var appData = yield getDomoappsData();

  var userId = app.options.userId || appData.user.id;
  var customerId = 1 || appData.customer;

  var url = `index.html?userId=${userId}&customer=${customerId}&locale=en-US&platform=desktop&context=${context.id}`;

  this.body = template({
    manifest,
    width,
    height,
    url,
    isValidSession,
    isValidContext,
    hasThumbnail,
    fullpage
  });
});

// Proxy requests to the correct domoapps service for the environment they're logged into.
api.all('/data/*', function *(){
  var manifest = fs.readJsonSync(path.resolve(process.cwd() + '/' + (app.options.manifest || 'manifest.json')));
  var appData = yield getDomoappsData();
  var j = request.jar();
  var url = appData.url + this.request.url;
  var method = this.request.method;

  var headers = {
    referer: this.request.headers.referer,
    accept: this.request.headers.accept,
    'Content-Type': this.request.headers['content-type'] || this.request.headers['Content-Type'] || 'application/json'
  };


  var body = JSON.stringify(this.request.body);

  if (url.indexOf("dataversions") !== -1){
    var getRawBody = require('raw-body')
    body = yield getRawBody(this.req, {
      length: this.length,
      limit: '1mb',
      encoding: this.charset
    });
    url = url.replace("/dataversions", "/dataversions/domodev");
    url += "&designId=" + manifest.id;
    var alias = url.match(/data\/(v1|v2|v3)\/(.*)\/dataversions/)[2];
    url += "&datasetId=" + _.find(manifest.mapping, {alias: alias}).dataSetId;
  }

  this.body = yield app.domo.processRequest({
    url: url,
    method: method,
    jar: j,
    body: body,
    headers: headers
  });
});

api.all('/domo/*', function *(){
  var appData = yield getDomoappsData();
  var j = request.jar();
  var url = appData.url + this.request.url;

  var headers = {
    referer: this.request.headers.referer,
    accept: this.request.headers.accept,
    'Content-Type': this.request.headers['content-type'] || this.request.headers['Content-Type'] || 'application/json'
  };

  this.body = yield app.domo.processRequest({url: url, jar: j, headers: headers});

});

app.use(body_parser({
  detectJSON: function (ctx) {
    return false;
  }
}));
app.use(api.middleware());
app.use(mount('/domodev', serve(path.resolve(__dirname + '/../server/domodev'))));
app.use(mount(serve('.')));

module.exports = {
  start: function(domo, options){
    return new Promise(function(resolve, reject){

      portfinder.getPorts(2, function (err, ports) {
        var assetsPort = ports[0];
        var dataPort = ports[1];
        app.domo = domo;
        app.options = options;

        session.check(app.domo)
          .then(function() {
            var external = Boolean(app.options.external);
            var middleware = external ? [] : getMiddleware();

            app.listen(dataPort)

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
              middleware: middleware,
            });
            bs.instance.logger.info('Instance: ' + app.domo.instance);
          })
          .catch(function(e){
            reject('Session expired. Please login again using domo login.');
          })
      });

    });
  }
};

function getCustomer(){
  var regexp = /([\w]+)[\.|-]/;
  return app.domo.instance.match(regexp)[1];
}

function getEnv(){
  var regexp = /([-_\w]+)\.(.*)/;
  return app.domo.instance.match(regexp)[2];
}

function getMiddleware() {
    return [ function(req, res, next) {
      if (proxyaddr(req, '127.0.0.1') !== '::1') {
        Error.stackTraceLimit = 0;
        next(new Error('Access Denied'));
      } else {
        next();
      }
    }];
}

/**
 * Fetch domoapps domain from maestro.
 * Fallback to inferring it by the instance URL.
 */
function getDomoappsData(){
  var uuid = Domo.createUUID();

  var options = {
    url: 'https://' + app.domo.instance + '/api/content/v1/mobile/environment'
  }

  return app.domo.processRequest(options)
    .then(function(res) {
      var data = JSON.parse(res);
      data.url = 'https://'+uuid+'.' + JSON.parse(res).domoappsDomain;
      return data;
    }, function() {
      var data = {url: 'https://'+uuid+'.domoapps.' + getEnv()};
      return data;
    });
}

function createContext(designId, mapping){
  var options = {
    url: 'https://' + app.domo.instance + '/domoapps/apps/v2/contexts',
    method: 'POST',
    json: {designId: designId, mapping: mapping}
  };                     

  return app.domo.processRequest(options)
    .then(function(res) {
      return res[0];
    }).catch(function(err) {
      return;
    })
}
