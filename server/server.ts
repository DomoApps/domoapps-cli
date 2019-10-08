/**
 * domo dev server
 */

const path = require('path');
const _ = require('lodash');
const fs = require('fs-extra');
import * as Promise from 'bluebird';
import { IncomingMessage, ServerResponse } from 'http';
//const Promise = require('bluebird');
let bs = require('browser-sync').create();
let portfinder = require('portfinder');
portfinder.basePort = 3000;

const session = require('../util/session');
const appStructure = require('../util/appStructure');
const Manifest = require('../util/manifest');

const Domo = require('ryuu-client');
const express = require('express');
const app = express();
const { Proxy } = require('@domoinc/ryuu-proxy');
const config = { manifest: Manifest.get() };
const proxy = new Proxy(config);

let manifest = Manifest.get();
let context;
let isValidContext = true;

app.get('/', function (req: IncomingMessage, res: ServerResponse){
  const isValidSession = session.check(app.domo)
    .then(() => {
      manifest = fs.readJsonSync(path.resolve(process.cwd() + '/' + (app.options.manifest || 'manifest.json')));
      return createContext(manifest.id, manifest.mapping);
    })
    .then((appContext) => {
      context = appContext;
      if (!context) {
        isValidContext = false;
        context = {id: 0};
      }
      manifest.contextId = context.id;
      return getDomoappsData();
    })
    .then((appData) => {
      // sizes consistent with Domo Web
      const sizeMultiplier = {
        width: 235,
        height: 290
      };
      const width = sizeMultiplier.width * manifest.size.width - 10 + 'px';
      const height = sizeMultiplier.height * manifest.size.height - 40 + 'px';
      const userId = app.options.userId || appData.user.id;
      const customerId = 1 || appData.customer;
      const url = `index.html?userId=${userId}&customer=${customerId}&locale=en-US&platform=desktop&context=${context.id}`;
      const hasThumbnail = appStructure.hasThumbnail();
      const template = _.template(fs.readFileSync(path.resolve(__dirname + '/../server/domodev/index.html')));
      const fullpage = manifest.fullpage;

      res.send(template({
        manifest,
        width,
        height,
        url,
        isValidSession,
        isValidContext,
        hasThumbnail,
        fullpage
      }));
    });
});

app.use('/domodev', express.static(path.resolve(__dirname + '/../server/domodev')));
app.use(express.static('.'));
app.use(proxy.express());

module.exports = {
  start: function(domo, options){
    return new Promise(function(resolve, reject){
      portfinder.getPorts(1, function (err, ports) {
        var assetsPort = ports[0];
        app.domo = domo;
        app.options = options;

        session.check(app.domo)
          .then(function() {
            var external = Boolean(app.options.external);
            app.listen(assetsPort);
            bs.init({
              proxy: "localhost:" + assetsPort,
              port: assetsPort,
              notify: false,
              ui: false,
              logLevel: 'info',
              logPrefix: 'Domo Dev',
              online: external,
              // TODO: add user's ignored files here too?
              files: ['**/*', '!node_modules/**/*'],
            });
            bs.instance.logger.info('Instance: ' + app.domo.instance);
          })
          .catch(function(e){
            reject('Session expired. Please login again using domo login.');
          });
      });
    });
  }
};

function getCustomer(){
  var regexp = /([\w]+)[\.|-]/;
  return app.domo.instance.match(regexp)[1];
}

function getEnv(){
  var regexp = /([-_\w]+)\.(.*)/;
  return app.domo.instance.match(regexp)[2];
}

/**
 * Fetch domoapps environment data from maestro.
 * Fallback to inferring it by the instance URL.
 */
function getDomoappsData(){
  var manifest = fs.readJsonSync(path.resolve(process.cwd() + '/' + (app.options.manifest || 'manifest.json')));
  var uuid = (manifest['proxyId']) ? manifest.proxyId : Domo.createUUID();
  var options = {
    url: 'https://' + app.domo.instance + '/api/content/v1/mobile/environment'
  }
  return app.domo.processRequest(options)
    .then(function(res) {
      var data = JSON.parse(res);
      data.url = 'https://'+uuid+'.' + JSON.parse(res).domoappsDomain;
      
      return data;
    }).catch(function() {
      var data = {url: 'https://'+uuid+'.domoapps.' + getEnv()};
      return data;
    });
}

function createContext(designId, mapping){
  var options = {
    url: 'https://' + app.domo.instance + '/domoapps/apps/v2/contexts',
    method: 'POST',
    json: {designId: designId, mapping: mapping}
  };                     

  return app.domo.processRequest(options)
    .then(function(res) {
      return res[0];
    }).catch(function(err) {
      console.log("Error: ", err.message);
      return;
    })
}