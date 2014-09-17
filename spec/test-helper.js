var fs = require('fs-extra');
var Promise = require("bluebird");
var Domo = require('../lib/domo');
var home = Domo.getHomeDir();
var glob = require('glob');

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
  domo: new Domo(customer, getMostRecentLogin().sid),
  manifest: fs.readJsonSync('spec/fixtures/manifest.json'),
  customer: customer
}

function getMostRecentLogin(){
  var logins = glob.sync(home + "/login/*.json");
  if (logins.length == 0) return;

  var mostRecent = logins.reduce(function(prev, next){
    return fs.statSync(prev).mtime > fs.statSync(next).mtime ? prev : next;
  });
  return fs.readJsonSync(mostRecent);
}