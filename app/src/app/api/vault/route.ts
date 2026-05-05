import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(request: NextRequest) {
    try {
        const context = getRequestContext();
        const db = (context.env as any).DB; // D1Database

        if (!db) {
            return NextResponse.json({ error: 'D1 Database binding "DB" is missing.' }, { status: 500 });
        }

        const body = await request.json() as any;
        const { password_hash, encrypted_payload, salt, api_id, api_hash, action } = body;

        if (action === 'save') {
            await db.prepare(
                "INSERT OR REPLACE INTO vault (id, password_hash, api_id, api_hash, encrypted_payload, salt) VALUES (1, ?, ?, ?, ?, ?)"
            ).bind(password_hash, String(api_id), api_hash, encrypted_payload, salt).run();

            return NextResponse.json({ success: true });
        }

        if (action === 'load') {
            const data = await db.prepare(
                "SELECT * FROM vault WHERE id = 1"
            ).first() as any;

            if (!data) {
                return NextResponse.json({ error: 'Vault not initialized' }, { status: 404 });
            }

            const responseData: any = { 
                salt: data.salt,
                api_id: data.api_id,
                api_hash: data.api_hash
            };

            if (password_hash && data.password_hash === password_hash) {
                responseData.encrypted_payload = data.encrypted_payload;
            }

            return NextResponse.json(responseData);
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
