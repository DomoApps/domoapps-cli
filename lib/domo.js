var path = require('path');
var Promise = require('bluebird');
var request = Promise.promisify(require('request'));
var fs = require('fs-extra');
var glob = require('glob');
var FormData = require('form-data');

module.exports = Domo;
process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

function Domo(customer, sid, manifest){
  this.customer = customer;
  this.server = 'https://' + customer + '.domo.com';
  this.sid = sid;
  this.manifest = manifest;
}

Domo.prototype.createDesign = function(){
  var options = {
    url: this.server + '/domoapps/designs?path=manifest.json',
    method: 'POST',
    json: this.manifest,
    headers: { 'X-Domo-Authentication': this.sid }
  };

  return request(options)
      .then(verifyResponse)
};

Domo.prototype.getDesign = function(id){
  var options = {
    url: this.server + '/domoapps/designs/' + id,
    method: 'GET',
    json: true,
    headers: { 'X-Domo-Authentication': this.sid }
  };

  return request(options)
      .then(verifyResponse)
}

Domo.prototype.deleteDesign = function(id){
  var options = {
    url: this.server + '/domoapps/designs/' + id,
    method: 'DELETE',
    json: true,
    headers: { 'X-Domo-Authentication': this.sid }
  };

  return request(options)
      .then(verifyResponse)
}

Domo.prototype.uploadAsset = function(designId, version, file){
  var form = new FormData();
  form.submit = Promise.promisify(form.submit);

  form.append('file', fs.createReadStream(file));

  return form.submit({
    host: this.customer + '.domo.com',
    path: '/domoapps/designs/'+designId+'/versions/'+version+'/assets?path='+file,
    protocol: 'https:',
    headers: { 'X-Domo-Authentication': this.sid }
  })
  .then(function(res){
    var promise = new Promise(function(resolve, reject){
      var body = '';
      res.on('data', function(chunk) {
        body += chunk;
      });
      res.on('end', function() {
        resolve(JSON.parse(body));
      });
    });
    res.resume();
    return promise;
  })

}

// TODO: add unit test for this
Domo.prototype.uploadAllAssets = function(){
  var _this = this;

  var files = 
      glob.sync("**/*.*")
      .map(function(file){
        return _this.uploadAsset(_this.manifest.id, _this.manifest.version, file);
      });

  return Promise.all(files);
}

Domo.prototype.getAsset = function(designId, version, file){
  var options = {
    url: this.server + '/domoapps/designs/' + designId + '/versions/' + version + '/assets/' + file,
    method: 'GET',
    json: true,
    headers: { 'X-Domo-Authentication': this.sid }
  };

  return request(options)
      .then(verifyResponse)
}

// not currently using, may be able to remove
Domo.prototype.getCustomersUsingDesign = function(id){
  var options = {
    url: this.server + '/domoapps/designs/' + id + '/customers',
    method: 'GET',
    json: true,
    headers: { 'X-Domo-Authentication': this.sid }
  };

  return request(options)
      .then(verifyResponse)
}

/**
 * authenticate to a domo instance
 */
Domo.prototype.login = function(email, password){
  var _this = this;
  var options = {
    url: this.server + '/api/domoweb/auth/login',
    method: 'POST',
    json: {
      username: email, 
      password: password
    }
  };

  return request(options)
      .then(verifyResponse)
      .then(function(login){
        _this.sid = login.sid;
        return login;
      });
}

Domo.prototype.createApp = function(designId){
  var options = {
    url: this.server + '/domoapps/apps',
    method: 'POST',
    json: {
      mapping: [],
      designId: designId
    },
    headers: { 'X-Domo-Authentication': this.sid }
  };

  return request(options)
    .then(verifyResponse);
}

Domo.prototype.getKpi = function(id){
  var options = {
    url: 'http://apiContent.' + this.customer + '.domo.com:9400/api/content/v1/cards?urns=' + id + '&parts=domoapp,metadata',
    json: true,
    headers: { 'X-Domo-Authentication': this.sid }
  };

  return request(options)
    .then(verifyResponse)
    .then(function(res){
      return res[0];
    });
}

Domo.prototype.updateKpi = function(kpi){
  var options = {
    url: 'http://apiContent.' + this.customer + '.domo.com:9400/api/content/v1/cards/' + kpi.id,
    method: 'POST',
    json: kpi,
    headers: { 'X-Domo-Authentication': this.sid }
  };

  return request(options)
    .then(verifyResponse);
}

/**
 * get user's home domo directory
 */
Domo.getHomeDir = function(){
  return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'] + '/.domo';
}

/**
 * reject non 200 responses
 */
function verifyResponse(response){
  var res = response[0];
  var body = res.body;

  return new Promise(function(resolve, reject){
    if (res.statusCode !== 200){
      var message = body ? (body.message || body.reason) : res.statusCode + " error";
      reject({
        statusCode: res.statusCode,
        message: message,
        method: res.req.method,
        path: res.req.path,
      });
    }
    else{
      resolve(res.body);
    }
  });
}