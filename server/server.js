var fs = require('fs-extra');
var path = require('path');
var _ = require('lodash');
var koa = require('koa');
var Router = require('koa-router');
var bs = require('browser-sync').create();
var request = require('request');
var Domo = require('domoapps-client');
var inquirer = require("inquirer");
var app = koa();
var api = new Router();


api.get('/', function *(){
  var template = _.template(fs.readFileSync(path.resolve(__dirname + '/wrapper.html')));
  var manifest = fs.readJsonSync(path.resolve(process.cwd() + '/manifest.json'));
  var sizeMultiplier = {
    width: 235,
    height: 290 
  }
  
  // sizes consistent with Domo Web
  var width = 235 * manifest.size.width - 10;
  var height = 290 * manifest.size.height - 40;
  
  var url = "/index.html?userId=27&customer=dev&locale=en-US&platform=desktop";
  // var mapping = shortenMapping(manifest.mapping);
  var mapping = encodeURIComponent(JSON.stringify(manifest.mapping));
  url += "&mappingOverride=" + mapping;
  
  this.body = template({ manifest: manifest, width: width, height: height, url: url });
});

api.get('/data/v1/:query', function *(){
  var uuid = Domo.createUUID();
  var manifest = fs.readJsonSync(path.resolve(process.cwd() + '/manifest.json'));
  var j = request.jar();
  // Proxy requests to the correct domoapps service for the environment they're logged into.
  var regexp = /([-_\w]+)\.(.*)/;
  var match = app.domo.instance.match(regexp); 
  var customer = match[1];
  var env = match[2];
  var baseUrl = 'https://'+uuid+'.domoapps.' + env;
  var url = baseUrl + this.request.url;
  var cookie = request.cookie('DA-SID-'+customer+'="'+app.domo.sid+'"');
  
  j.setCookie(cookie, baseUrl);
  this.body = request({url: url, jar: j, headers: { referer: this.request.headers.referer}});
});

app.use(api.middleware());
app.use(require('koa-static')('.'));

module.exports = {
  start: function(domo){
    app.domo = domo;
    app.listen(3001);
    
    bs.init({
      proxy: "localhost:3001",
      port: 3000,
      notify: false,
      ui: false,
      logLevel: 'info',
      // TODO: add user's ignored files here too?
      files: ['**/*', '!node_modules/**/*']
    });
  }
};

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
