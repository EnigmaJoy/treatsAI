import { json } from '@sveltejs/kit';
import { dev } from '$app/environment';
import bcrypt from 'bcryptjs';
import { getUserByEmail } from '$lib/server/db/users';
import { putSession } from '$lib/server/db/sessions';

export async function POST({ request }: { request: Request }) {
    try {
        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return json(
                { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid JSON body' } },
                { status: 422 }
            );
        }

        const { email, password, rememberMe } = body as Record<string, unknown>;

        if (!email || typeof email !== 'string' || email.trim() === '') {
            return json(
                { success: false, error: { code: 'VALIDATION_ERROR', message: 'Email is required' } },
                { status: 422 }
            );
        }

        if (!password || typeof password !== 'string') {
            return json(
                { success: false, error: { code: 'VALIDATION_ERROR', message: 'Password is required' } },
                { status: 422 }
            );
        }

        const user = await getUserByEmail(email.trim().toLowerCase());
        if (!user) {
            return json(
                { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid email or password' } },
                { status: 401 }
            );
        }

        if (!user.passwordHash) {
            return json(
                { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid email or password' } },
                { status: 401 }
            );
        }

        const passwordMatch = await bcrypt.compare(password, user.passwordHash);
        if (!passwordMatch) {
            return json(
                { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid email or password' } },
                { status: 401 }
            );
        }

        const sessionToken = crypto.randomUUID();
        const now = new Date();
        const shouldRemember = rememberMe === true;

        const expiresAt = new Date(
            now.getTime() + (shouldRemember ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000)
        ).toISOString();

        await putSession({
            sessionId: crypto.randomUUID(),
            userId: user.userId,
            householdId: user.householdId,
            token: sessionToken,
            createdAt: now.toISOString(),
            expiresAt,
            userAgent: request.headers.get('user-agent') ?? undefined
        });

        const maxAge = shouldRemember ? 7 * 24 * 60 * 60 : 24 * 60 * 60;
        const secure = dev ? '' : '; Secure';
        const cookieHeader = `session_token=${encodeURIComponent(sessionToken)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`;

        return json(
            {
                success: true,
                data: {
                    sessionToken,
                    expiresAt,
                    twoFactorRequired: false,
                    userId: user.userId
                }
            },
            { status: 200, headers: { 'Set-Cookie': cookieHeader } }
        );
    } catch (err) {
        console.error('[login] unhandled error:', err);
        return json(
            { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
            { status: 500 }
        );
    }
}
