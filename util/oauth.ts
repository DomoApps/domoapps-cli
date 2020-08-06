import fs = require('fs-extra');
import path = require('path');
import Domo = require('ryuu-client');
import { Manifest } from './manifest';
import Promise = require('bluebird');
import request = require('request');
import open = require('open');
import * as chalk from 'chalk';
import { Registration, ActiveRegistration, FullRegistration } from "../models/index";
import Configstore = require('configstore');
import { log } from '../util/log';
const home = Domo.getHomeDir();

export class Oauth {
  static isOAuthEnabled(manifestName: string) {
    if (Manifest.hasManifest(manifestName)) {
      const manifest = Manifest.get(manifestName);
      return !!manifest.oAuthEnabled;
    }

    return false;
  }

  static hasAppProxyId(manifestName: string) {
    const manifest = Manifest.get(manifestName);
    return !!Object.keys(manifest).includes('cardId')
      || !!(Object.keys(manifest).includes('proxyId'))
      || !!(Object.keys(manifest).includes('appContextId'));
  }

  /**
   * Requires there to be an appProxyId
   */
  static getAppProxyId(manifestName: string) {
    const manifest = Manifest.get(manifestName);
    if (!!Object.keys(manifest).includes('cardId')) {
      return manifest.cardId;
    }
    if (!!Object.keys(manifest).includes('appContextId')) {
      return manifest.appContextId;
    }
    return manifest.proxyId;
  }

  static getScopes(manifestName: string) {
    const manifest = Manifest.get(manifestName);
    if (!!Object.keys(manifest).includes('scopes')) {
      return [
        'domoapps',
        ...manifest.scopes,
      ];
    }

    return ['domoapps'];
  }

  static hasTokens(registration: Registration) {
    /*
    const scopes = JSON.stringify(this.getScopes(registration.manifestName));
    const filePath = path.resolve(home + '/' + registration.instance + '.json');
    if (fs.existsSync(filePath)) {
      const instanceData = fs.readJsonSync(filePath);
      return instanceData.proxyId === registration.proxyId && instanceData.scopes === scopes;
    }
    */
    
    return false;
  }

  static register(registration: Registration): Promise<FullRegistration> {
    return new Promise((resolve, reject) => {
      request.post(
        {
          url: `https://${registration.instance}/api/oauth2/device_authorization`,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          form: {
            client_id: `domo:ryuu:${registration.proxyId}`,
            scope: this.getScopes(registration.manifestName).join(' '),
          }
        },
        (error, httpResponse, body) => {
          if (httpResponse.statusCode !== 200) reject(body.trim());
          log.ok(JSON.parse(body));
          resolve(JSON.parse(body));
        }
      );
    });
  }
//fix return type
  static verifyRegistration(registration: FullRegistration) {
    return new Promise((resolve, reject) => {
      open(`${registration.verification_uri}?user_code=${registration.user_code}`);

      // scopes are space separated
      const scopes = this.getScopes(registration.manifestName).join(' ');

      const checkRegistration = setInterval(() => {
        new Promise((resolve, reject) => {
          const url1 = `https://${registration.instance}/domoapps/admin/device-registration/${registration.proxyId}?scope=${scopes}&device_code=${registration.device_code}`
          log.ok(url1);
          request.get(
            {
              url: url1
            },
            (error, httpResponse, body) => {
              if (httpResponse.statusCode !== 200) reject(body.trim());
              resolve(JSON.parse(body));
            }
          );
        })
        .then(result => {
          clearInterval(checkRegistration);
          resolve(result);
        })
        .catch(error => {
          console.log(chalk.grey('Waiting for browser oauth registration'));
        })
      }, 1000);
  
      setTimeout(() => {
        clearInterval(checkRegistration);
        reject('Timed out for oauth registration verification.');
      }, 20000);
    });
  }

  static getLoginData(loginFile: string) {
    return (fs.existsSync(loginFile))
      ? (fs.readJsonSync(loginFile))
      : ({});
  }

  /**
   * persist login to user's domo home
   * TODO: REFACTOR w writeLogin
   */
  static persistTokens(registration: ActiveRegistration) {
    const configstore = new Configstore('/ryuu/' + registration.instance)
    const scopes = this.getScopes(registration.manifestName);
    configstore.set(`${registration.proxyId}-${scopes.join('-')}-accessToken`, registration.accessToken);
    configstore.set(`${registration.proxyId}-${scopes.join('-')}-refreshToken`, registration.refreshToken);
    return { accessToken: registration.accessToken, refreshToken: registration.refreshToken };
  }
/* unused as of 8/5/20
  static deleteTokens(registration: Registration) {
    const configstore = new Configstore(home + '/' + registration.instance + '.json');
    const scopes = this.getScopes(registration.manifestName);
    const instanceData = fs.readJsonSync(path.resolve(home + '/' + registration.instance + '.json'), {throws: false});
    return Promise.all([
      configstore.delete(`${instanceData.proxyId}-${scopes.join('-')}-accessToken`),
      configstore.delete(`${instanceData.proxyId}-${scopes.join('-')}-refreshToken`),
    ]);
  }
*/
/* unused as of 2/13/2020
  static getTokens(registration: Registration) {
    const scopes = this.getScopes(registration.manifestName);
    const instanceData = fs.readJsonSync(path.resolve(home + '/login/' + registration.instance + '.json'), {throws: false});
    return Promise.all<string, string>([
      keytar.getPassword(`domoapps-oauth-access-${scopes.join('-')}`, `${registration.instance}-${instanceData.proxyId}`),
      keytar.getPassword(`domoapps-oauth-refresh-${scopes.join('-')}`, `${registration.instance}-${instanceData.proxyId}`),
    ]).then(([accessToken, refreshToken]: [string, string]) => { accessToken, refreshToken });
  }
*/
}
