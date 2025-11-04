import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname, 'src/server/ui'),
  build: {
    outDir: path.resolve(__dirname, 'dist/server/ui'),
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    strictPort: false,
  },
});
