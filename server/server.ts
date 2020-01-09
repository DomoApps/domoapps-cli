/**
 * domo dev server
 */

import {
  constant
} from '../models';

import path = require('path');
import _ = require('lodash');
import fs = require('fs-extra');
import * as Promise from 'bluebird';
let bs = require('browser-sync').create();
import portfinder = require('portfinder');
portfinder.basePort = 3000;

import session = require('../util/session');
import appStructure = require('../util/appStructure');
import * as Manifest from '../util/manifest';
import { DataPoint } from '../models/interfaces/manifest';


import Domo = require('ryuu-client');
import express = require('express');
const app = express();
const { Proxy } = require('@domoinc/ryuu-proxy');
const config = { manifest: Manifest.get() };
const proxy = new Proxy(config);

let manifest = Manifest.get();
let context;
let isValidContext = true;
let domoApp : {
  clientId: string,
  instance: string,
  refreshToken: string,
  server: string
};
let domoOptions: { 
  userId: number,
  external: boolean,
  manifest: string
};

app.get('/', function (req, res){
  //This line doesn't make any sense, I gotta figure out how to make domoApp something real/valid
  //@ts-ignore
  const isValidSession = session.check(domoApp)
    .then(() => {
      manifest = fs.readJsonSync(path.resolve(process.cwd() + '/' + (domoOptions.manifest || 'manifest.json')));
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
      const userId = domoOptions.userId || appData.user.id;
      const customerId = 1 || appData.customer;
      const url = `index.html?userId=${userId}&customer=${customerId}&locale=en-US&platform=desktop&context=${context.id}`;
      const hasThumbnail = appStructure.hasThumbnail();
      const template = _.template(fs.readFileSync(path.resolve(__dirname + '/../server/domodev/index.html'), "utf8"));
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
      portfinder.getPorts(2, {}, function (err, ports) {
        let assetsPort = ports[0];
        let dataPort = ports[1];
        domoApp = domo;
        domoOptions = options;
        //@ts-ignore
        session.check(domoApp)
          .then(function() {
            var external = Boolean(domoOptions.external);
            app.listen(dataPort);
            bs.init({
              proxy: "localhost:" + dataPort,
              port: assetsPort,
              notify: false,
              ui: false,
              logLevel: 'info',
              logPrefix: 'Domo Dev',
              online: external,
              // TODO: add user's ignored files here too?
              files: ['**/*', '!node_modules/**/*'],
            });
            bs.instance.logger.info('Instance: ' + domoApp.instance);
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
  return (<string>domoApp.instance).match(regexp)[1];
}

function getEnv(){
  var regexp = /([-_\w]+)\.(.*)/;
  return (domoApp.instance as string).match(regexp)[2];
}

/**
 * Fetch domoapps environment data from maestro.
 * Fallback to inferring it by the instance URL.
 */
function getDomoappsData(){
  // @ts-ignore
  var manifest = fs.readJsonSync(path.resolve(process.cwd() + '/' + (domoOptions.manifest || 'manifest.json')));
  var uuid = (manifest['proxyId']) ? manifest.proxyId : Domo.createUUID();
  var options = {
    url: 'https://' + domoApp.instance + '/api/content/v1/mobile/environment',
    resolveWithFullResponse: true
  }
  // @ts-ignore
  return domoApp.processRequest(options)
    .then(function(res) {
      var data = JSON.parse(res);
      data.url = 'https://'+uuid+'.' + JSON.parse(res).domoappsDomain;
      
      return data;
    }).catch(function() {
      var data = {url: 'https://'+uuid+'.domoapps.' + getEnv()};
      return data;
    });
}

function createContext(designId: string, mapping: DataPoint[]) {
  var options = {
    url: 'https://' + domoApp.instance + '/domoapps/apps/v2/contexts',
    method: 'POST',
    json: {designId: designId, mapping: mapping},
    resolveWithFullResponse: true
  };                     
// @ts-ignore
  return domoApp.processRequest(options)
    .then(function(res) {
      return res[0];
    }).catch(function(err) {
      console.log("Error: ", err.message);
      return;
    })
}