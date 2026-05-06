const CHUNK = 1024 * 1024;
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const m = url.pathname.match(/^\/stream\/([^/]+)\/(\d+)\/(.+)$/);
  if (!m) return;

  const folderId = m[1] === 'home' ? null : parseInt(m[1]);
  const messageId = parseInt(m[2]);
  const fileName = decodeURIComponent(m[3]);

  event.respondWith(handleStream(event.request, folderId, messageId, fileName));
});

async function ask(client, msg) {
  return new Promise(resolve => {
    const ch = new MessageChannel();
    ch.port1.onmessage = e => resolve(e.data);
    setTimeout(() => resolve(null), 5000); // 5s timeout
    client.postMessage(msg, [ch.port2]);
  });
}

async function handleStream(req, folderId, messageId, fileName) {
  const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  if (!allClients.length) return new Response('No window active', { status: 503 });

  // Find a client that is actually ready (responsive)
  let activeClient = null;
  for (const client of allClients) {
    const ok = await ask(client, { type: 'PING' });
    if (ok) { activeClient = client; break; }
  }

  if (!activeClient) {
    // Fallback: If no browser client is ready, let the request go to network
    // This allows the backend Cloudflare Worker to handle it if it has /stream
    return fetch(req);
  }

  const info = await ask(activeClient, { type: 'GET_FILE_INFO', folderId, messageId });
  if (!info || info.error) return new Response('File info failed: ' + (info?.error || 'timeout'), { status: 404 });

  const { totalSize, mimeType, fileName: realName } = info;
  const name = realName || fileName;
  const range = req.headers.get('range');

  if (range) {
    const [, s, e] = range.match(/bytes=(\d+)-(\d*)/) || [];
    const start = parseInt(s);
    const end = e ? Math.min(parseInt(e), totalSize - 1) : Math.min(start + CHUNK - 1, totalSize - 1);
    const chunk = await ask(activeClient, { type: 'GET_CHUNK', folderId, messageId, start, end });
    if (!chunk || chunk.error) return new Response('Chunk error', { status: 500 });
    return new Response(chunk.data, { status: 206, headers: { 
      'Content-Type': mimeType, 
      'Content-Range': `bytes ${start}-${end}/${totalSize}`, 
      'Content-Length': String(end - start + 1), 
      'Accept-Ranges': 'bytes', 
      'Content-Disposition': `inline; filename="${name}"` 
    } });
  }

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  (async () => {
    let off = 0;
    while (off < totalSize) {
      const end = Math.min(off + CHUNK - 1, totalSize - 1);
      const chunk = await ask(activeClient, { type: 'GET_CHUNK', folderId, messageId, start: off, end });
      if (!chunk || chunk.error) break;
      await writer.write(new Uint8Array(chunk.data));
      off = end + 1;
    }
    writer.close();
  })();

  return new Response(readable, { status: 200, headers: { 
    'Content-Type': mimeType, 
    'Content-Length': String(totalSize), 
    'Accept-Ranges': 'bytes', 
    'Content-Disposition': `attachment; filename="${name}"` 
  } });
}
