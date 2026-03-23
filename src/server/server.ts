/**
 * domo dev server - Modern Vite-based implementation
 */

import path from 'path';
import {fileURLToPath} from 'url';
import {domoPlugin} from './vite-plugin-domo.js';
import {Session} from '../util/session.js';
import {ManifestUtils} from '../util/manifest.js';
import {DevOptions} from '../models/index.js';
import {log} from '../util/log.js';
import Domo from 'ryuu-client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const start = async (client: Domo, options: DevOptions) => {
  const manifest = ManifestUtils.getManifest(options.manifest);

  // Validate session before starting
  try {
    await Session.check(client);
  } catch {
    log.notAuthenticated();
    return;
  }

  try {
    // Dynamically import Vite (ESM modules)
    const {createServer: createViteServer} = await import('vite');
    const react = await import('@vitejs/plugin-react');

    // Create Vite dev server
    // In dev mode, use source files; in production, use built files
    // Check for both Unix (/) and Windows (\) path separators
    const isBuiltVersion =
      __dirname.includes('/dist/') || __dirname.includes('\\dist\\');
    const uiRoot = isBuiltVersion
      ? path.resolve(__dirname, 'ui')
      : path.resolve(__dirname, '../../src/server/ui');

    console.log('Current directory:', __dirname);
    console.log('UI root directory:', uiRoot);
    console.log('Is built version:', isBuiltVersion);

    const server = await createViteServer({
      configFile: false, // Use inline config
      root: uiRoot,
      publicDir: path.resolve(uiRoot, 'public'),
      plugins: [
        react.default(),
        domoPlugin({
          client,
          manifest,
          userId: options.userId,
          manifestPath: options.manifest,
        }),
      ],
      resolve: {
        extensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
      },
      server: {
        port: 3000,
        strictPort: false,
        host: options.external ? '0.0.0.0' : 'localhost',
        open: true,
      },
      logLevel: 'info',
    });

    await server.listen();

    const info = server.config.logger.info;
    info('\n  Domo Dev Server running at:');
    server.printUrls();
    info(`\n  Instance: ${client.getInstance()}\n`);
  } catch (err: any) {
    console.error('Failed to start dev server:', err);
    log.fail('Error starting dev server', err.message);
    process.exit(1);
  }
};
