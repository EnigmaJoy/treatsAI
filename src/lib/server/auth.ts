import { getSessionByToken, deleteSessionByToken } from '$lib/server/db/sessions';

export async function getAuthenticatedUser(
    request: Request
): Promise<{ userId: string; householdId: string; sessionToken: string } | null> {
    // Try Authorization header first: "Bearer <token>"
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ')
        ? authHeader.slice(7)
        : getCookieFromRequest(request, 'session_token');

    if (!token) return null;

    // Look up session in DynamoDB so auth survives dev server restarts
    const session = await getSessionByToken(token);
    if (!session) return null;

    if (new Date(session.expiresAt) < new Date()) {
        await deleteSessionByToken(token);
        return null;
    }

    return { userId: session.userId, householdId: session.householdId, sessionToken: token };
}

function getCookieFromRequest(request: Request, name: string): string | null {
    const cookieHeader = request.headers.get('cookie');
    if (!cookieHeader) return null;
    const match = cookieHeader
        .split(';')
        .map((c) => c.trim())
        .find((c) => c.startsWith(name + '='));
    return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}
