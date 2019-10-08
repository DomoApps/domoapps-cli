var glob = require("glob");
var fs = require('fs-extra');
var path = require('path');
var Domo = require('ryuu-client');
var home = Domo.getHomeDir();
var log = require('./log');
var keytar = require('keytar');
var $q = require('q');
var constants = require('../util/constants');

function verifyLoginLocal(login){
  if (!login.refreshToken){
    log.fail('Not authenticated', 'Please login using "domo login"');
  }
}


module.exports = {
  getMostRecentLogin: function(){
    var logins = glob.sync(home + "/login/*.json");

    if (logins.length === 0) {
      var d = $q.defer();
      d.resolve({});
      return d.promise;
    }

    var recent = logins.reduce(function(prev, next){
      return fs.statSync(prev).mtime > fs.statSync(next).mtime ? prev : next;
    });
    var loginData = fs.readJsonSync(recent);
    return keytar.getPassword('domoapps-cli', loginData.instance).then(function(refreshToken) {
      loginData.refreshToken = refreshToken;
      verifyLoginLocal(loginData);
      return loginData;
    }).then(function(loginData) {
      return new Domo(loginData.instance, loginData.refreshToken, constants.CLIENT_ID, loginData.devToken);
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
   */
  persistLogin: function(instance, refreshToken, devToken){
    var loginFile = path.resolve(home + '/login/' + instance + '.json');
    const loginData = fs.readJsonSync(loginFile, {throws: false});
    fs.ensureFileSync(loginFile);
    if (refreshToken){
      keytar.setPassword('domoapps-cli', instance, refreshToken); //runs async to writing, not concerned about waiting
    }

    const data = {
      instance: instance,
      devToken: !!devToken
    };
    fs.writeJsonSync(loginFile, data);
    return { instance, refreshToken, devToken };
  },

  verifyLogin: verifyLoginLocal,

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
        verifyLoginLocal(loginData);
        return new Domo(loginData.instance, loginData.refreshToken, constants.CLIENT_ID, loginData.devToken);
      }
      catch (ex){
        return {};
      }
    });
  }
}
