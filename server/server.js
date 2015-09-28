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
var app = koa();
var api = new Router();
var portfinder = require('portfinder');
portfinder.basePort = 3000;

api.get('/', function *(){
  
  var isValidSession = yield checkSession();
  
  // TODO: figure out why this is being called twice
  // console.log("=========here why twice?");
  var template = _.template(fs.readFileSync(path.resolve(__dirname + '/../server/wrapper.html')));
  var manifest = fs.readJsonSync(path.resolve(process.cwd() + '/manifest.json'));
  var sizeMultiplier = {
    width: 235,
    height: 290 
  }
  
  // sizes consistent with Domo Web
  var width = 235 * manifest.size.width - 10;
  var height = 290 * manifest.size.height - 40;
  
  var context = yield createContext(manifest.id, manifest.mapping);
  // TODO: pass actual userId in
  var url = "/index.html?userId=27&customer=dev&locale=en-US&platform=desktop&context=" + context.id;
  this.body = template({ manifest: manifest, width: width, height: height, url: url, isValidSession: isValidSession });
});

// Proxy requests to the correct domoapps service for the environment they're logged into.
api.get('/data/v1/:query', function *(){
  var manifest = fs.readJsonSync(path.resolve(process.cwd() + '/manifest.json'));
  var baseUrl = yield getDomoappsDomain();
  var j = request.jar();
  var url = baseUrl + this.request.url;
  var auth = 'DA-SID-'+getCustomer()+'="'+app.domo.sid+'"';
  var cookie = request.cookie(auth);
  j.setCookie(cookie, baseUrl);
  this.body = request({url: url, jar: j, headers: { referer: this.request.headers.referer}});
});

app.use(api.middleware());
app.use(require('koa-static')('.'));

module.exports = {
  start: function(domo){
    return new Promise(function(resolve, reject){
      
      portfinder.getPorts(2, function (err, ports) {
        var assetsPort = ports[0];
        var dataPort = ports[1];
        app.domo = domo;
        
        checkSession()
          .then(function(){
            app.listen(dataPort)
            
            bs.init({
              proxy: "localhost:" + dataPort,
              port: assetsPort,
              notify: false,
              ui: false,
              logLevel: 'info',
              // TODO: add user's ignored files here too?
              files: ['**/*', '!node_modules/**/*']
            });
            
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

/**
 * Fetch domoapps domain from maestro.
 * Fallback to inferring it by the instance URL.
 */
function getDomoappsDomain(){
  var uuid = Domo.createUUID();
  var j = request.jar();
  var auth = 'SID="'+app.domo.sid+'"';
  var cookie = request.cookie(auth);
  j.setCookie(cookie, 'https://' + app.domo.instance);
  
  return new Promise(function(resolve, reject){
    request({url: 'https://' + app.domo.instance + '/api/content/v1/mobile/environment', jar: j}, function(err, res){
      if (res.statusCode === 200){
        var url = 'https://'+uuid+'.' + JSON.parse(res.body).domoappsDomain; 
        resolve(url);
      }
      else {
        resolve('https://'+uuid+'.domoapps.' + getEnv());
      }
    });
  });
}

function createContext(designId, mapping){
  return new Promise(function(resolve, reject){
    var options = {
      url: 'https://' + app.domo.instance + '/domoapps/apps/v2/contexts',
      method: 'POST',
      json: {designId: designId, mapping: mapping},
      headers: { 'X-Domo-Authentication': app.domo.sid }
    };
    
    request(options, function(err, res){
      resolve(res.body[0]);
    });
    
  });
}

function checkSession(){
  return new Promise(function(resolve, reject){
    var options = {
      url: 'https://' + app.domo.instance + '/auth/validate',
      method: 'GET',
      headers: { 'X-Domo-Authentication': app.domo.sid }
    };
    
    request(options, function(err, res){
      try{
        var isValid = JSON.parse(res.body).isValid;
        if(isValid){
          resolve(true);
        }
        else {
          reject(false);
        }
      }
      catch(e){
        // couldn't parse as JSON which means the service doesn't exist yet.
        // TODO: remove this once the /domoweb/auth/validate service has shipped to prod
        resolve(true);
      }
    })
    
    
  });
}