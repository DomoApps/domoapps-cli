/**
 * Vite plugin to integrate Domo app development features
 * - Proxy for Domo data API
 * - Static file serving for app assets
 * - Auth validation
 * - File watching for hot reload
 */

import type {Plugin, ViteDevServer} from 'vite';
import type {Request, Response} from 'express';
import path from 'path';
import fs from 'fs';
import Domo from 'ryuu-client';
import {Proxy} from '@domoinc/ryuu-proxy';

export interface DomoPluginOptions {
  client: Domo;
  manifest: any;
  userId?: number;
  manifestPath?: string;
}

export function domoPlugin(options: DomoPluginOptions): Plugin {
  let proxy: any;
  const sseClients: Response[] = [];
  let cachedManifestData: any = null;
  let dataFetchPromise: Promise<void>;

  // Start fetching manifest data immediately
  const {client, manifest} = options;
  dataFetchPromise = (async () => {
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

      // Cache data for use in transformIndexHtml
      cachedManifestData = {
        manifest,
        width,
        height,
        userId,
        customerId,
        instance: client.getInstance(),
      };
    } catch (err) {
      console.error('Error fetching Domo app data:', err);
      cachedManifestData = {};
    }
  })();

  return {
    name: 'vite-plugin-domo',

    configureServer(viteServer: ViteDevServer) {
      // Serve favicon files from public directory
      // This must run before other middleware to prevent 404s
      viteServer.middlewares.use((req, res, next) => {
        if (req.url === '/favicon.ico' || req.url === '/favicon.svg') {
          const faviconPath = path.join(
            viteServer.config.publicDir,
            req.url === '/favicon.ico' ? 'favicon.ico' : 'favicon.svg',
          );

          if (fs.existsSync(faviconPath)) {
            const content = fs.readFileSync(faviconPath);
            res.setHeader('Content-Type', 'image/svg+xml');
            res.setHeader('Cache-Control', 'public, max-age=31536000');
            res.end(content);
            return;
          }
        }
        next();
      });

      // Initialize proxy if we don't have a proxyId
      if (!manifest.proxyId) {
        client.createApp(manifest.id).then((app: any) => {
          manifest.proxyId = app.instance.id;
          proxy = new (Proxy as any)({manifest}, manifest.proxyId);
        });
      } else {
        proxy = new (Proxy as any)({manifest}, manifest.proxyId);
      }

      // Watch app files for changes
      const appDir = process.cwd();
      const watcher = fs.watch(
        appDir,
        {recursive: true},
        (_eventType, filename) => {
          if (filename) {
            // Filter out non-app files (node_modules, .git, etc.)
            if (
              !filename.includes('node_modules') &&
              !filename.includes('.git') &&
              !filename.startsWith('.') &&
              (filename.endsWith('.html') ||
                filename.endsWith('.js') ||
                filename.endsWith('.css') ||
                filename.endsWith('.jsx') ||
                filename.endsWith('.ts') ||
                filename.endsWith('.tsx'))
            ) {
              console.log(`[File changed] ${filename}`);
              // Notify all SSE clients
              sseClients.forEach(client => {
                client.write('data: reload\n\n');
              });
            }
          }
        },
      );

      // Clean up watcher when server closes
      viteServer.httpServer?.on('close', () => {
        watcher.close();
      });

      // Register as PRE middlewares (run BEFORE Vite's built-in middlewares)
      // This is critical so we can serve user app files without Vite transformation

      // SSE endpoint for file watching
      viteServer.middlewares.use(
        '/__file_watcher',
        (req: Request, res: Response) => {
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          });

          // Add this client to the list
          sseClients.push(res);

          // Remove client when connection closes
          req.on('close', () => {
            const index = sseClients.indexOf(res);
            if (index !== -1) {
              sseClients.splice(index, 1);
            }
          });
        },
      );

      // Serve app files from the current working directory with /app prefix
      // MUST be registered here (not in return function) to run before Vite's HTML transform
      viteServer.middlewares.use('/app', (req, res, next) => {
        // When using path-specific middleware, Express already strips the prefix
        // So req.url is already without '/app'
        const urlPath = req.url || '';
        // Remove query string for file path lookup
        const filePathPart = urlPath.split('?')[0];
        const filePath = path.join(process.cwd(), filePathPart);

        // Check if file exists
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          // Serve file directly with correct MIME type
          const ext = path.extname(filePath);
          const mimeTypes: Record<string, string> = {
            '.html': 'text/html',
            '.js': 'application/javascript',
            '.css': 'text/css',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
          };

          const contentType = mimeTypes[ext] || 'application/octet-stream';
          res.setHeader('Content-Type', contentType);

          // Read and send file
          const fileContent = fs.readFileSync(filePath);
          res.end(fileContent);
        } else {
          next();
        }
      });

      // Return middleware to run AFTER Vite's built-in middleware
      // This allows Vite to handle static files (like favicon) first
      return () => {
        // Add Domo proxy middleware for data API calls
        viteServer.middlewares.use((req, res, next) => {
          if (proxy && proxy.express) {
            // Add Express-compatible methods to Node.js response object
            // ryuu-proxy expects Express Response, but Vite provides Node.js ServerResponse
            if (!('status' in res)) {
              (res as any).status = function (code: number) {
                this.statusCode = code;
                return this;
              };
            }
            if (!('send' in res)) {
              (res as any).send = function (data: any) {
                if (typeof data === 'string') {
                  this.setHeader('Content-Type', 'text/html');
                  this.end(data);
                } else if (typeof data === 'object') {
                  this.setHeader('Content-Type', 'application/json');
                  this.end(JSON.stringify(data));
                } else {
                  this.end(data);
                }
                return this;
              };
            }

            const proxyMiddleware = proxy.express();
            proxyMiddleware(req as any, res as any, next);
          } else {
            next();
          }
        });
      };
    },

    async transformIndexHtml(html, ctx) {
      // Only transform the wrapper UI's index.html, not the user's app HTML
      // The user's app is served under /app/ path
      if (ctx.path.startsWith('/app/')) {
        return html; // Don't transform user app HTML
      }

      // Wait for manifest data to be fetched before transforming HTML
      await dataFetchPromise;

      // Inject manifest data into HTML for React to pick up
      const manifestData = cachedManifestData || {};

      return html.replace(
        '</head>',
        `<script>window.__DOMO_DEV_DATA__ = ${JSON.stringify(manifestData)};</script></head>`,
      );
    },
  };
}
