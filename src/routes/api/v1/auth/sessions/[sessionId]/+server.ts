import { json } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { listSessionsByUserId, deleteSessionBySessionId } from '$lib/server/db/sessions';
import { getAuthenticatedUser } from '$lib/server/auth';

export async function DELETE({
    request,
    params
}: {
    request: Request;
    params: { sessionId: string };
}) {
    try {
        const auth = await getAuthenticatedUser(request);

        if (!auth) {
            return json(
                { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or missing session token' } },
                { status: 401 }
            );
        }

        const { sessionId } = params;

        if (!sessionId || sessionId.trim() === '') {
            return json(
                { success: false, error: { code: 'VALIDATION_ERROR', message: 'sessionId is required' } },
                { status: 422 }
            );
        }

        const allSessions = await listSessionsByUserId(auth.userId);
        const targetSession = allSessions.find((s) => s.sessionId === sessionId);

        if (!targetSession) {
            return json(
                { success: false, error: { code: 'NOT_FOUND', message: 'Session not found' } },
                { status: 404 }
            );
        }

        const isDeletingCurrentSession = targetSession.token === auth.sessionToken;

        await deleteSessionBySessionId(sessionId, auth.userId);

        const headers: Record<string, string> = {};
        if (isDeletingCurrentSession) {
            const secure = dev ? '' : '; Secure';
            headers['Set-Cookie'] =
                `session_token=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT${secure}`;
        }

        return json(
            { success: true, data: { message: 'Session revoked successfully' } },
            { status: 200, headers }
        );
    } catch {
        return json(
            { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
            { status: 500 }
        );
    }
}
