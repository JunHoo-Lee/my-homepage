// Signed session cookie for the private area. Works in both the Edge (middleware) and Node (route handler) runtimes.
const encoder = new TextEncoder();

export const SESSION_COOKIE = 'auth_session';
export const SESSION_TTL_SECONDS = 60 * 60;

function sessionSecret(): string | null {
    return process.env.SESSION_SECRET || process.env.PRIVATE_PASSWORD || null;
}

async function hmacHex(message: string, secret: string): Promise<string> {
    const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
    return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('');
}

function equalStrings(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
}

export async function createSessionToken(): Promise<string | null> {
    const secret = sessionSecret();
    if (!secret) return null;
    const expires = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
    return `${expires}.${await hmacHex(String(expires), secret)}`;
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
    const secret = sessionSecret();
    if (!secret || !token) return false;
    const [expires, sig] = token.split('.');
    if (!expires || !sig || !/^\d+$/.test(expires)) return false;
    if (Number(expires) < Math.floor(Date.now() / 1000)) return false;
    return equalStrings(sig, await hmacHex(expires, secret));
}

// Compares a submitted password with PRIVATE_PASSWORD without leaking length or prefix timing.
export async function passwordMatches(candidate: unknown): Promise<boolean> {
    const expected = process.env.PRIVATE_PASSWORD;
    if (!expected || typeof candidate !== 'string' || candidate.length === 0) return false;
    const salt = 'private-login';
    return equalStrings(await hmacHex(candidate, salt + expected), await hmacHex(expected, salt + expected));
}
