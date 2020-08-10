import glob = require('glob');
import fs = require('fs-extra');
import path = require('path');
import { login, constant } from '../models';
import Domo = require('ryuu-client');
import { log } from './log';
import Configstore = require('configStore');
const home = Domo.getHomeDir();


export class Login {
  static getMostRecentLogin(mayNotBeAuthenticated?: boolean): Promise<Domo> {
    var logins = glob.sync(home + '/ryuu/*.json');
    //If there are no logins, return a rejection as the user is unauthenticated.
    if (logins.length === 0) {
      //@ts-ignore
      return Promise.resolve({});
    }
    var recent = logins.reduce(function(prev, next) {
      return fs.statSync(prev).mtime > fs.statSync(next).mtime ? prev : next;
    });
    var loginData: login = fs.readJsonSync(recent);
    const configstore = new Configstore('/ryuu/' + loginData.instance);
    const refreshToken = configstore.get('refreshToken');
    loginData.refreshToken = refreshToken;
    if(!mayNotBeAuthenticated) {
      verifyLoginLocal(loginData);
    }
    return Promise.resolve(new Domo(loginData.instance, loginData.refreshToken, constant.CLIENT_ID, loginData.devToken));
  }

  static getPreviousLogins(): Array<login> {
    var logins = (glob.sync(home + '/ryuu/*.json') || [])
      .map(function(file: string) {
        return fs.readJsonSync(file);
      });
    return logins;
  }

  /**
   * persist login to user's domo home
   */
  static persistLogin(instance: string, refreshToken: string, devToken?: boolean|undefined): login {
    const configstore = new Configstore('/ryuu/' + instance)
    configstore.set('instance', instance);
    configstore.set('refreshToken', refreshToken);
    configstore.set('devToken', !!devToken);
    return { instance, refreshToken, devToken };
  }

  static removeLogin(instance: string) {
    const loginFile = path.resolve(home + '/ryuu/' + instance + '.json');
    fs.ensureFileSync(loginFile);
    return fs.unlink(loginFile);
  }

  static removeAllLogins() {
    fs.emptyDirSync(home + '/ryuu/');
  }

  static verifyLogin(login: login): void {
    verifyLoginLocal(login);
  }

  static verifyLogout(login: Domo, instance: string) {
    if (login.getRefreshToken()) {
      Login.deleteRefreshToken(login);
      const configstore = new Configstore('/ryuu/' + instance)
      const refreshToken = configstore.get('refreshToken');
      if (!refreshToken){
        log.ok('Successful logout from ' + instance);
        return Promise.resolve(true);
      }
      return Promise.resolve(false);
    }
  }

  static deleteRefreshToken(login: Domo) {
    const configstore = new Configstore('/ryuu/' + login.getInstance)
    configstore.delete('refreshToken');
  }

  static getLogin(instance: string) {
    const configstore = new Configstore('/ryuu/' + instance)
    try {
      return Promise.resolve(new Domo(instance, configstore.get('refreshToken'), constant.CLIENT_ID, configstore.get('devToken')));
    }
    catch (ex) {
      return Promise.resolve(new Domo(instance, configstore.get('refreshToken'), constant.CLIENT_ID));
    }
  }  
};

function verifyLoginLocal(login: login): void {
  if (!login.refreshToken)
    log.fail('Not authenticated', 'Please login using "domo login"');
};