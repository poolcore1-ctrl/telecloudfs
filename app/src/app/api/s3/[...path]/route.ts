import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    // /api/s3/[folderId]/[messageId]
    const folderId = pathParts[2];
    const messageId = pathParts[3];

    if (!folderId || !messageId) {
        return NextResponse.json({
            usage: '/api/s3/{folderId}/{messageId}',
            example: '/api/s3/home/123456789?apiKey=your-key',
        });
    }

    // This route redirects to the rich UI bridge or handles direct data if apiKey is present
    // For now, we maintain the bridge logic but redirect to the new Page
    const apiKey = request.headers.get('Authorization') || url.searchParams.get('apiKey');
    
    if (!apiKey) {
        // Redirect to the rich UI page
        return NextResponse.redirect(new URL(`/s3/${folderId}/${messageId}`, request.url));
    }

    // Logic for API access with key would go here (server-side streaming)
    // Currently, it still relies on the browser bridge for most cases.
    return NextResponse.json({ error: "Direct API access without bridge requires server-side GramJS (not implemented)" }, { status: 501 });
}

export async function HEAD() {
    return new Response(null, {
        status: 200,
        headers: {
            'Content-Type': 'application/octet-stream',
            'Accept-Ranges': 'bytes'
        }
    });
}
