var path = require('path');
var Promise = require('bluebird');
var request = Promise.promisify(require('request'));
var fs = require('fs-extra');
var glob = require('glob');
var chalk = require('chalk');
module.exports = Domo;
process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

// var home = path.resolve(getDomoHome());

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

/**
 * reject non 200 responses
 */
function verifyResponse(response){
  var res = response[0];
  var body = res.body;
  return new Promise(function(resolve, reject){
    if (response[0].statusCode === 500){
      reject({
        statusCode: res.statusCode,
        message: body.message
      });
    }
    resolve(res.body);
  });
}