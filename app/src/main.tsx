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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
