import { json } from '@sveltejs/kit';
import { mockSessions } from '$lib/server/aws/mock';

export async function POST({ request }: { request: Request }) {
    // STUB: 2FA is not implemented for this hackathon demo.
    // twoFactorEnabled is always false, so this endpoint should not be reached in normal flow.
    // Accepts any valid 6-digit code and returns the user's current session.
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

        const { userId, otpCode } = body as Record<string, unknown>;

        // Validate userId
        if (!userId || typeof userId !== 'string' || userId.trim() === '') {
            return json(
                { success: false, error: { code: 'VALIDATION_ERROR', message: 'userId is required' } },
                { status: 422 }
            );
        }

        // Validate otpCode — must be exactly 6 digits
        if (!otpCode || typeof otpCode !== 'string' || !/^\d{6}$/.test(otpCode)) {
            return json(
                {
                    success: false,
                    error: { code: 'VALIDATION_ERROR', message: 'otpCode must be a 6-digit number' }
                },
                { status: 422 }
            );
        }

        // Find session for user (mock: any 6-digit code is valid)
        const sessions = await mockSessions.findAllByUserId(userId.trim());
        if (sessions.length === 0) {
            return json(
                {
                    success: false,
                    error: { code: 'UNAUTHORIZED', message: 'Invalid or missing session token' }
                },
                { status: 401 }
            );
        }

        // Return the most recent session
        const session = sessions[sessions.length - 1];

        return json(
            {
                success: true,
                data: {
                    sessionToken: session.token,
                    expiresAt: session.expiresAt
                }
            },
            { status: 200 }
        );
    } catch {
        return json(
            { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
            { status: 500 }
        );
    }
}
