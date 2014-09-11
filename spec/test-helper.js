var fs = require('fs-extra');
var Promise = require("bluebird");
var Domo = require('../lib/domo');

// can change customer to run against different instances
var customer = process.env.customer;

// expose common functionality and an instance of the domo lib preconfigured
module.exports = {
  checkResponse: function(res){
    expect(res).toBeNull();
  },
  fs: fs,
  Promise: Promise,
  request: Promise.promisify(require("request")),
  Domo: Domo,
  domo: new Domo(customer, null, fs.readJsonSync('spec/fixtures/manifest.json')),
  customer: customer
}