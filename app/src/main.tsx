import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';
import { Buffer } from 'buffer';
import process from 'process';

// Polyfill for GramJS
(window as any).global = window;
(window as any).Buffer = Buffer;
(window as any).process = process;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
