/// <reference types="@cloudflare/workers-types" />

interface Env { DB: D1Database; }

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;
  const url = new URL(request.url);
  
  // Handle GET /api/share/:id
  const pathParts = url.pathname.split('/');
  const shareId = pathParts[pathParts.length - 1];

  if (request.method === 'GET' && shareId && shareId !== 'share') {
    const share = await env.DB.prepare('SELECT * FROM shares WHERE id = ?').bind(shareId).first() as any;
    if (!share) return new Response(JSON.stringify({ error: 'Share not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    
    // Get vault salt and api keys for the guest client to initialize
    const vault = await env.DB.prepare('SELECT salt, api_id, api_hash FROM vault WHERE id = 1').first() as any;
    
    return new Response(JSON.stringify({
      folderId: share.folder_id,
      messageId: share.message_id,
      accessHash: share.access_hash,
      name: share.name,
      size: share.size,
      type: share.type,
      botToken: share.bot_token,
      salt: vault?.salt,
      apiId: vault?.api_id,
      apiHash: vault?.api_hash
    }), { headers: { 'Content-Type': 'application/json' } });
  }

  // Handle POST /api/share
  if (request.method === 'POST') {
    const body = await request.json() as any;
    const { folderId, messageId, accessHash, name, size, type } = body;
    const id = crypto.randomUUID().split('-')[0]; // Simple short ID

    // Get bot tokens to assign one to the share
    const config = await env.DB.prepare('SELECT value FROM config WHERE key = "bot_tokens"').first() as any;
    const botTokens = config?.value?.split(',').map((t: string) => t.trim()).filter((t: string) => t) || [];
    // Simple rotation: pick a random bot if available
    const botToken = botTokens.length > 0 ? botTokens[Math.floor(Math.random() * botTokens.length)] : null;

    await env.DB.prepare('CREATE TABLE IF NOT EXISTS shares (id TEXT PRIMARY KEY, folder_id INTEGER, message_id INTEGER, access_hash TEXT, name TEXT, size INTEGER, type TEXT, bot_token TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)').run();
    
    await env.DB.prepare('INSERT INTO shares (id, folder_id, message_id, access_hash, name, size, type, bot_token) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(id, folderId, messageId, accessHash, name, size, type, botToken).run();

    return new Response(JSON.stringify({ id }), { headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
};
