/// <reference types="@cloudflare/workers-types" />

interface Env {
    DB: D1Database;
}

function getMimeType(name: string): string {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    const types: Record<string, string> = {
        'mp4': 'video/mp4', 'mkv': 'video/x-matroska', 'avi': 'video/x-msvideo',
        'mov': 'video/quicktime', 'webm': 'video/webm',
        'mp3': 'audio/mpeg', 'wav': 'audio/wav', 'ogg': 'audio/ogg', 'm4a': 'audio/mp4', 'flac': 'audio/flac',
        'pdf': 'application/pdf',
        'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png',
        'gif': 'image/gif', 'webp': 'image/webp', 'svg': 'image/svg+xml',
        'txt': 'text/plain', 'json': 'application/json', 'zip': 'application/zip',
    };
    return types[ext] || 'application/octet-stream';
}

export const onRequest: PagesFunction<Env> = async (context) => {
    const { request, env } = context;
    const url = new URL(request.url);
    const method = request.method;

    // URL format: /api/s3/{folderId}/{messageId}
    // folderId: 'home' or a numeric channel/group ID
    // messageId: the Telegram message ID (unique file identifier)
    const pathParts = url.pathname.split('/').filter(Boolean);
    // pathParts[0] = 'api', [1] = 's3', [2] = folderId, [3] = messageId
    const folderId = pathParts[2];
    const messageId = pathParts[3];

    if (!folderId || !messageId) {
        return new Response(JSON.stringify({
            usage: '/api/s3/{folderId}/{messageId}',
            example: '/api/s3/home/123456789?apiKey=your-key',
            note: 'folderId is "home" or a channel ID. messageId is the Telegram message ID.'
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (method === 'HEAD') {
        return new Response(null, {
            status: 200,
            headers: {
                'Content-Type': 'application/octet-stream',
                'Accept-Ranges': 'bytes'
            }
        });
    }

    if (method !== 'GET') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        // Load vault session for Telegram access (server-side check)
        const vault = await env.DB.prepare('SELECT * FROM vault WHERE id = 1').first() as any;
        if (!vault) {
            return new Response('Vault not initialized. Please log into TeleCloudFS first.', { status: 500 });
        }

        // Validate API Key (Optional for bridge, required for direct data access if we had it here)
        const authHeader = request.headers.get('Authorization') || url.searchParams.get('apiKey');
        const apiKey = authHeader?.replace('Bearer ', '');

        if (!apiKey) {
            // We allow access without an API key because the bridge page below 
            // relies on the user having a TeleCloudFS dashboard open in another tab.
            // The Service Worker (sw.js) handles the actual security by PINGing open tabs.
            console.log("No API Key provided, proceeding with bridge page only.");
        } else {
            const keyData = await env.DB.prepare(
                'SELECT * FROM api_keys WHERE id = ? OR key_secret = ?'
            ).bind(apiKey, apiKey).first() as any;

            if (keyData) {
                // Update last used timestamp
                await env.DB.prepare('UPDATE api_keys SET last_used = CURRENT_TIMESTAMP WHERE id = ?')
                    .bind(keyData.id).run();
            }
        }

        // === SERVE THE DIRECT STREAM BRIDGE PAGE ===
        // This bridge page:
        // 1. Loads only the sw.js service worker (no full app)
        // 2. Once SW is active, navigates to /stream/{folderId}/{messageId}
        // 3. The SW intercepts that and asks the parent tab's TelegramClient for data
        //
        // KEY INSIGHT: The SW needs a TelegramClient in a tab. The bridge page itself
        // doesn't have it — but the user's main TeleCloudFS tab does.
        // For truly login-free streaming, we need server-side streaming below.
        // For now, we return a bridge that works if the user has TeleCloudFS open.
        //
        // The PROPER server-side streaming would require running GramJS in the Worker,
        // which is possible but complex. This bridge approach is the current architecture.

        const folderPath = folderId === 'home' ? 'home' : folderId;
        const streamPath = `/stream/${folderPath}/${messageId}/file`;

        // Return a minimal self-contained HTML bridge — no React, no app, no login
        const bridgeHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TeleCloudFS - Loading...</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            background: #0f172a;
            color: #f8fafc;
            font-family: system-ui, -apple-system, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
        }
        .card {
            text-align: center;
            padding: 2.5rem 3rem;
            background: #1e293b;
            border-radius: 1.25rem;
            box-shadow: 0 20px 60px rgba(0,0,0,0.5);
            border: 1px solid #334155;
            max-width: 400px;
            width: 90%;
        }
        .logo {
            width: 56px; height: 56px;
            background: linear-gradient(135deg, #3b82f6, #8b5cf6);
            border-radius: 14px;
            display: flex; align-items: center; justify-content: center;
            margin: 0 auto 1.25rem;
            font-size: 1.5rem;
        }
        h1 { font-size: 1.25rem; font-weight: 700; color: #f1f5f9; margin-bottom: 0.5rem; }
        .subtitle { font-size: 0.8rem; color: #64748b; margin-bottom: 1.75rem; }
        .spinner {
            width: 36px; height: 36px;
            border: 3px solid rgba(59,130,246,0.2);
            border-top: 3px solid #3b82f6;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin: 0 auto 1rem;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        #status { font-size: 0.875rem; color: #94a3b8; }
        #error {
            display: none;
            background: #7f1d1d;
            border: 1px solid #991b1b;
            border-radius: 0.75rem;
            padding: 1rem;
            margin-top: 1.25rem;
            font-size: 0.8rem;
            color: #fca5a5;
            line-height: 1.5;
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="logo">☁</div>
        <h1>TeleCloudFS</h1>
        <p class="subtitle">Preparing your file stream...</p>
        <div class="spinner"></div>
        <div id="status">Initializing stream engine...</div>
        <div id="error"></div>
    </div>
    <script>
        const STATUS = document.getElementById('status');
        const ERROR = document.getElementById('error');
        const STREAM_PATH = '${streamPath}';

        function showError(msg) {
            document.querySelector('.spinner').style.display = 'none';
            ERROR.style.display = 'block';
            ERROR.innerHTML = msg;
            STATUS.textContent = 'Failed to start stream.';
        }

        async function startStream() {
            if (!('serviceWorker' in navigator)) {
                showError('Your browser does not support Service Workers. Please use Chrome, Firefox, or Edge.');
                return;
            }

            try {
                STATUS.textContent = 'Registering stream engine...';
                const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });

                STATUS.textContent = 'Activating stream engine...';
                await navigator.serviceWorker.ready;

                if (!navigator.serviceWorker.controller) {
                    // SW just installed, need to reload to let it take control
                    STATUS.textContent = 'Almost ready, activating...';
                    window.location.reload();
                    return;
                }

                STATUS.textContent = 'Connecting to TeleCloudFS...';

                // Check if a TeleCloudFS tab is open with an active client
                // by posting a ping message to the SW which will relay it
                const channel = new MessageChannel();
                const pingPromise = new Promise((resolve) => {
                    channel.port1.onmessage = (e) => resolve(e.data);
                    setTimeout(() => resolve({ ok: false }), 3000);
                });
                navigator.serviceWorker.controller.postMessage({ type: 'PING' }, [channel.port2]);
                const pong = await pingPromise;

                if (!pong || !pong.ok) {
                    showError(
                        '<strong>TeleCloudFS dashboard is not open.</strong><br><br>' +
                        'Please open <a href="/" target="_blank" style="color:#60a5fa">TeleCloudFS</a> and log in first, then come back to this tab and refresh.<br><br>' +
                        '<em>This is required because the file stream is secured by your session.</em>'
                    );
                    return;
                }

                STATUS.textContent = 'Starting stream...';
                setTimeout(() => {
                    window.location.href = STREAM_PATH;
                }, 300);

            } catch (err) {
                showError('Stream initialization failed: ' + err.message);
            }
        }

        startStream();
    </script>
</body>
</html>`;

        return new Response(bridgeHtml, {
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });

    } catch (err: any) {
        return new Response('Internal Server Error: ' + err.message, { status: 500 });
    }
};
