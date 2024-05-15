import fs = require('fs-extra');
import path = require('path');
import Domo = require('ryuu-client');
import {Manifest} from './manifest';
import axios, {AxiosRequestConfig, AxiosResponse, AxiosError} from 'axios';
import qs = require('qs');
import open = require('open');
import * as chalk from 'chalk';
import {
  Registration,
  ActiveRegistration,
  FullRegistration,
} from '../models/index';
import Configstore = require('configstore');
import jwt_decode from 'jwt-decode';
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
    return (
      !!Object.keys(manifest).includes('cardId') ||
      !!Object.keys(manifest).includes('proxyId') ||
      !!Object.keys(manifest).includes('appContextId')
    );
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
      return ['domoapps', ...manifest.scopes];
    }

    return ['domoapps'];
  }

  static hasTokens(registration: Registration) {
    const scopes = this.getScopes(registration.manifestName);
    const configstore = new Configstore('/ryuu/' + registration.instance);
    const token = configstore.get(
      `${registration.proxyId}-${scopes.join('-')}-accessToken`,
    );
    if (token) {
      const decoded = jwt_decode(token);
      console.log(decoded);
      return true;
    }
    return false;
  }

  static register(registration: Registration) {
    const options: AxiosRequestConfig = {
      url: `https://${registration.instance}/api/oauth2/device_authorization`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data: qs.stringify({
        client_id: `domo:ryuu:${registration.proxyId}`,
        scope: this.getScopes(registration.manifestName).join(' '),
      }),
    };

    return axios(options)
      .then(response => {
        return Promise.resolve(response);
      })
      .catch(error => {
        return Promise.reject(error);
      });
  }

  static verifyRegistration(
    registration: FullRegistration,
  ): Promise<AxiosResponse> {
    return new Promise((resolve, reject) => {
      open(
        `${registration.verification_uri}?user_code=${registration.user_code}`,
      );
      // scopes are space separated
      const scopes = this.getScopes(registration.manifestName).join(' ');
      const options: AxiosRequestConfig = {
        url: `https://${registration.instance}/domoapps/admin/device-registration/${registration.proxyId}?scope=${scopes}&device_code=${registration.device_code}`,
        method: 'GET',
      };

      const checkRegistration = setInterval(() => {
        new Promise((resolve, reject) => {
          axios(options)
            .then(response => {
              resolve(response);
            })
            .catch(error => {
              reject(error);
            });
        })
          .then(result => {
            clearInterval(checkRegistration);
            //@ts-ignore
            resolve(result);
          })
          .catch(error => {
            console.log(chalk.grey('Waiting for browser oauth registration'));
          });
      }, 1000);

      setTimeout(() => {
        clearInterval(checkRegistration);
        reject('Timed out for oauth registration verification.');
      }, 20000);
    });
  }

  static getLoginData(loginFile: string) {
    return fs.existsSync(loginFile) ? fs.readJsonSync(loginFile) : {};
  }

  static persistTokens(registration: ActiveRegistration) {
    const configstore = new Configstore('/ryuu/' + registration.instance);
    const scopes = this.getScopes(registration.manifestName);
    configstore.set(
      `${registration.proxyId}-${scopes.join('-')}-accessToken`,
      registration.accessToken,
    );
    configstore.set(
      `${registration.proxyId}-${scopes.join('-')}-refreshToken`,
      registration.refreshToken,
    );
    return {
      accessToken: registration.accessToken,
      refreshToken: registration.refreshToken,
    };
  }

  static deleteTokens(registration: Registration) {
    const configstore = new Configstore('/ryuu/' + registration.instance);
    const scopes = this.getScopes(registration.manifestName);
    return Promise.all([
      configstore.delete(
        `${registration.proxyId}-${scopes.join('-')}-accessToken`,
      ),
      configstore.delete(
        `${registration.proxyId}-${scopes.join('-')}-refreshToken`,
      ),
    ]);
  }

  static getTokens(registration: Registration) {
    const configstore = new Configstore('/ryuu/' + registration.instance);
    const scopes = this.getScopes(registration.manifestName);

    return new Promise<{accessToken: string; refreshToken: string}>(
      (resolve, reject) => {
        Promise.all([
          configstore.get(
            `${registration.proxyId}-${scopes.join('-')}-accessToken`,
          ),
          configstore.get(
            `${registration.proxyId}-${scopes.join('-')}-refreshToken`,
          ),
        ])
          .then(([accessToken, refreshToken]: [string, string]) => {
            resolve({accessToken, refreshToken});
          })
          .catch(reject);
      },
    );
  }
}
