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
import type {RyuuClient} from 'ryuu-client';
import {createProxy, getOauthTokens} from '@domoinc/ryuu-proxy';

export interface DomoPluginOptions {
  client: RyuuClient;
  manifest: any;
  userId?: number;
  manifestPath?: string;
}

export function domoPlugin(options: DomoPluginOptions): Plugin {
  let proxy: ReturnType<typeof createProxy> | null = null;
  const sseClients: Response[] = [];
  let cachedManifestData: any = null;
  let dataFetchPromise: Promise<void>;

  // Start fetching manifest data and initializing proxy immediately
  const {client, manifest} = options;
  dataFetchPromise = (async () => {
    try {
      const appData = await client.apps.getEnvironment(
        manifest,
        manifest?.proxyId,
      );

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
        instance: client.instance,
      };

      // Initialize proxy with the resolved domain URL
      const oauthTokens =
        (manifest as any).oAuthEnabled && manifest.proxyId
          ? getOauthTokens(client.instance, manifest.proxyId, manifest.scopes)
          : undefined;

      proxy = createProxy({
        client,
        manifest,
        domainUrl: appData.url,
        oauthTokens,
      });
    } catch (err: any) {
      console.error('Error fetching Domo app data:', err);
      if (err.statusCode === 401 || err.statusCode === 403) {
        console.error(
          '\n❌ Authentication failed. Your session may have expired.',
        );
        console.error('   Please run "domo login" to authenticate again.\n');
      }
      cachedManifestData = {};
    }
  })().catch((err: any) => {
    // Additional top-level catch to prevent unhandled promise rejection
    console.error('Unexpected error in data fetch promise:', err);
  });

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

      // Add Domo proxy middleware for data API calls
      // MUST be registered here (not in return function) to run before Vite's HTML fallback
      viteServer.middlewares.use((req, res, next) => {
        if (proxy) {
          // Add Express-compatible methods for Vite's ServerResponse
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

          proxy.express()(req as any, res as any, next);
        } else {
          next();
        }
      });

      // Serve app files from the current working directory with /app prefix
      // MUST be registered here (not in return function) to run before Vite's HTML transform
      viteServer.middlewares.use('/app', (req, res, next) => {
        // When using path-specific middleware, Express already strips the prefix
        // So req.url is already without '/app'
        const urlPath = req.url || '';
        // Remove query string for file path lookup
        const filePathPart = urlPath.split('?')[0];
        // path.join handles cross-platform path separators automatically
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
