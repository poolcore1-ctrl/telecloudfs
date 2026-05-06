/// <reference types="@cloudflare/workers-types" />

interface Env { DB: D1Database; }

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  await env.DB.prepare('CREATE TABLE IF NOT EXISTS bots (id TEXT PRIMARY KEY, name TEXT, token TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)').run();

  // GET /api/bots
  if (request.method === 'GET') {
    const { results } = await env.DB.prepare('SELECT * FROM bots ORDER BY created_at DESC').all();
    return new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } });
  }

  // POST /api/bots (Add or Update)
  if (request.method === 'POST') {
    const body = await request.json() as any;
    const { name, token, id } = body;
    const botId = id || crypto.randomUUID();
    
    await env.DB.prepare('INSERT OR REPLACE INTO bots (id, name, token) VALUES (?, ?, ?)')
      .bind(botId, name || 'Unnamed Bot', token).run();
      
    return new Response(JSON.stringify({ success: true, id: botId }), { headers: { 'Content-Type': 'application/json' } });
  }

  // DELETE /api/bots
  if (request.method === 'DELETE') {
    const body = await request.json() as any;
    const { id } = body;
    await env.DB.prepare('DELETE FROM bots WHERE id = ?').bind(id).run();
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
};
