var path = require('path');
var fs = require('fs-extra');

beforeEach(function(){
  // initialize clean state of app
  fs.copySync('spec/fixtures', 'spec/app');
});