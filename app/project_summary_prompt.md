# TeleCloudFS: Master Development Directive & Requirements

This document outlines the core requirements, architectural principles, and technical constraints for **TeleCloudFS**. Use this as a prompt to ensure any future development adheres to the project's strict standards.

---

## 🎯 Core Objectives
Create a high-performance, professional cloud storage platform that uses Telegram as a storage backend. The system must feel like **AWS S3**—clean, fast, and capable of streaming large media files directly in the browser.

## 🛠️ Mandatory Technical Requirements

### 1. Strict Stateless Architecture
- **Requirement**: The application must remain **100% stateless** on the client side.
- **Constraint**: DO NOT use `localStorage`, `sessionStorage`, or `cookies` for Telegram sessions or API credentials.
- **Implementation**: All sensitive data (string sessions, API ID/Hash) MUST be managed via the **Cloudflare D1 Vault** (`functions/api/vault.ts`). The dashboard should fetch state from the vault on initialization.

### 2. Standalone Viewing & Streaming Engine
- **Requirement**: File interaction must NOT happen inside the dashboard's main UI.
- **Goal**: Clicking a file should open it in a **separate browser window** (AWS style).
- **Differentiated Delivery**:
    - **Streaming (Video/Audio)**: Use the chunked streaming engine (`sw.js`) for instant playback of large media files without waiting for a full download.
    - **Direct Preview (Images/Docs/PDFs)**: Leverage native browser viewing capabilities. For non-media types, the system should prioritize serving the file in a way that allows the browser to render it immediately (e.g., direct blob delivery or full-file fetch) rather than complex chunk-by-chunk streaming.
- **Mechanism**: The Headless Bridge (`/api/s3/[[path]]`) manages these delivery methods based on file type.

### 3. Native-First UI/UX
- **Requirement**: Use the browser's built-in power instead of heavy libraries.
- **Implementation**: Avoid embedding third-party PDF viewers, image galleries, or complex media player components. Use native `<video>`, `<img>`, and the browser's own PDF engine.
- **Restructuring**: Keep the component hierarchy flat and standard. Do not over-engineer directory structures unless they improve build times or modularity.

### 4. Robust Serverless Backend & S3 API
- **Requirement**: All API features must be handled by Cloudflare Pages Functions.
- **Developer-Facing S3 API**: Build and maintain a full S3-compatible REST API.
    - **GET `/api/s3/{bucket}/{key}`**: Retrieve/Stream a specific file.
    - **GET `/api/s3/{bucket}`**: List all files in a folder/bucket.
    - **PUT `/api/s3/{bucket}/{key}`**: Upload a new file or update an existing one.
    - **POST `/api/s3/{bucket}`**: Create a new folder or perform bulk operations (e.g., uploading many files at once).
    - **DELETE `/api/s3/{bucket}/{key}`**: Delete a specific file.
    - **DELETE `/api/s3/{bucket}`**: Bulk delete multiple files/folders.
    - **Authentication**: All operations require a valid `apiKey` (Bearer token or query parameter).
- **Routing**: Use catch-all routing (`[[path]].ts`) for the S3 gateway to support nested paths and identifiers.
- **Database**: Use Cloudflare D1 for metadata synchronization, API key management, and session vaulting.

### 5. Security & Sharing
- **Requirement**: Files are private by default but can be shared via API Keys.
- **Sharing Logic**: Direct links generated for external use MUST include an `apiKey` parameter. Internal previews (from the dashboard) can be lenient if a vault session is active.

---

## 🚀 Technical Stack constraints
- **Frontend**: React (Vite), Tailwind CSS, Framer Motion (only for micro-interactions).
- **Backend**: Cloudflare Pages Functions (TypeScript).
- **Storage**: Telegram MTProto (via GramJS).
- **Data Layer**: Cloudflare D1 Database.

---

### **How to Use This Prompt**
*"I am developing TeleCloudFS. The project must follow the Master Development Directive: it is a strictly stateless Telegram storage app with an AWS-style standalone streaming engine. My current task is to [INSERT TASK]. Ensure your solution does not violate the statelessness or the standalone preview requirements."*
