var fs = require('fs-extra');
var path = require('path');
var Domo = require('ryuu-client');
var home = Domo.getHomeDir();
var log = require('./log');
var keytar = require('keytar');
var Manifest = require('./manifest');
var Promise = require('bluebird');
var request = require('request');
var opn = require('opn');

module.exports = {
  isOAuthEnabled: function() {
    const manifest = Manifest.get();
    return !!manifest.oAuthEnabled;
  },

  hasAppProxyId: function() {
    const manifest = Manifest.get();
    return (!!Object.keys(manifest).includes('cardId') || !!(Object.keys(manifest).includes('proxyId')));
  },

  /**
   * Requires there to be an appProxyId
   */
  getAppProxyId: function() {
    const manifest = Manifest.get();
    if (!!Object.keys(manifest).includes('cardId')) {
      return manifest.cardId;
    }
    return manifest.proxyId;
  },

  getScopes: function() {
    const manifest = Manifest.get();
    if (!!Object.keys(manifest).includes('scopes')) {
      return [
        'domoapps',
        ...manifest.scopes,
      ];
    }

    return ['domoapps'];
  },

  hasTokens: function({ instance, proxyId }) {
    const scopes = JSON.stringify(this.getScopes());
    const instanceData = fs.readJsonSync(path.resolve(home + '/login/' + instance + '.json'), {throws: false});
    return instanceData.proxyId === proxyId && instanceData.scopes === scopes;
  },

  register: function({instance, proxyId}) {
    return new Promise((resolve, reject) => {
      request.post(
        {
          url: `https://${instance}/api/oauth2/device_authorization`,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          form: {
            client_id: `domo:ryuu:${proxyId}`,
            scope: 'domoapps'
          }
        },
        (error, httpResponse, body) => {
          if (httpResponse.statusCode !== 200) reject(body.trim());
          resolve(JSON.parse(body));
        }
      );
    });
  },

  verifyRegistration: function({ instance, proxyId, verificationUri, userCode, deviceCode }) {
    return new Promise((resolve, reject) => {
      opn(`${verificationUri}?user_code=${userCode}`);

      // scopes are space separated
      const scopes = this.getScopes().join(' ');

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
          log.fail('Unable to retrieve access token');
        });
      }, 1000);
  
      setTimeout(() => {
        clearInterval(checkRegistration);
        reject();
      }, 10000);
    });
  },

  /**
   * persist login to user's domo home
   * TODO: REFACTOR w writeLogin
   */
  persistTokens: function({ instance, proxyId, accessToken, refreshToken }) {
    const loginFile = path.resolve(home + '/login/' + instance + '.json');
    const loginData = fs.readJsonSync(path.resolve(home + '/login/' + instance + '.json'), {throws: false});
    const scopes = this.getScopes();

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

  deleteTokens: function(instance) {
    const scopes = this.getScopes();
    const instanceData = fs.readJsonSync(path.resolve(home + '/login/' + instance + '.json'), {throws: false});
    return new Promise.all([
      keytar.deletePassword(`domoapps-oauth-access-${scopes.join('-')}`, `${instance}-${instanceData.proxyId}`),
      keytar.deletePassword(`domoapps-oauth-refresh-${scopes.join('-')}`, `${instance}-${instanceData.proxyId}`),
    ]);
  },

  getTokens: function(instance) {
    const scopes = this.getScopes();
    const instanceData = fs.readJsonSync(path.resolve(home + '/login/' + instance + '.json'), {throws: false});
    return new Promise.all([
      keytar.getPassword(`domoapps-oauth-access-${scopes.join('-')}`, `${instance}-${instanceData.proxyId}`),
      keytar.getPassword(`domoapps-oauth-refresh-${scopes.join('-')}`, `${instance}-${instanceData.proxyId}`),
    ]).then((accessToken, refreshToken) => { accessToken, refreshToken });
  }
}
