import { json } from '@sveltejs/kit';
import { listSessionsByUserId } from '$lib/server/db/sessions';
import { getAuthenticatedUser } from '$lib/server/auth';

export async function GET({ request }: { request: Request }) {
    try {
        const auth = await getAuthenticatedUser(request);

        if (!auth) {
            return json(
                { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or missing session token' } },
                { status: 401 }
            );
        }

        const sessions = await listSessionsByUserId(auth.userId);

        const sessionList = sessions.map((s) => ({
            sessionId: s.sessionId,
            createdAt: s.createdAt,
            expiresAt: s.expiresAt,
            userAgent: s.userAgent ?? '',
            current: s.token === auth.sessionToken
        }));

        return json({ success: true, data: { sessions: sessionList } }, { status: 200 });
    } catch {
        return json(
            { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
            { status: 500 }
        );
    }
}
