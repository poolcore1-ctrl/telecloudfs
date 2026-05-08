# TeleCloudFS 2.0 🚀

**TeleCloudFS** is a powerful, secure, and high-performance serverless file system built on top of Telegram's MTProto API and Cloudflare Workers. It transforms your Telegram account into a personal, unlimited cloud storage drive with a professional, Google Drive-inspired dashboard.

![Dashboard Preview](https://via.placeholder.com/1200x600/0a0a0a/ffffff?text=TeleCloudFS+2.0+Dashboard)

## ✨ Features

- **Unlimited Storage**: Leverages Telegram's free storage for files up to 2GB each.
- **High-Speed MTProto Streaming**: Direct peer-to-peer streaming using 16 parallel workers for buffer-free media playback.
- **Secure by Design**: 
  - Sensitive session strings stored in Cloudflare D1.
  - Zero reliance on browser `localStorage` for credentials.
  - Secure, HTTP-only session cookies.
- **Modern Dashboard**: 
  - Fully responsive design (Desktop, Tablet, Mobile).
  - Drag-and-drop file uploads.
  - Multi-file operations (Move, Copy, Delete).
  - Powerful search with extension and exact-match filters.
- **Advanced Upload Manager**: 
  - Real-time progress tracking.
  - Support for multiple concurrent uploads.
  - Individual and global cancel controls.
- **Serverless Infrastructure**: Hosted entirely on Cloudflare Pages and D1 for maximum availability and zero maintenance.

## 🛠 Tech Stack

- **Frontend**: React (Vite), TypeScript, Tailwind-inspired Vanilla CSS.
- **Backend**: Cloudflare Pages Functions (Workers), D1 Database.
- **Telegram API**: GramJS (MTProto).
- **Security**: SubtleCrypto for vault encryption.

## 🚀 Getting Started

### Prerequisites

- A Telegram account.
- `API_ID` and `API_HASH` from [my.telegram.org](https://my.telegram.org).
- A Cloudflare account with Pages and D1 enabled.

### Deployment

1. **Clone the repository**:
   ```bash
   git clone https://github.com/poolcore1-ctrl/telecloudfs.git
   cd telecloudfs
   ```

2. **Setup D1 Database**:
   Create a D1 database in your Cloudflare dashboard and run the initial migrations if necessary (the app handles table creation automatically on first run).

3. **Deploy to Cloudflare Pages**:
   - Connect your GitHub repository to Cloudflare Pages.
   - Set the build command to `npm run build` and the output directory to `dist`.
   - Bind your D1 database to the `DB` variable in the Pages settings.

4. **Login**:
   Visit your deployed URL and log in using your Telegram credentials. The app will securely initialize your vault and session in D1.

## 📱 Mobile Support

TeleCloudFS is fully responsive. The interface adapts to mobile devices, providing a native-app-like experience for browsing and streaming your files on the go.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.
