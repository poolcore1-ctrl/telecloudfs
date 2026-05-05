import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function GET() {
    try {
        const context = getRequestContext();
        const db = (context.env as any).DB;
        if (!db) return NextResponse.json({ error: 'DB binding missing' }, { status: 500 });

        const { results } = await db.prepare(
            "SELECT id, name, created_at, last_used FROM api_keys ORDER BY created_at DESC"
        ).all();
        return NextResponse.json(results);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const context = getRequestContext();
        const db = (context.env as any).DB;
        if (!db) return NextResponse.json({ error: 'DB binding missing' }, { status: 500 });

        const body = await request.json() as any;
        const { name } = body;
        if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

        const id = crypto.randomUUID();
        const key_secret = Array.from(crypto.getRandomValues(new Uint8Array(32)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');

        await db.prepare(
            "INSERT INTO api_keys (id, key_secret, name) VALUES (?, ?, ?)"
        ).bind(id, key_secret, name).run();

        return NextResponse.json({ id, key_secret, name });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const context = getRequestContext();
        const db = (context.env as any).DB;
        if (!db) return NextResponse.json({ error: 'DB binding missing' }, { status: 500 });

        const body = await request.json() as any;
        const { id } = body;
        if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

        await db.prepare("DELETE FROM api_keys WHERE id = ?").bind(id).run();
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
