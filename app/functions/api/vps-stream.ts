/// <reference types="@cloudflare/workers-types" />

interface Env { DB: D1Database; }

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  
  const cid = url.searchParams.get('cid');
  const mid = url.searchParams.get('mid');
  const ah = url.searchParams.get('ah');

  if (!cid || !mid || !ah) {
    return new Response(JSON.stringify({ error: 'Missing parameters' }), { status: 400 });
  }

  // Get VPS URL from settings or use a default
  const config = await env.DB.prepare('SELECT value FROM config WHERE key = "vps_url"').first() as any;
  const vpsBase = config?.value || 'http://your-vps-ip:8000'; // Default placeholder

  const targetUrl = `${vpsBase}/stream?cid=${cid}&mid=${mid}&ah=${ah}`;

  // Forward the request with the Range header
  const response = await fetch(targetUrl, {
    headers: {
      'Range': request.headers.get('Range') || ''
    }
  });

  // Proxy the response back
  const newResponse = new Response(response.body, response);
  newResponse.headers.set('Access-Control-Allow-Origin', '*');
  newResponse.headers.set('Cache-Control', 'public, max-age=31536000');
  
  return newResponse;
};
