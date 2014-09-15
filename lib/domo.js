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
    json: this.manifest
    // todo: set x sid header
  };

  return request(options)
      .then(verifyResponse)
};

Domo.prototype.getDesign = function(id){
  var options = {
    url: this.server + '/domoapps/designs/' + id,
    method: 'GET',
    json: true
    // todo: set x sid header
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
    protocol: 'https:'
  })
  .then(function(res){
    var promise = new Promise(function(resolve, reject){
      var body = '';
      res.on('data', function(chunk) {
        body += chunk;
      });
      res.on('end', function() {
        resolve(body);
      });
    });
    res.resume();
    return promise;
  })

}
Domo.prototype.deleteDesign = function(id){
  var options = {
    url: this.server + '/domoapps/designs/' + id,
    method: 'DELETE',
    json: true
    // todo: set x sid header
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