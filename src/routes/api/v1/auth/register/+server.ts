import { json } from '@sveltejs/kit';
import bcrypt from 'bcryptjs';
import { mockUsers, mockHouseholds, mockCats, mockSchedules } from '$lib/server/aws/mock';
import type { User, Household, Cat, Schedule, Language, WeightGoal } from '$lib/types';

const VALID_LANGUAGES: Language[] = ['en', 'it', 'es'];

interface CatInput {
    name: string;
    breed?: string;
    dateOfBirth?: string;
    currentWeightKg: number;
    targetWeightKg?: number;
    weightGoal: WeightGoal;
    consumptionBaseline: number;
    weightReminderInterval: number;
    microchipNumber?: string;
}

interface ScheduleInput {
    feedingTimes: Array<{ time: string; portionGrams: number }>;
    foodType?: string;
}

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

        // Destructure known fields - extra fields are ignored
        const { email, password, language, cat, schedule } = body as Record<string, unknown>;

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
        const normalizedEmail = (email as string).trim().toLowerCase();
        const existingUser = await mockUsers.findByEmail(normalizedEmail);
        if (existingUser) {
            return json(
                { success: false, error: { code: 'VALIDATION_ERROR', message: 'Email is already registered' } },
                { status: 422 }
            );
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password as string, 10);

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

        // Create Cat if included in the onboarding payload
        let catId: string | undefined;
        if (cat && typeof cat === 'object') {
            const catInput = cat as CatInput;
            catId = crypto.randomUUID();
            const catRecord: Cat = {
                catId,
                householdId,
                name: catInput.name,
                breed: catInput.breed,
                dateOfBirth: catInput.dateOfBirth,
                currentWeightKg: catInput.currentWeightKg,
                targetWeightKg: catInput.targetWeightKg,
                weightGoal: catInput.weightGoal,
                consumptionBaseline: catInput.consumptionBaseline,
                photoS3Keys: [],
                rekognitionCollectionId: `household-${householdId}`,
                microchipNumber: catInput.microchipNumber,
                weightReminderInterval: catInput.weightReminderInterval as 3 | 7 | 14,
                createdAt: now,
                updatedAt: now
            };
            await mockCats.create(catRecord);

            // Create Schedule if included alongside the cat
            if (schedule && typeof schedule === 'object') {
                const scheduleInput = schedule as ScheduleInput;
                const scheduleRecord: Schedule = {
                    scheduleId: crypto.randomUUID(),
                    catId,
                    householdId,
                    feedingTimes: scheduleInput.feedingTimes,
                    status: 'active',
                    temporalWorkflowId: `mock-workflow-${crypto.randomUUID()}`,
                    createdAt: now,
                    updatedAt: now
                };
                await mockSchedules.create(scheduleRecord);
            }
        }

        return json(
            {
                success: true,
                data: {
                    userId,
                    email: normalizedEmail,
                    householdId,
                    language,
                    catId,
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
