import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ['buffer', 'process', 'util', 'events', 'stream', 'path', 'crypto', 'zlib'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  define: {
    'process.env': {},
    'process.browser': true,
  },
  resolve: {
    alias: {
      'big-integer': 'big-integer',
      'socks': path.resolve(__dirname, './src/shim.js'),
      'websocket': path.resolve(__dirname, './src/shim.js'),
      'node-localstorage': path.resolve(__dirname, './src/shim.js'),
    }
  },
  optimizeDeps: {
    exclude: ['telegram'],
  },
  build: {
    outDir: 'dist',
    target: 'esnext',
  },
});
