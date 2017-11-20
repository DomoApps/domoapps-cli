var glob = require("glob");
var fs = require('fs-extra');
var path = require('path');
var Domo = require('ryuu-client');
var home = Domo.getHomeDir();
var log = require('./log');

module.exports = {
  getMostRecentLogin: function(){
    var logins = glob.sync(home + "/login/*.json");
    if (logins.length === 0) return {};

    var recent = logins.reduce(function(prev, next){
      return fs.statSync(prev).mtime > fs.statSync(next).mtime ? prev : next;
    });
    return fs.readJsonSync(recent);
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
        data.refreshToken = login.refreshToken
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
    if (!login.refreshToken){
      log.ok('Successful logout from ' + instance);
      return true;
    }
    return false;
  },

  writeLogin: function(login){
    var loginFile = path.resolve(home + '/login/' + login.instance + '.json');
    fs.ensureFileSync(loginFile);
    fs.writeJsonSync(loginFile, login);
  },

  getLogin: function(instance){
    try{
      return fs.readJsonSync(path.resolve(home + '/login/' + instance + '.json'), {throws: false});
    }
    catch (ex){
      return {};
    }
  }
}
