import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

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
    }
  },
  optimizeDeps: {
    include: ['telegram', 'big-integer', 'buffer', 'util', 'events', 'pako'],
  },
  build: {
    outDir: 'dist',
    target: 'esnext',
    // Remove manualChunks for telegram to avoid interop issues
  },
});
