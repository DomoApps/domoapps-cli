var fs = require('fs-extra');
jasmine.getEnv().defaultTimeoutInterval = 15000;

beforeEach(function(){
  // execute tests from test app directory
  process.chdir('spec/app');
});

afterEach(function(){
  // change back to root
  process.chdir('../..');
  // initialize clean state of test app
  fs.copySync('spec/fixtures', 'spec/app');
});