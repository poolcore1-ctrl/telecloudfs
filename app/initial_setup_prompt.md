# TeleCloudFS: Initial Architecting Prompt

If you were starting this project from scratch, use the following prompt to guide an AI assistant to build the TeleCloudFS architecture exactly as it exists now.

---

### **Prompt Title: Architecting a Stateless, S3-Compatible Telegram Cloud Drive**

**Context:**
"I want to build a professional cloud storage platform called **TeleCloudFS** that uses Telegram as the storage backend (via GramJS/MTProto). The application must be deployed on **Cloudflare workers** and use **Cloudflare D1** as the database."

**Core Architectural Mandates:**
1.  **Strict Statelessness**: The frontend must store ZERO credentials (no string sessions in `localStorage`). All sessions must be encrypted and stored in a Cloudflare D1 'Vault'.
2.  **Zero-Knowledge Vault**: Implement a login flow where the user provides a Master Password to decrypt their Telegram session from the D1 database on the fly.
3.  **Standalone Streaming Gateway**: Previews must NOT be embedded in the main dashboard. Implement a serverless bridge that serves a minimal HTML loader. This loader must use a Service Worker to fetch file chunks from the Telegram connection in the main tab and stream them directly to the browser's native media player.
4.  **Native-First UI**: Use native browser capabilities for PDFs, Videos, and Images. Avoid heavy third-party player libraries.
5.  **Programmatic S3 API**: Build a developer-facing REST API that supports full CRUD operations (GET metadata, PUT for upload , POST for bulk uploads, DELETE and DELETE all with confirmation) using API Keys for authentication.

**Feature Checklist:**
-   **Auth**: Master Password login + Telegram OTP setup flow.
-   **File Explorer**: Folders, Grid/List views, Drag-and-Drop, Search (with extension filters).
-   **Streaming**: Parallel chunk prefetching in the Service Worker for smooth 4K video playback.
-   **API**: Programmatic listing, uploading, and bulk-deletion of files/folders.

**UI Aesthetics:**
"The design must be premium and high-end, using a dark-mode Telegram-inspired palette, glassmorphism, and smooth Framer Motion transitions. The interface should feel like a state-of-the-art SaaS platform, not a simple file list."

---


