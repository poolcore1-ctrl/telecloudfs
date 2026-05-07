/// <reference lib="webworker" />

const CHUNK = 2 * 1024 * 1024; // 2MB chunks for better throughput

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // 1. Intercept Direct Path Previews (/p/...) and Direct ID Previews (/f/...)
  if (url.pathname.startsWith('/p/') || url.pathname.startsWith('/f/')) {
    event.respondWith(handleDirectRedirect(event.request));
    return;
  }

  // 2. Intercept Streaming URLs (/stream/...)
  const m = url.pathname.match(/^\/stream\/([^/]+)\/(\d+)\/(.+)$/);
  if (m) {
    const folderId = m[1] === 'home' ? null : parseInt(m[1]);
    const messageId = parseInt(m[2]);
    const fileName = decodeURIComponent(m[3]);
    const accessHash = url.searchParams.get('ah');
    const botToken = url.searchParams.get('bt');
    const isDownload = url.searchParams.get('download') === '1';

    event.respondWith(handleStream(event.request, folderId, messageId, fileName, accessHash, botToken, isDownload));
  }
});

async function handleDirectRedirect(request) {
    const url = new URL(request.url);
    const isPath = url.pathname.startsWith('/p/');
    
    try {
        // Fetch metadata from registry
        const apiPath = isPath ? `/api/p${url.pathname.replace('/p', '')}` : `/api/f/${url.pathname.split('/').pop()}`;
        const res = await fetch(apiPath);
        if (!res.ok) return new Response('File not found in registry', { status: 404 });
        const data = await res.json();
        
        // Auto-connect a bot if needed
        const botsRes = await fetch('/api/bots');
        const bots = (botsRes.ok) ? await botsRes.json() : [];
        const botToken = bots.length > 0 ? bots[0].token : '';

        return handleStream(
            request, 
            data.folder_id, 
            data.message_id, 
            data.name, 
            data.access_hash, 
            botToken, 
            false
        );
    } catch (e) {
        return new Response('Registry lookup failed: ' + e.message, { status: 500 });
    }
}

async function handleStream(request, folderId, messageId, fileName, accessHash, botToken, isDownload) {
  const clients = await self.clients.matchAll();
  const activeClient = clients[0];
  if (!activeClient) return new Response('Dashboard must be open to start stream', { status: 503 });

  // Get file info first
  const info = await ask(activeClient, { type: 'GET_FILE_INFO', folderId, messageId, accessHash, botToken });
  if (!info || info.error) return new Response(info?.error || 'File info failed', { status: 404 });

  const totalSize = info.totalSize;
  const mimeType = info.mimeType;

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  
  (async () => {
    try {
      let off = 0;
      while (off < totalSize) {
        const end = Math.min(off + CHUNK - 1, totalSize - 1);
        const chunk = await ask(activeClient, { type: 'GET_CHUNK', folderId, messageId, start: off, end, accessHash, botToken });
        if (!chunk || chunk.error) break;
        await writer.write(new Uint8Array(chunk.data));
        off = end + 1;
      }
    } catch (e) { console.warn('Stream interrupted:', e); }
    finally { 
      try { 
        if (writer) {
          await writer.ready;
          await writer.close(); 
        }
      } catch (e) {} 
    }
  })();

  return new Response(readable, { 
    status: 200, 
    headers: { 
      'Content-Type': mimeType,
      'Content-Length': totalSize,
      'Content-Disposition': isDownload ? `attachment; filename="${fileName}"` : `inline; filename="${fileName}"`,
      'Accept-Ranges': 'none',
      'Cache-Control': 'public, max-age=31536000'
    } 
  });
}

function ask(client, msg) {
  return new Promise(resolve => {
    const channel = new MessageChannel();
    channel.port1.onmessage = e => resolve(e.data);
    client.postMessage(msg, [channel.port2]);
    setTimeout(() => resolve(null), 60000); // 60s timeout for large MTProto chunks
  });
}
