var Login = require('../util/login');

module.exports = function(program){
  program
    .command('logout')
    .description('logout of Domo')
    .action(function(){

      var mostRecent = Login.getMostRecentLogin();
      var instance = mostRecent.instance;
      Login.verifyLogout(mostRecent, instance);

      delete mostRecent.sid;
      delete mostRecent.devtoken;

      Login.writeLogin(mostRecent);
      Login.verifyLogout(mostRecent, instance);
    });
}
