import { NextRequest, NextResponse } from 'next/server';

// The ops portal runs with the Supabase service role key, so nothing in it may be reachable
// without a login. Basic auth against OPS_USER / OPS_PASSWORD; if they are not set, refuse everything.

function unauthorized() {
    return new NextResponse('Authentication required', {
        status: 401,
        headers: { 'WWW-Authenticate': 'Basic realm="CounterDraft Ops", charset="UTF-8"' },
    });
}

// Constant-time compare so the password can't be guessed one character at a time
function safeEqual(a: string, b: string): boolean {
    const enc = new TextEncoder();
    const x = enc.encode(a);
    const y = enc.encode(b);
    let diff = x.length ^ y.length;
    for (let i = 0; i < Math.max(x.length, y.length); i++) {
        diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
    }
    return diff === 0;
}

export function proxy(req: NextRequest) {
    const user = process.env.OPS_USER;
    const password = process.env.OPS_PASSWORD;

    if (!user || !password) {
        return new NextResponse('Ops portal is locked: set OPS_USER and OPS_PASSWORD.', { status: 503 });
    }

    const header = req.headers.get('authorization') || '';
    if (!header.startsWith('Basic ')) return unauthorized();

    let decoded = '';
    try {
        decoded = atob(header.slice(6));
    } catch {
        return unauthorized();
    }
    const sep = decoded.indexOf(':');
    if (sep < 0) return unauthorized();

    const okUser = safeEqual(decoded.slice(0, sep), user);
    const okPassword = safeEqual(decoded.slice(sep + 1), password);
    if (!okUser || !okPassword) return unauthorized();

    return NextResponse.next();
}

export const config = {
    // Everything, including API routes and server actions; only Next.js static assets are skipped
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
