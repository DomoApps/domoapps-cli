var fs = require('fs-extra');
var Promise = require("bluebird");
var request = Promise.promisify(require("request"));
var Domo = require('../lib/domo');
var domo;
var customer = 'dev.local';

describe("createDesign", function(){

  beforeEach(function(){
    var manifest = fs.readJsonSync('manifest.json');
    domo = new Domo(customer, null, manifest);
  });

  it("should create a new Design", function(done){
    domo
      .createDesign()
      .catch(checkResponse)
      .then(validateDesign)
      .finally(done)
  });

});

function validateDesign(design){
  return domo.getDesign(design.id)
    .then(function(res){
      expect(res.id).toBe(design.id);
      expect(res.name).toEqual(domo.manifest.name);
    })
}

function checkResponse(res){
  expect(res).toBeNull();
}