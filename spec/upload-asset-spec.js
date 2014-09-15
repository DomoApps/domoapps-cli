describe("uploadAsset", function(){
  var random = Math.random();
  var designId;

  it("should upload a design asset to S3", function(done){
    domo.createDesign()
      .then(function(design){
        designId = design.id;

        var index = fs.readFileSync('index.html').toString();
        index += random;
        fs.writeFileSync('index.html', index);

        domo.uploadAsset(design.id, '0.0.1', 'index.html') // should return designId, file, version uploaded
            .then(validateAsset)
            .then(cleanup)
            .catch(checkResponse)
            .finally(done)

        return design;
      })
  });

  function validateAsset(asset){
    return domo.getAsset(asset.designId, asset.version, asset.path)
      .then(function(res){
        expect(res.indexOf(random)).not.toBe(-1);
        return res;
      });
  }

  function cleanup(){
    return domo.deleteDesign(designId);
  }

});