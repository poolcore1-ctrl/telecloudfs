/// <reference types="@cloudflare/workers-types" />

interface Env { DB: D1Database; }

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;
  const url = new URL(request.url);
  
  // Handle GET /api/share/:id
  const pathParts = url.pathname.split('/');
  const shareId = pathParts[pathParts.length - 1];

  if (request.method === 'GET' && shareId && shareId !== 'share') {
    try {
      const share = await env.DB.prepare('SELECT * FROM shares WHERE id = ? AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)').bind(shareId).first() as any;
      if (!share) return new Response(JSON.stringify({ error: 'Share not found or expired' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
      
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
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  // Handle POST /api/share
  if (request.method === 'POST') {
    try {
      const body = await request.json() as any;
      const { folderId, messageId, accessHash, name, size, type } = body;
      const id = crypto.randomUUID().split('-')[0];

      // Ensure tables exist
      await env.DB.prepare('CREATE TABLE IF NOT EXISTS bots (id TEXT PRIMARY KEY, name TEXT, token TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)').run();
      await env.DB.prepare('CREATE TABLE IF NOT EXISTS shares (id TEXT PRIMARY KEY, folder_id INTEGER, message_id INTEGER, access_hash TEXT, name TEXT, size INTEGER, type TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)').run();

      // Migration: Ensure new columns exist
      const columnsToAdd = ['bot_token TEXT', 'expires_at DATETIME'];
      for (const col of columnsToAdd) {
        try {
          await env.DB.prepare(`ALTER TABLE shares ADD COLUMN ${col}`).run();
        } catch (e) { /* Column likely exists */ }
      }

      // Get bots to assign one to the share
      const botsRes = await env.DB.prepare('SELECT token FROM bots').all() as any;
      const bots = botsRes?.results || [];
      const botTokens = bots.map((b: any) => b.token) || [];
      const botToken = botTokens.length > 0 ? botTokens[Math.floor(Math.random() * botTokens.length)] : null;

      // Set expiration to 24 hours from now
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').split('.')[0];

      await env.DB.prepare('INSERT INTO shares (id, folder_id, message_id, access_hash, name, size, type, bot_token, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(id, folderId, messageId, accessHash, name, size, type, botToken, expiresAt).run();

      return new Response(JSON.stringify({ id }), { headers: { 'Content-Type': 'application/json' } });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message, stack: e.stack }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
};
