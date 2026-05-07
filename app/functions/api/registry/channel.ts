/// <reference types="@cloudflare/workers-types" />

interface Env { DB: D1Database; }

/** 
 * GET /api/registry/channel/:id -> Get channel info
 * POST /api/registry/channel -> Sync channel info
 *
 * This replaces the file_registry. Instead of indexing every file,
 * we only index the channels. This allows us to resolve any message
 * within a channel using its folderId and accessHash.
 */
export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  // Ensure table exists
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS channel_registry (
      id TEXT PRIMARY KEY,
      name TEXT,
      access_hash TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  const parts = url.pathname.replace('/api/registry/channel', '').split('/').filter(Boolean);

  if (request.method === 'GET' && parts.length > 0) {
    const id = parts[0];
    const channel = await env.DB.prepare('SELECT * FROM channel_registry WHERE id = ?').bind(id).first() as any;
    if (!channel) return new Response(JSON.stringify({ error: 'Channel not registered' }), { status: 404, headers: corsHeaders });
    return new Response(JSON.stringify(channel), { headers: corsHeaders });
  }

  if (request.method === 'POST') {
    const { id, name, accessHash } = await request.json() as any;
    await env.DB.prepare(`
      INSERT INTO channel_registry (id, name, access_hash)
      VALUES (?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        access_hash = excluded.access_hash
    `).bind(String(id), name, accessHash).run();
    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
  }

  return new Response('Method not allowed', { status: 405 });
};
