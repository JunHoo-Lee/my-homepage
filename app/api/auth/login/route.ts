import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { SESSION_COOKIE, SESSION_TTL_SECONDS, createSessionToken, passwordMatches } from '@/utils/session';

export async function POST(request: Request) {
    const body = await request.json().catch(() => ({}));

    // Refuse to log anyone in when PRIVATE_PASSWORD is not configured.
    if (!process.env.PRIVATE_PASSWORD || !(await passwordMatches(body?.password))) {
        return NextResponse.json({ success: false }, { status: 401 });
    }

    const token = await createSessionToken();
    if (!token) return NextResponse.json({ success: false }, { status: 500 });

    (await cookies()).set(SESSION_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: SESSION_TTL_SECONDS,
        path: '/',
    });
    return NextResponse.json({ success: true });
}
