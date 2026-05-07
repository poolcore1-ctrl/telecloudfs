/// <reference types="@cloudflare/workers-types" />

interface Env { DB: D1Database; }

/** 
 * GET /api/auth/session -> Restore session (returns apiId, apiHash, sessionString)
 * POST /api/auth/session -> Save session (receives apiId, apiHash, sessionString)
 * DELETE /api/auth/session -> Logout
 *
 * This replaces sessionStorage/localStorage for sensitive credentials,
 * keeping everything in D1 linked to a secure HTTP-only cookie or session ID.
 */
export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  // For this implementation, we use a simple 'session' cookie or header
  const sessionId = request.headers.get('x-session-id') || 'default_user'; // In prod, use a real random UUID in a cookie

  // Ensure table exists
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS web_sessions (
      id TEXT PRIMARY KEY,
      api_id INTEGER,
      api_hash TEXT,
      session_string TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  if (request.method === 'GET') {
    const session = await env.DB.prepare('SELECT * FROM web_sessions WHERE id = ?').bind(sessionId).first() as any;
    if (!session) return new Response(JSON.stringify({ error: 'No session' }), { status: 404, headers: corsHeaders });
    return new Response(JSON.stringify({
      apiId: session.api_id,
      apiHash: session.api_hash,
      sessionString: session.session_string
    }), { headers: corsHeaders });
  }

  if (request.method === 'POST') {
    const { apiId, apiHash, sessionString } = await request.json() as any;
    await env.DB.prepare(`
      INSERT INTO web_sessions (id, api_id, api_hash, session_string)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        api_id = excluded.api_id,
        api_hash = excluded.api_hash,
        session_string = excluded.session_string
    `).bind(sessionId, apiId, apiHash, sessionString).run();
    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
  }

  if (request.method === 'DELETE') {
    await env.DB.prepare('DELETE FROM web_sessions WHERE id = ?').bind(sessionId).run();
    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
  }

  return new Response('Method not allowed', { status: 405 });
};
