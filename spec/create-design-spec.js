describe("createDesign", function(){

  it("should create a new Design", function(done){
    domo.createDesign(manifest)
        .then(validateDesign)
        .then(cleanup)
        .catch(checkResponse)
        .finally(done)
  });

  function validateDesign(design){
    return domo.getDesign(design.id)
      .then(function(res){
        expect(res.id).toBe(design.id);
        expect(res.name).toEqual(manifest.name);
        return design;
      })
  }

  function cleanup(design){
    return domo.deleteDesign(design.id);
  }

});