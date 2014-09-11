describe("login", function(){
  var home = Domo.getHomeDir();

  it("stores a login session", function(done){
    domo
      .login(process.env.email, process.env.password)
      .then(function(login){
        expect(login.user).toBeDefined();
        expect(login.sid).toBeDefined();
      })
      .catch(checkResponse)
      .finally(done)
  });

});