import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { SESSION_COOKIE, verifySessionToken } from '@/utils/session';

export async function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname;

    // The login endpoint must stay reachable without a session.
    if (path === '/api/auth/login') return NextResponse.next();

    const authorized = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
    if (authorized) return NextResponse.next();

    if (path.startsWith('/api/')) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
}

// Private tools: the notes/journal area, the paper and task trackers, and every API route
// (the AI routes spend API credits and the tag routes write to the database).
export const config = {
    matcher: ['/private/:path*', '/papers/:path*', '/tasks/:path*', '/api/:path*'],
};
