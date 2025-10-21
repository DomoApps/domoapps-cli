/**
 * Vite plugin to integrate Domo app development features
 * - Proxy for Domo data API
 * - Static file serving for app assets
 * - Auth validation
 */

import type {Plugin, ViteDevServer} from 'vite';
import type {Express} from 'express';
import express from 'express';
import path from 'path';
import Domo from 'ryuu-client';
import {Proxy} from '@domoinc/ryuu-proxy';
import {ManifestUtils} from '../util/manifest';
import {Session} from '../util/session';

export interface DomoPluginOptions {
  client: Domo;
  manifest: any;
  userId?: number;
  manifestPath?: string;
}

export function domoPlugin(options: DomoPluginOptions): Plugin {
  let server: ViteDevServer;
  let proxy: any;

  return {
    name: 'vite-plugin-domo',

    configureServer(viteServer: ViteDevServer) {
      server = viteServer;

      const {client, manifest} = options;

      // Initialize proxy if we don't have a proxyId
      if (!manifest.proxyId) {
        client.createApp(manifest.id).then((app: any) => {
          manifest.proxyId = app.instance.id;
          proxy = new (Proxy as any)({manifest}, manifest.proxyId);
        });
      } else {
        proxy = new (Proxy as any)({manifest}, manifest.proxyId);
      }

      return () => {
        // Serve app files from the current working directory
        viteServer.middlewares.use(express.static(process.cwd()));

        // Add Domo proxy middleware for data API calls
        viteServer.middlewares.use((req, res, next) => {
          if (proxy && proxy.express) {
            const proxyMiddleware = proxy.express();
            proxyMiddleware(req, res, next);
          } else {
            next();
          }
        });

        // Inject manifest data into the HTML
        viteServer.middlewares.use(async (req, res, next) => {
          if (req.url === '/' || req.url === '/index.html') {
            try {
              const appData = await client.getDomoappsData(manifest);

              // Calculate sizes consistent with Domo Web
              const sizeMultiplier = {
                width: 235,
                height: 290,
              };
              const width = sizeMultiplier.width * manifest.size.width - 10;
              const height = sizeMultiplier.height * manifest.size.height - 40;
              const userId = options.userId || appData.user.id;
              const customerId = appData.customer || 1;

              // Pass data to React via window object
              const manifestData = {
                manifest,
                width,
                height,
                userId,
                customerId,
                instance: client.getInstance(),
              };

              // Store in a global that the React app can access
              (res as any).locals = {
                ...((res as any).locals || {}),
                manifestData,
              };

              next();
            } catch (err) {
              console.error('Error fetching Domo app data:', err);
              next();
            }
          } else {
            next();
          }
        });
      };
    },

    transformIndexHtml(html) {
      // Inject manifest data into HTML for React to pick up
      const manifestData = (server as any)?.locals?.manifestData || {};

      return html.replace(
        '</head>',
        `<script>window.__DOMO_DEV_DATA__ = ${JSON.stringify(manifestData)};</script></head>`,
      );
    },
  };
}
