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
  persistLogin: function(instance, email){
    return function(login){
      var loginFile = path.resolve(home + '/login/' + instance + '.json');
      fs.ensureFileSync(loginFile);
      fs.writeJsonSync(loginFile, { sid: login.sid, user: email, instance: instance });
      return login;
    };
  },

  getLogin: function(instance){
    return fs.readJsonSync(path.resolve(home + '/login/' + instance + '.json'), {throws: false});
  }
}
