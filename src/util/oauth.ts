import fs from 'fs-extra';
import {ManifestUtils} from './manifest.js';
import open from 'open';
import {
  Registration,
  ActiveRegistration,
  FullRegistration,
} from '../models/index.js';
import Configstore from 'configstore';
import {jwtDecode} from 'jwt-decode';

export class Oauth {
  static isOAuthEnabled(manifestName: string) {
    if (ManifestUtils.hasManifest(manifestName)) {
      const manifest = ManifestUtils.getManifest(manifestName);
      return !!(manifest as any)['oAuthEnabled'];
    }

    return false;
  }

  static hasAppProxyId(manifestName: string) {
    const manifest = ManifestUtils.getManifest(manifestName);
    return (
      !!Object.keys(manifest).includes('cardId') ||
      !!Object.keys(manifest).includes('proxyId') ||
      !!Object.keys(manifest).includes('appContextId')
    );
  }

  static getScopes(manifestName: string) {
    const manifest = ManifestUtils.getManifest(manifestName);
    if (Object.keys(manifest).includes('scopes')) {
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
      jwtDecode(token as string);
      return true;
    }
    return false;
  }

  static register(registration: Registration) {
    const scopes = this.getScopes(registration.manifestName);
    const body = new URLSearchParams({
      client_id: `domo:ryuu:${registration.proxyId}`,
      scope: scopes.join(' '),
    });

    return fetch(
      `https://${registration.instance}/api/oauth2/device_authorization`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      },
    ).then(async response => {
      if (!response.ok) {
        throw new Error(
          `Registration failed: ${response.status} ${response.statusText}`,
        );
      }
      return {data: await response.json()};
    });
  }

  static verifyRegistration(
    registration: FullRegistration,
  ): Promise<{data: any}> {
    return new Promise((resolve, reject) => {
      open(
        `${registration.verification_uri}?user_code=${registration.user_code}`,
      );
      const scopes = this.getScopes(registration.manifestName).join(' ');
      const url = `https://${registration.instance}/domoapps/admin/device-registration/${registration.proxyId}?scope=${scopes}&device_code=${registration.device_code}`;

      const checkRegistration = setInterval(() => {
        fetch(url)
          .then(async response => {
            if (!response.ok) {
              throw new Error(`${response.status}`);
            }
            return {data: await response.json()};
          })
          .then(result => {
            clearInterval(checkRegistration);
            resolve(result);
          })
          .catch(() => {
            console.log('Waiting for browser oauth registration');
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
