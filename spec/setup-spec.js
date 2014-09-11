var path = require('path');
var fs = require('fs-extra');

beforeEach(function(){
  // execute tests from test app directory
  process.chdir('spec/app');
});

afterEach(function(){
  // change back to root
  process.chdir('../..');
  // initialize clean state of app
  fs.copySync('spec/fixtures', 'spec/app');
});