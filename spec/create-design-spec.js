describe("createDesign", function(){

  it("should create a new Design", function(done){
    domo.createDesign()
        .catch(checkResponse)
        .then(validateDesign.bind(this))
        .finally(done)
  });

  function validateDesign(design){
    return domo.getDesign(design.id)
      .then(function(res){
        expect(res.id).toBe(design.id);
        expect(res.name).toEqual(domo.manifest.name);
      })
  }

});