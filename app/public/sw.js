const CACHE_NAME = 'telecloud-stream-v2';

self.addEventListener('install', (event) => {
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
    // Handle PING from bridge pages - relay to a dashboard client
    if (event.data?.type === 'PING') {
        const replyPort = event.ports[0];
        if (!replyPort) return;

        self.clients.matchAll({ type: 'window' }).then((clients) => {
            // Find a dashboard client (one that has the main app open)
            const dashClient = clients.find(c => {
                const u = new URL(c.url);
                return !u.pathname.startsWith('/api/s3/');
            });
            if (dashClient) {
                replyPort.postMessage({ ok: true });
            } else {
                replyPort.postMessage({ ok: false });
            }
        });
        return;
    }
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    if (url.pathname.startsWith('/stream/')) {
        event.respondWith(handleStreamRequest(event));
    }
});

async function handleStreamRequest(event) {
    const url = new URL(event.request.url);
    const pathParts = url.pathname.split('/').filter(p => p.length > 0);
    // pathParts: ['stream', folderId, messageId, ...fileName]
    const folderId = pathParts[1] === 'home' ? null : parseInt(pathParts[1]);
    const messageId = parseInt(pathParts[2]);
    const fileName = decodeURIComponent(pathParts.slice(3).join('/') || 'file');

    // Find the dashboard client to handle this stream request
    const allClients = await self.clients.matchAll({ type: 'window' });
    
    // Prefer dashboard clients (non-s3 pages), fallback to any other client
    const client = allClients.find(c => {
        const u = new URL(c.url);
        return !u.pathname.startsWith('/api/s3/');
    }) || allClients.find(c => c.id !== event.clientId) || null;

    if (!client) {
        return noClientErrorPage();
    }

    const rangeHeader = event.request.headers.get('Range');
    let start = 0;
    let end = null;

    if (rangeHeader) {
        const parts = rangeHeader.replace(/bytes=/, '').split('-');
        start = parseInt(parts[0], 10) || 0;
        end = parts[1] ? parseInt(parts[1], 10) : null;
    }

    if (rangeHeader) {
        return new Promise((resolve) => {
            const messageChannel = new MessageChannel();
            messageChannel.port1.onmessage = (msgEvent) => {
                const { data, totalSize, mimeType, error } = msgEvent.data;
                if (error) {
                    resolve(new Response(error, { status: 500 }));
                    return;
                }
                const chunkEnd = start + data.byteLength - 1;
                const actualTotalSize = totalSize || chunkEnd + 1;
                resolve(new Response(data, {
                    status: 206,
                    statusText: 'Partial Content',
                    headers: {
                        'Content-Type': mimeType || getMimeType(fileName),
                        'Accept-Ranges': 'bytes',
                        'Content-Length': data.byteLength.toString(),
                        'Content-Range': `bytes ${start}-${chunkEnd}/${actualTotalSize}`,
                    }
                }));
            };
            client.postMessage({
                type: 'GET_CHUNK',
                folderId,
                messageId,
                start,
                end: end !== null ? end : (start + 8 * 1024 * 1024 - 1)
            }, [messageChannel.port2]);
        });
    }

    // Full stream with parallel prefetching for smooth playback
    const CHUNK_SIZE = 8 * 1024 * 1024; // 8MB
    const PREFETCH = 2;
    let currentOffset = 0;
    const queue = [];

    const fetchNext = () => {
        const startOffset = currentOffset;
        currentOffset += CHUNK_SIZE;
        const mc = new MessageChannel();
        const p = new Promise((resolve) => {
            mc.port1.onmessage = (e) => resolve(e.data);
        });
        client.postMessage({
            type: 'GET_CHUNK',
            folderId,
            messageId,
            start: startOffset,
            end: startOffset + CHUNK_SIZE - 1
        }, [mc.port2]);
        return p;
    };

    const stream = new ReadableStream({
        async start(controller) {
            try {
                for (let i = 0; i < PREFETCH; i++) queue.push(fetchNext());

                while (queue.length > 0) {
                    const result = await queue.shift();
                    if (result.error) { controller.error(result.error); return; }
                    controller.enqueue(result.data);
                    if (result.data.byteLength === CHUNK_SIZE) {
                        queue.push(fetchNext());
                    } else {
                        break; // Last chunk
                    }
                }
                controller.close();
            } catch (e) {
                controller.error(e);
            }
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': getMimeType(fileName),
            'Content-Disposition': `inline; filename="${encodeURIComponent(fileName)}"`,
        }
    });
}

function getMimeType(name) {
    const ext = (name.split('.').pop() || '').toLowerCase();
    const types = {
        'mp4': 'video/mp4', 'mkv': 'video/x-matroska', 'avi': 'video/x-msvideo',
        'mov': 'video/quicktime', 'webm': 'video/webm',
        'mp3': 'audio/mpeg', 'wav': 'audio/wav', 'ogg': 'audio/ogg',
        'm4a': 'audio/mp4', 'flac': 'audio/flac',
        'pdf': 'application/pdf',
        'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png',
        'gif': 'image/gif', 'webp': 'image/webp', 'svg': 'image/svg+xml',
        'txt': 'text/plain', 'json': 'application/json',
    };
    return types[ext] || 'application/octet-stream';
}

function noClientErrorPage() {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>TeleCloudFS - Dashboard Required</title>
    <style>
        body { background:#0f172a; color:#f8fafc; font-family:system-ui,sans-serif; display:flex; align-items:center; justify-content:center; height:100vh; margin:0; }
        .card { text-align:center; padding:2.5rem 3rem; background:#1e293b; border-radius:1.25rem; border:1px solid #334155; max-width:400px; width:90%; }
        h1 { font-size:1.2rem; margin-bottom:0.75rem; color:#fbbf24; }
        p { font-size:0.85rem; color:#94a3b8; line-height:1.6; margin-bottom:1rem; }
        a { display:inline-block; background:#3b82f6; color:#fff; padding:0.6rem 1.5rem; border-radius:0.75rem; text-decoration:none; font-weight:600; font-size:0.875rem; }
        a:hover { background:#2563eb; }
    </style>
</head>
<body>
    <div class="card">
        <div style="font-size:2.5rem;margin-bottom:1rem">☁</div>
        <h1>Dashboard Required</h1>
        <p>Please open TeleCloudFS and log in, then return to this tab and refresh to stream your file.</p>
        <a href="/" target="_blank">Open TeleCloudFS</a>
    </div>
</body>
</html>`;
    return new Response(html, { status: 503, headers: { 'Content-Type': 'text/html' } });
}
