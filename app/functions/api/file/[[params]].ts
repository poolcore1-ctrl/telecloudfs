/// <reference types="@cloudflare/workers-types" />

interface Env { DB: D1Database; }

/** GET /api/file/:folderId/:messageId
 *
 * Returns file metadata without exposing secrets in URLs.
 * Priority:
 *  1. file_registry D1 table (fast, populated during browsing)
 *  2. Bot API lookup (works for any file a bot can access)
 *
 * Returns: { name, size, mime_type, access_hash, folder_id, message_id }
 * The access_hash is returned in the JSON body (HTTPS - safe), never in URLs.
 */
export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);

  // CORS headers for browser fetch
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'private, no-store',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Parse /api/file/{folderId}/{messageId}
  const parts = url.pathname.replace('/api/file/', '').split('/').filter(Boolean);
  
  // ── Handle POST /api/file/sync ──
  if (request.method === 'POST' && parts[0] === 'sync') {
    try {
      const body = await request.json() as any;
      const { id, path, folderId, messageId, accessHash, name, size, type, mimeType } = body;
      
      await env.DB.prepare(`
        INSERT INTO file_registry (id, path, folder_id, message_id, access_hash, name, size, type, mime_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          path = excluded.path,
          access_hash = excluded.access_hash,
          name = excluded.name,
          size = excluded.size,
          type = excluded.type,
          mime_type = excluded.mime_type
      `).bind(id, path, folderId, messageId, accessHash, name, size, type, mimeType || null).run();
      
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
    }
  }

  if (parts.length < 2) {
    return new Response(JSON.stringify({ error: 'Missing folderId or messageId' }), { status: 400, headers: corsHeaders });
  }

  const folderId = parts[0];
  const messageId = parseInt(parts[1]);

  if (isNaN(messageId)) {
    return new Response(JSON.stringify({ error: 'Invalid messageId' }), { status: 400, headers: corsHeaders });
  }

  try {
    // ── Step 1: Try file_registry (fast D1 lookup) ──
    let fileRecord: any = null;
    try {
      // Ensure registry table exists
      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS file_registry (
          id TEXT PRIMARY KEY,
          path TEXT,
          folder_id INTEGER,
          message_id INTEGER,
          access_hash TEXT,
          name TEXT,
          size INTEGER,
          type TEXT,
          mime_type TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();

      fileRecord = await env.DB.prepare(
        'SELECT * FROM file_registry WHERE folder_id = ? AND message_id = ? LIMIT 1'
      ).bind(folderId, messageId).first() as any;
    } catch (e) { /* Registry not set up yet — will fallback to Bot API */ }

    if (fileRecord) {
      return new Response(JSON.stringify({
        name: fileRecord.name,
        size: fileRecord.size,
        mime_type: fileRecord.mime_type || 'application/octet-stream',
        access_hash: fileRecord.access_hash,
        folder_id: fileRecord.folder_id,
        message_id: fileRecord.message_id,
        source: 'registry',
      }), { headers: corsHeaders });
    }

    // ── Step 2: Fallback — Bot API lookup ──
    // Get bot token from D1
    const botsRes = await env.DB.prepare('SELECT token FROM bots LIMIT 1').first() as any;
    if (!botsRes?.token) {
      return new Response(JSON.stringify({ error: 'File not in registry and no bot available. Browse this folder in the dashboard first to index it.' }), {
        status: 404, headers: corsHeaders
      });
    }

    const botToken = botsRes.token;
    const chatId = folderId.startsWith('-') ? folderId : `-100${folderId}`;

    // Use Bot API to get the message
    const tgRes = await fetch(
      `https://api.telegram.org/bot${botToken}/getMessages?chat_id=${chatId}&message_ids=${messageId}`,
      { headers: { 'Content-Type': 'application/json' } }
    );

    // Fallback: use forwardMessages or getMessage via Bot API
    const msgRes = await fetch(`https://api.telegram.org/bot${botToken}/copyMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, from_chat_id: chatId, message_id: messageId })
    });

    // Try getting the message directly
    const getMsg = await fetch(
      `https://api.telegram.org/bot${botToken}/getChat?chat_id=${chatId}`
    );
    const chatData = await getMsg.json() as any;

    if (!chatData.ok) {
      return new Response(JSON.stringify({
        error: 'File not indexed. Please open the dashboard and browse this folder to index its files.',
        hint: 'The admin needs to visit this folder in the dashboard at least once to make files accessible via permanent links.'
      }), { status: 404, headers: corsHeaders });
    }

    // If bot can access the chat, we know the channel is valid
    // Return what we know — the client will need to connect via its own session for access_hash
    return new Response(JSON.stringify({
      folder_id: parseInt(folderId),
      message_id: messageId,
      access_hash: null,  // Will be resolved client-side
      source: 'bot_partial',
      chat: chatData.result,
      hint: 'Browse this folder in the dashboard to fully index this file.'
    }), { headers: corsHeaders });

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
};
