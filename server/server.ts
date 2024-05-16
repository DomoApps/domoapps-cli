/**
 * domo dev server
 */

import path = require('path');
import _ = require('lodash');
import fs = require('fs-extra');
const bs = require('browser-sync').create();
import portfinder = require('portfinder');
portfinder.basePort = 3000;

import {Session} from '../util/session';
import appStructure = require('../util/appStructure');
import {Manifest} from '../util/manifest';
import {DomoOptions, AppData} from '../models/index';
import {log} from '../util/log';

import Domo = require('ryuu-client');
import express = require('express');
const app = express();

const {Proxy} = require('@domoinc/ryuu-proxy');

export const start = (client: Domo, options: DomoOptions) => {
  return new Promise((resolve, reject) => {
    portfinder.getPorts(2, {}, (err, ports) => {
      const assetsPort = ports[0];
      const dataPort = ports[1];
      const manifest = Manifest.get();
      // If we don't have an app proxyId, get a temporary one
      if (!manifest.proxyId) {
        client.createApp(manifest.id).then((app: any) => {
          manifest.proxyId = app.instance.id;
        });
      }
      const proxy = new Proxy({manifest});
      app.get('/', (req, res) => {
        client.getDomoappsURL(manifest).then((appData: AppData) => {
          // sizes consistent with Domo Web
          const sizeMultiplier = {
            width: 235,
            height: 290,
          };
          const width = sizeMultiplier.width * manifest.size.width - 10 + 'px';
          const height =
            sizeMultiplier.height * manifest.size.height - 40 + 'px';
          const userId = options.userId || appData.user.id;
          const customerId = 1 || appData.customer;
          const url = `index.html?userId=${userId}&customer=${customerId}&locale=en-US&platform=desktop`;
          const hasThumbnail = appStructure.hasThumbnail();
          const template = _.template(
            fs.readFileSync(
              path.resolve(__dirname + '/../server/domodev/index.html'),
              'utf8',
            ),
          );
          const fullpage = manifest.fullpage;
          res.send(
            template({
              manifest,
              width,
              height,
              url,
              hasThumbnail,
              fullpage,
            }),
          );
        });
      });
      app.use(
        '/domodev',
        express.static(path.resolve(__dirname + '/../server/domodev')),
      );
      app.use(express.static('.'));
      app.use(proxy.express());
      Session.check(client)
        .then(function () {
          var external = Boolean(options.external);
          app.listen(dataPort);
          bs.init({
            proxy: 'localhost:' + dataPort,
            port: assetsPort,
            notify: false,
            ui: false,
            logLevel: 'info',
            logPrefix: 'Domo Dev',
            online: external,
            // TODO: add user's ignored files here too?
            files: ['**/*', '!node_modules/**/*'],
          });
          bs.instance.logger.info('Instance: ' + client.getInstance());
        })
        .catch(function (e) {
          log.notAuthenticated;
        });
    });
  });
};
