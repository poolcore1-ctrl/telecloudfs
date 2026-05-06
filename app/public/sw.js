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
  const accessHash = url.searchParams.get('ah');
  const isDownload = url.searchParams.get('download') === '1';

  event.respondWith(handleStream(event.request, folderId, messageId, fileName, accessHash, isDownload));
});

async function ask(client, msg) {
  return new Promise(resolve => {
    const ch = new MessageChannel();
    ch.port1.onmessage = e => resolve(e.data);
    setTimeout(() => resolve(null), 10000); // 10s timeout
    client.postMessage(msg, [ch.port2]);
  });
}

async function handleStream(req, folderId, messageId, fileName, accessHash, isDownload) {
  const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  if (!allClients.length) return new Response('No window active', { status: 503 });

  let activeClient = null;
  for (const client of allClients) {
    const ok = await ask(client, { type: 'PING' });
    if (ok) { activeClient = client; break; }
  }

  if (!activeClient) return fetch(req);

  const info = await ask(activeClient, { type: 'GET_FILE_INFO', folderId, messageId, accessHash });
  if (!info || info.error) return new Response('File info failed: ' + (info?.error || 'timeout'), { status: 404 });

  const { totalSize, mimeType, fileName: realName } = info;
  const name = realName || fileName;
  const range = req.headers.get('range');
  const disposition = isDownload ? 'attachment' : 'inline';

  if (range) {
    const [, s, e] = range.match(/bytes=(\d+)-(\d*)/) || [];
    const start = parseInt(s);
    const end = e ? Math.min(parseInt(e), totalSize - 1) : Math.min(start + CHUNK - 1, totalSize - 1);
    const chunk = await ask(activeClient, { type: 'GET_CHUNK', folderId, messageId, start, end, accessHash });
    if (!chunk || chunk.error) return new Response('Chunk error', { status: 500 });
    return new Response(chunk.data, { status: 206, headers: { 
      'Content-Type': mimeType, 
      'Content-Range': `bytes ${start}-${end}/${totalSize}`, 
      'Content-Length': String(end - start + 1), 
      'Accept-Ranges': 'bytes', 
      'Content-Disposition': `${disposition}; filename="${name}"` 
    } });
  }

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  (async () => {
    let off = 0;
    while (off < totalSize) {
      const end = Math.min(off + CHUNK - 1, totalSize - 1);
      const chunk = await ask(activeClient, { type: 'GET_CHUNK', folderId, messageId, start: off, end, accessHash });
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
    'Content-Disposition': `${disposition}; filename="${name}"` 
  } });
}
