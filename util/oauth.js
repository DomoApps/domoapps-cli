const fs = require('fs-extra');
const path = require('path');
const Domo = require('ryuu-client');
const home = Domo.getHomeDir();
const keytar = require('keytar');
const Manifest = require('./manifest');
const Promise = require('bluebird');
const request = require('request');
const opn = require('opn');
const chalk = require('chalk');

module.exports = {
  isOAuthEnabled: function(manifestName) {
    if (Manifest.hasManifest(manifestName)) {
      const manifest = Manifest.get(manifestName);
      return !!manifest.oAuthEnabled;
    }

    return false;
  },

  hasAppProxyId: function(manifestName) {
    const manifest = Manifest.get(manifestName);
    return !!Object.keys(manifest).includes('cardId')
      || !!(Object.keys(manifest).includes('proxyId'))
      || !!(Object.keys(manifest).includes('appContextId'));
  },

  /**
   * Requires there to be an appProxyId
   */
  getAppProxyId: function(manifestName) {
    const manifest = Manifest.get(manifestName);
    if (!!Object.keys(manifest).includes('cardId')) {
      return manifest.cardId;
    }
    if (!!Object.keys(manifest).includes('appContextId')) {
      return manifest.appContextId;
    }
    return manifest.proxyId;
  },

  getScopes: function(manifestName) {
    const manifest = Manifest.get(manifestName);
    if (!!Object.keys(manifest).includes('scopes')) {
      return [
        'domoapps',
        ...manifest.scopes,
      ];
    }

    return ['domoapps'];
  },

  hasTokens: function({ instance, manifestName, proxyId }) {
    const scopes = JSON.stringify(this.getScopes(manifestName));
    const instanceData = fs.readJsonSync(path.resolve(home + '/login/' + instance + '.json'), {throws: false});
    return instanceData.proxyId === proxyId && instanceData.scopes === scopes;
  },

  register: function({instance, manifestName, proxyId}) {
    return new Promise((resolve, reject) => {
      request.post(
        {
          url: `https://${instance}/api/oauth2/device_authorization`,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          form: {
            client_id: `domo:ryuu:${proxyId}`,
            scope: this.getScopes(manifestName).join(' '),
          }
        },
        (error, httpResponse, body) => {
          if (httpResponse.statusCode !== 200) reject(body.trim());
          resolve(JSON.parse(body));
        }
      );
    });
  },

  verifyRegistration: function({ instance, manifestName, proxyId, verificationUri, userCode, deviceCode }) {
    return new Promise((resolve, reject) => {
      opn(`${verificationUri}?user_code=${userCode}`);

      // scopes are space separated
      const scopes = this.getScopes(manifestName).join(' ');

      const checkRegistration = setInterval(() => {
        new Promise((resolve, reject) => {
          request.get(
            {
              url: `https://${instance}/domoapps/admin/device-registration/${proxyId}?scope=${scopes}&device_code=${deviceCode}`
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
      }, 10000);
    });
  },

  /**
   * persist login to user's domo home
   * TODO: REFACTOR w writeLogin
   */
  persistTokens: function({ instance, manifestName, proxyId, accessToken, refreshToken }) {
    const loginFile = path.resolve(home + '/login/' + instance + '.json');
    const loginData = fs.readJsonSync(path.resolve(home + '/login/' + instance + '.json'), {throws: false});
    const scopes = this.getScopes(manifestName);

    fs.ensureFileSync(loginFile);

    const data = {
      ...loginData,
      instance,
      scopes: JSON.stringify(scopes), // save scopes to the login file
      proxyId, // save the proxyId to the login file
    };

    keytar.setPassword(`domoapps-oauth-access-${scopes.join('-')}`, `${instance}-${proxyId}`, accessToken);
    keytar.setPassword(`domoapps-oauth-refresh-${scopes.join('-')}`, `${instance}-${proxyId}`, refreshToken);
    fs.writeJsonSync(loginFile, data);
    return { accessToken, refreshToken };
  },

  deleteTokens: function({ instance, manifestName }) {
    const scopes = this.getScopes(manifestName);
    const instanceData = fs.readJsonSync(path.resolve(home + '/login/' + instance + '.json'), {throws: false});
    return new Promise.all([
      keytar.deletePassword(`domoapps-oauth-access-${scopes.join('-')}`, `${instance}-${instanceData.proxyId}`),
      keytar.deletePassword(`domoapps-oauth-refresh-${scopes.join('-')}`, `${instance}-${instanceData.proxyId}`),
    ]);
  },

  getTokens: function({ instance, manifestName }) {
    const scopes = this.getScopes(manifestName);
    const instanceData = fs.readJsonSync(path.resolve(home + '/login/' + instance + '.json'), {throws: false});
    return new Promise.all([
      keytar.getPassword(`domoapps-oauth-access-${scopes.join('-')}`, `${instance}-${instanceData.proxyId}`),
      keytar.getPassword(`domoapps-oauth-refresh-${scopes.join('-')}`, `${instance}-${instanceData.proxyId}`),
    ]).then((accessToken, refreshToken) => { accessToken, refreshToken });
  }
}
