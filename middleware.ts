import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname;

    // Protected routes
    if (path.startsWith('/private')) {
        const authCookie = request.cookies.get('auth_session');

        if (!authCookie) {
            return NextResponse.redirect(new URL('/login', request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/private/:path*'],
};
