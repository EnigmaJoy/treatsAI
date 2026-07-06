import { json } from '@sveltejs/kit';
import bcrypt from 'bcryptjs';
import { mockUsers, mockHouseholds } from '$lib/server/aws/mock';
import type { User, Household, Language } from '$lib/types';

const VALID_LANGUAGES: Language[] = ['en', 'it', 'es'];

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

        const { email, password, language } = body as Record<string, unknown>;

        // Validate email
        if (!email || typeof email !== 'string' || email.trim() === '') {
            return json(
                { success: false, error: { code: 'VALIDATION_ERROR', message: 'Email is required' } },
                { status: 422 }
            );
        }

        // Validate password
        if (!password || typeof password !== 'string' || password.length < 8) {
            return json(
                {
                    success: false,
                    error: { code: 'VALIDATION_ERROR', message: 'Password must be at least 8 characters' }
                },
                { status: 422 }
            );
        }

        // Validate language
        if (!language || !VALID_LANGUAGES.includes(language as Language)) {
            return json(
                {
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: "Language must be one of: 'en', 'it', 'es'"
                    }
                },
                { status: 422 }
            );
        }

        // Normalize email and check it's not already taken
        const normalizedEmail = email.trim().toLowerCase();
        const existingUser = await mockUsers.findByEmail(normalizedEmail);
        if (existingUser) {
            return json(
                { success: false, error: { code: 'VALIDATION_ERROR', message: 'Email is already registered' } },
                { status: 422 }
            );
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        const now = new Date().toISOString();
        const userId = crypto.randomUUID();
        const householdId = crypto.randomUUID();

        // Create Household
        const household: Household = {
            householdId,
            primaryOwnerId: userId,
            createdAt: now
        };
        await mockHouseholds.create(household);

        // Create User (store with passwordHash)
        const userRecord: User & { passwordHash: string } = {
            userId,
            email: normalizedEmail,
            role: 'primary_owner',
            householdId,
            language: language as Language,
            twoFactorEnabled: false,
            sessionPolicy: 'standard',
            createdAt: now,
            updatedAt: now,
            passwordHash
        };
        await mockUsers.create(userRecord);

        return json(
            {
                success: true,
                data: {
                    userId,
                    email: normalizedEmail,
                    householdId,
                    language,
                    createdAt: now
                }
            },
            { status: 201 }
        );
    } catch {
        return json(
            { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
            { status: 500 }
        );
    }
}
