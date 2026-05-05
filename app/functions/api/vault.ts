/// <reference types="@cloudflare/workers-types" />

interface Env {
    DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
    try {
        if (!context.env.DB) {
            return new Response(JSON.stringify({ error: 'D1 Database binding "DB" is missing.' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const body = await context.request.json() as any;
        const { password_hash, encrypted_payload, salt, api_id, api_hash, action } = body;

        if (action === 'save') {
            // Store the password hash, plain keys, and the encrypted payload (session)
            await context.env.DB.prepare(
                "INSERT OR REPLACE INTO vault (id, password_hash, api_id, api_hash, encrypted_payload, salt) VALUES (1, ?, ?, ?, ?, ?)"
            ).bind(password_hash, String(api_id), api_hash, encrypted_payload, salt).run();

            return new Response(JSON.stringify({ success: true }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (action === 'load') {
            const data = await context.env.DB.prepare(
                "SELECT * FROM vault WHERE id = 1"
            ).first() as any;

            if (!data) {
                return new Response(JSON.stringify({ error: 'Vault not initialized' }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            // Always return the salt and plain keys so the client can identify the account
            const responseData: any = { 
                salt: data.salt,
                api_id: data.api_id,
                api_hash: data.api_hash
            };

            // Only return the payload (session) if the hash matches
            if (password_hash && data.password_hash === password_hash) {
                responseData.encrypted_payload = data.encrypted_payload;
                return new Response(JSON.stringify(responseData), {
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            // If no password_hash or incorrect, just return salt and plain keys
            return new Response(JSON.stringify(responseData), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({ error: "Invalid action" }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message || 'Internal Server Error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
