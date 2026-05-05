/// <reference types="@cloudflare/workers-types" />

interface Env { DB: D1Database; }

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const pathParts = url.pathname.replace('/api/s3/', '').split('/');
  const folderIdStr = pathParts[0];
  const messageId = pathParts[1];
  const apiKey = request.headers.get('Authorization')?.replace('Bearer ', '') || url.searchParams.get('apiKey');

  if (!folderIdStr || !messageId) {
    return new Response(JSON.stringify({ usage: '/api/s3/{folderId}/{messageId}?apiKey=your-key' }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key required' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  // Validate key
  const key = await env.DB.prepare('SELECT id FROM api_keys WHERE key_secret = ?').bind(apiKey).first();
  if (!key) return new Response(JSON.stringify({ error: 'Invalid API key' }), { status: 403, headers: { 'Content-Type': 'application/json' } });

  // Update last_used
  await env.DB.prepare('UPDATE api_keys SET last_used = CURRENT_TIMESTAMP WHERE key_secret = ?').bind(apiKey).run();

  return new Response(JSON.stringify({
    message: 'Direct S3 streaming requires an active browser session. Use the streaming URL via the dashboard.',
    streamUrl: `/s3/${folderIdStr}/${messageId}`
  }), { headers: { 'Content-Type': 'application/json' } });
};
