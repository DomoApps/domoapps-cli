var glob = require("glob");
var fs = require('fs-extra');
var path = require('path');
var Domo = require('ryuu-client');
var home = Domo.getHomeDir();
var log = require('./log');
var keytar = require('keytar');

module.exports = {
  getMostRecentLogin: function(){
    var logins = glob.sync(home + "/login/*.json");
    if (logins.length === 0) return {};

    var recent = logins.reduce(function(prev, next){
      return fs.statSync(prev).mtime > fs.statSync(next).mtime ? prev : next;
    });
    var loginData = fs.readJsonSync(recent);
    return keytar.getPassword('domoapps-cli', loginData.instance).then(function(refreshToken) {
      loginData.refreshToken = refreshToken;
      return loginData;
    });
  },

  getPreviousLogins: function(){
    var logins = (glob.sync(home + "/login/*.json") || [])
      .map(function(file){
        return fs.readJsonSync(file);
      });
    return logins;
  },

  /**
   * persist login to user's domo home
   * TODO: REFACTOR w writeLogin
   */
  persistLogin: function(instance){

    return function(login){
      var loginFile = path.resolve(home + '/login/' + instance + '.json');
      fs.ensureFileSync(loginFile);
      var data = { instance: instance };
      if (login.refreshToken){
        keytar.setPassword('domoapps-cli', instance, login.refreshToken); //runs async to writing, not concerned about waiting
      }
      fs.writeJsonSync(loginFile, data);
      return login;
    };
  },

  verifyLogin: function(login){
    if (!login.refreshToken){
      log.fail('Not authenticated', 'Please login using "domo login"');
    }
  },

  verifyLogout: function(login, instance){
    return keytar.findPassword('domoapps-cli').then(function(refreshToken) {
      if (!login.refreshToken && !refreshToken){
        log.ok('Successful logout from ' + instance);
        return true;
      }
      return false;
    });
  },

  deleteRefreshToken: function(login){
    var loginFile = path.resolve(home + '/login/' + login.instance + '.json');
    return keytar.deletePassword('domoapps-cli', login.instance); //runs async to delete, not concerned about waiting
  },

  getLogin: function(instance){
    return keytar.getPassword('domoapps-cli', instance).then(function(refreshToken) {
      try{
        var loginData = fs.readJsonSync(path.resolve(home + '/login/' + instance + '.json'), {throws: false});
        loginData.refreshToken = refreshToken;
        return loginData;
      }
      catch (ex){
        return {};
      }
    });
  }
}
