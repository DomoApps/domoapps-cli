var glob = require("glob");
var fs = require('fs-extra');
var path = require('path');
var Domo = require('ryuu-client');
var home = Domo.getHomeDir();

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
   */
  persistLogin: function(instance, user){
    return function(login){
      var loginFile = path.resolve(home + '/login/' + instance + '.json');
      fs.ensureFileSync(loginFile);
      var data = { user: user, instance: instance };
      if (login.sid){
        data.sid = login.sid
      }
      if (login.devtoken){
        data.devtoken = login.devtoken
      }
      fs.writeJsonSync(loginFile, data);
      return login;
    };
  },

  getLogin: function(instance){
    return fs.readJsonSync(path.resolve(home + '/login/' + instance + '.json'), {throws: false});
  }
}
