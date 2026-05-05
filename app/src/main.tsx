import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';

// Critical polyfills for GramJS
import { Buffer } from 'buffer';
import process from 'process';
import * as util from 'util';

(window as any).global = window;
(window as any).Buffer = Buffer;
(window as any).process = process;
(window as any).util = util;

// ROBUST OS Polyfill for GramJS
const osPolyfill = {
  type: () => 'Browser',
  release: () => '1.0.0',
  platform: () => 'browser',
  arch: () => 'x64',
  endianness: () => 'LE',
  totalmem: () => 1024 * 1024 * 1024,
  freemem: () => 512 * 1024 * 1024,
  cpus: () => [],
  networkInterfaces: () => ({}),
  homedir: () => '/',
  tmpdir: () => '/tmp',
  hostname: () => 'localhost',
  uptime: () => 0,
  loadavg: () => [0, 0, 0],
  version: () => '1.0.0',
};

// GramJS expects os.default.type() in some bundled environments
(window as any).os = { ...osPolyfill, default: osPolyfill };

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
