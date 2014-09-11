describe("createDesign", function(){
  var domo;
  beforeEach(function(){
    domo = this.domo;
  });

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