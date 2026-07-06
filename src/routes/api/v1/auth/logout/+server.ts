import { json } from '@sveltejs/kit';
import { mockSessions } from '$lib/server/aws/mock';
import { getAuthenticatedUser } from '$lib/server/auth';

export async function POST({ request }: { request: Request }) {
    try {
        const auth = await getAuthenticatedUser(request);

        if (!auth) {
            return json(
                {
                    success: false,
                    error: { code: 'UNAUTHORIZED', message: 'Invalid or missing session token' }
                },
                { status: 401 }
            );
        }

        // Delete session
        await mockSessions.deleteByToken(auth.sessionToken);

        // Clear the session_token cookie
        const clearCookie =
            'session_token=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT';

        return json(
            { success: true, data: { message: 'Session invalidated successfully' } },
            {
                status: 200,
                headers: {
                    'Set-Cookie': clearCookie
                }
            }
        );
    } catch {
        return json(
            { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
            { status: 500 }
        );
    }
}
