import glob = require("glob");
import fs = require('fs-extra');
import path = require('path');
import keytar = require('keytar');
import { login, constant } from '../models';
import Domo = require('ryuu-client');
import { log } from './log';
const home = Domo.getHomeDir();


export class Login {
  static getMostRecentLogin(mayNotBeAuthenticated?: boolean): Promise<Domo> {
    var logins = glob.sync(home + "/login/*.json");
    //If there are no logins, return a rejection as the user is unauthenticated.
    if (logins.length === 0) {
      return Promise.reject();
    }
    var recent = logins.reduce(function(prev, next) {
      return fs.statSync(prev).mtime > fs.statSync(next).mtime ? prev : next;
    });
    var loginData: login = fs.readJsonSync(recent);
    return keytar.getPassword('domoapps-cli', loginData.instance).then(function(refreshToken: string) {
      loginData.refreshToken = refreshToken;
      if(!mayNotBeAuthenticated) {
        verifyLoginLocal(loginData);
      }
      return loginData;
    }).then(function(loginData) {
      return new Domo(loginData.instance, loginData.refreshToken, constant.CLIENT_ID, loginData.devToken);
    });
  }

  static getPreviousLogins(): Array<login> {
    var logins = (glob.sync(home + "/login/*.json") || [])
      .map(function(file: string) {
        return fs.readJsonSync(file);
      });
    return logins;
  }

  /**
   * persist login to user's domo home
   */
  static persistLogin(instance: string, refreshToken: string, devToken?: boolean|undefined): login {
    const loginFile = path.resolve(home + '/login/' + instance + '.json');
    fs.ensureFileSync(loginFile);
    if (refreshToken) {
      keytar.setPassword('domoapps-cli', instance, refreshToken); //runs async to writing, not concerned about waiting
    }
    const data = {
      instance: instance,
      devToken: !!devToken
    };
    fs.writeJsonSync(loginFile, data);
    return { instance, refreshToken, devToken };
  }

  static verifyLogin(login: login): void {
    verifyLoginLocal(login);
  }

  static verifyLogout(login: Domo, instance: string): Promise<boolean> {
    return keytar.findPassword('domoapps-cli').then(function(refreshToken) {
      if (!login.getRefreshToken() && !refreshToken){
        log.ok('Successful logout from ' + instance);
        return true;
      }
      return false;
    });
  }

  static deleteRefreshToken(login: Domo): Promise<boolean> {
    return keytar.deletePassword('domoapps-cli', login.getInstance()); //runs async to delete, not concerned about waiting
  }

  //fix this
  static getLogin(instance: string) {
    return keytar.getPassword('domoapps-cli', instance).then(function(refreshToken) {
      try {
        var loginFile = path.resolve(home + '/login/' + instance + '.json');
        fs.writeJsonSync(loginFile, { instance: instance });
        let loginData: login = fs.readJsonSync(path.resolve(home + '/login/' + instance + '.json'), {throws: false});
        loginData.refreshToken = refreshToken;
        return new Domo(loginData.instance, loginData.refreshToken, constant.CLIENT_ID, loginData.devToken);
      }
      catch (ex) {
        return new Domo(instance, refreshToken, constant.CLIENT_ID);
      }
    });
  }  
};

function verifyLoginLocal(login: login): void {
  if (!login.refreshToken)
    log.fail('Not authenticated', 'Please login using "domo login"');
};