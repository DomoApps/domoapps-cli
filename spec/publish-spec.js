describe("domo publish", function(){
  var domo = require('../lib/domo');
  var home = domo.getDomoHome();
  var customer = 'dev.local';
  var fs = require('fs-extra');
  var Promise = require("bluebird");
  // var request = require('superagent');
  var request = Promise.promisify(require("request"));
  var login = require(home + '/login/' + customer + '.json');

  beforeEach(function(){
    process.chdir('spec/app');
  });

  afterEach(function(){
    process.chdir('../..');
  });

  describe("without specifying a file", function(){
    // TODO: 
    // TEST adds an id to the manifest file
    // After: delete design from DB

    it("publishes all assets to S3", function(done){
      // make a change to a file
      var random = Math.random();
      var index = fs.readFileSync('index.html').toString();
      index += random;
      fs.writeFileSync('index.html', index);

      // publish
      domo.publish(customer, login.sid);

      setTimeout(function(){
        // verify that published file has our changes
        var manifest = fs.readJsonSync('manifest.json');

        var options = {
          url: 'https://dev.local.domo.com/domoapps/designs/' + manifest.id + '/versions/0.0.1/assets/index.html',
          headers: {
            'X-Domo-Authentication': login.sid
          }
        };

        request(options).then(function(res){
          expect(res[0].statusCode).toBe(200);
          expect(res[1].indexOf(random)).not.toBe(-1);
          done();
        });

      }, 2000);

    });

    after(function(){
      console.log("after");
    });
    
  });

});