/// <reference types="@cloudflare/workers-types" />

interface Env { DB: D1Database; }

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // Handle GET /api/config
  if (request.method === 'GET') {
    await env.DB.prepare('CREATE TABLE IF NOT EXISTS config (key TEXT PRIMARY KEY, value TEXT)').run();
    const rows = await env.DB.prepare('SELECT * FROM config').all();
    const config: Record<string, string> = {};
    rows.results.forEach((r: any) => config[r.key] = r.value);
    return new Response(JSON.stringify(config), { headers: { 'Content-Type': 'application/json' } });
  }

  // Handle POST /api/config
  if (request.method === 'POST') {
    const body = await request.json() as any;
    const { key, value } = body;
    await env.DB.prepare('CREATE TABLE IF NOT EXISTS config (key TEXT PRIMARY KEY, value TEXT)').run();
    await env.DB.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)').bind(key, value).run();
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
};
