describe("domo login", function(){
  var domo = require('../lib/domo');
  var home = domo.getDomoHome();
  var customer = 'dev.local';
  var email = 'support@domo.com'
  var fs = require('fs-extra');

  it("stores a login session", function(done){
    domo.login(customer, email, 'd@m@');

    setTimeout(function(){
      var login = fs.readJsonSync(home + '/login/' + customer + '.json');
      expect(login.user).toBe(email);
      expect(login.customer).toBe(customer);
      expect(login.sid).not.toBeNull();
      expect(login.sid).not.toBe("");
      done();
    }, 2000);
  });

});