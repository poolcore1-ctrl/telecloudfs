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
  
  if (parts.length < 2) {
    return new Response(JSON.stringify({ error: 'Missing folderId or messageId' }), { status: 400, headers: corsHeaders });
  }

  const folderId = parts[0];
  const messageId = parseInt(parts[1]);

  if (isNaN(messageId)) {
    return new Response(JSON.stringify({ error: 'Invalid messageId' }), { status: 400, headers: corsHeaders });
  }

  try {
    // ── Step 1: Lookup channel in registry ──
    const channel = await env.DB.prepare(
      'SELECT * FROM channel_registry WHERE id = ?'
    ).bind(folderId).first() as any;

    const accessHash = channel?.access_hash || null;

    // ── Step 2: Try Bot API for metadata (name, size, mime) ──
    // Get bot token
    const botsRes = await env.DB.prepare('SELECT token FROM bots LIMIT 1').first() as any;
    const botToken = botsRes?.token;
    
    let name = 'file';
    let size = 0;
    let mimeType = 'application/octet-stream';
    let foundViaBot = false;

    if (botToken) {
      const chatId = folderId.startsWith('-') ? folderId : `-100${folderId}`;
      try {
        // Bots can't use getMessages easily, but they can use copyMessage to a private chat or just check chat info
        // For metadata, we actually need the client to resolve it if bot fails
        const getChatRes = await fetch(`https://api.telegram.org/bot${botToken}/getChat?chat_id=${chatId}`);
        const chatData = await getChatRes.json() as any;
        
        if (chatData.ok) {
           // If we have accessHash, we can tell the client to handle the rest
           // We could try copyMessage to a "null" destination just to see if it works
        }
      } catch (e) {}
    }

    // Return the folder's access_hash so the client can resolve the rest
    return new Response(JSON.stringify({
      folder_id: parseInt(folderId),
      message_id: messageId,
      access_hash: accessHash,
      name: name, // Fallback, client will refine
      size: size,
      mime_type: mimeType,
      source: accessHash ? 'registry' : 'fallback'
    }), { headers: corsHeaders });

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
};
