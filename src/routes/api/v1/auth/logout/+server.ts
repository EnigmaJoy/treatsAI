import { json } from '@sveltejs/kit';
import { deleteSessionByToken } from '$lib/server/db/sessions';

const CLEAR_COOKIE =
    'session_token=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT';

export async function POST({ request }: { request: Request }) {
    // Always clear the cookie. Session deletion is best-effort - a missing or already-
    // expired session must not prevent the cookie from being removed.
    const token = getTokenFromRequest(request);

    if (token) {
        try {
            await deleteSessionByToken(token);
        } catch {
            // deleteSessionByToken already logs the error internally; swallow here so
            // the cookie is always cleared even if the store delete fails
        }
    }

    return json(
        { success: true, data: { message: 'Session invalidated successfully' } },
        { status: 200, headers: { 'Set-Cookie': CLEAR_COOKIE } }
    );
}

function getTokenFromRequest(request: Request): string | null {
    const cookieHeader = request.headers.get('cookie');
    if (!cookieHeader) return null;
    const match = cookieHeader
        .split(';')
        .map((c) => c.trim())
        .find((c) => c.startsWith('session_token='));
    return match ? decodeURIComponent(match.slice('session_token='.length)) : null;
}
