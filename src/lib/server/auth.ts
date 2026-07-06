import { mockSessions } from '$lib/server/aws/mock';

export async function getAuthenticatedUser(
    request: Request
): Promise<{ userId: string; householdId: string; sessionToken: string } | null> {
    // 1. Try Authorization header first: "Bearer <token>"
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ')
        ? authHeader.slice(7)
        : getCookieFromRequest(request, 'session_token');

    if (!token) return null;

    const session = await mockSessions.findByToken(token);
    if (!session) return null;

    // Check expiry
    if (new Date(session.expiresAt) < new Date()) {
        await mockSessions.deleteByToken(token);
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
