/// <reference types="@cloudflare/workers-types" />

interface Env {
    DB: D1Database;
}

export const onRequest: PagesFunction<Env> = async (context) => {
    const { request, env } = context;
    const url = new URL(request.url);
    const method = request.method;

    if (!env.DB) {
        return new Response(JSON.stringify({ error: 'DB binding missing' }), { status: 500 });
    }

    try {
        if (method === 'GET') {
            // List all keys
            const { results } = await env.DB.prepare(
                "SELECT id, name, created_at, last_used FROM api_keys ORDER BY created_at DESC"
            ).all();
            return new Response(JSON.stringify(results), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (method === 'POST') {
            // Generate new key
            const body = await request.json() as any;
            const { name } = body;
            if (!name) return new Response("Name is required", { status: 400 });

            const id = crypto.randomUUID();
            const key_secret = Array.from(crypto.getRandomValues(new Uint8Array(32)))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');

            await env.DB.prepare(
                "INSERT INTO api_keys (id, key_secret, name) VALUES (?, ?, ?)"
            ).bind(id, key_secret, name).run();

            return new Response(JSON.stringify({ id, key_secret, name }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (method === 'DELETE') {
            // Delete key
            const body = await request.json() as any;
            const { id } = body;
            if (!id) return new Response("ID is required", { status: 400 });

            await env.DB.prepare("DELETE FROM api_keys WHERE id = ?").bind(id).run();
            return new Response(JSON.stringify({ success: true }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response("Method not allowed", { status: 405 });
    } catch (err: any) {
        return new Response(err.message, { status: 500 });
    }
};
