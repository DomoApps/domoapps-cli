var path = require('path');
var fs = require('fs-extra');
var Domo = require('../lib/domo');

var customer = 'dev.local';

beforeEach(function(){
  // execute tests from test app directory
  process.chdir('spec/app');
  this.manifest = fs.readJsonSync('manifest.json');
  this.domo = new Domo(customer, null, this.manifest);
});

afterEach(function(){
  // change back to root
  process.chdir('../..');
  // initialize clean state of app
  fs.copySync('spec/fixtures', 'spec/app');
});