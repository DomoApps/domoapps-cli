describe("createApp", function(){

  it("should create a new domoapp", function(done){
    domo.createDesign(manifest)
        .then(function(designResult){
          var design = designResult[0];
          return [design, domo.createApp(design.id)
                     .catch(checkResponse)]
        })
        .spread(function(design, app){
          expect(app.id).toBeDefined();
          return [design, app]
        })
        .spread(cleanup)
        .catch(checkResponse)
        .finally(done)
  });

  function cleanup(design, app){
    domo.deleteDesign(design.id)
    // TODO: delete app also
  }

});