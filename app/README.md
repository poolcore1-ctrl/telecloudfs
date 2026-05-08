# TeleCloudFS Application 📱

This directory contains the core React application and Cloudflare Pages Functions that power the TeleCloudFS platform.

## 🏗 Structure

- `src/`: The React frontend application.
  - `components/`: Reusable UI components (FileCard, UploadManager, etc.).
  - `context/`: React Contexts for state management (Auth, Uploads, Toast).
  - `pages/`: Main application views (Dashboard, Login, Preview).
  - `services/`: Core logic, including the `TelegramClient` MTProto wrapper.
  - `styles/`: Global CSS and theme definitions.
- `functions/`: Cloudflare Pages Functions (API endpoints).
  - `api/auth/`: Session and credential management.
  - `api/file/`: File metadata resolution and registry integration.
  - `api/registry/`: Channel-level registry management.
- `public/`: Static assets and the Service Worker for streaming.

## 🚀 Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run locally**:
   ```bash
   npm run dev
   ```

3. **Build for production**:
   ```bash
   npm run build
   ```

## 🔐 Key Technologies

- **Vite**: Ultra-fast frontend build tool.
- **GramJS**: Robust MTProto implementation for browser-based Telegram interaction.
- **Service Workers**: Used to intercept fetch requests and provide seamless, chunked media streaming.
- **Cloudflare D1**: SQL database for secure session and metadata storage.

## 📱 Mobile-First Design

The application is built with a mobile-first philosophy, ensuring that all storage management and media streaming features work flawlessly on touch devices.
