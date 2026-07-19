import { json } from '@sveltejs/kit';
import bcrypt from 'bcryptjs';
import { saveUser, getUserByEmail } from '$lib/server/db/users';
import { saveHousehold } from '$lib/server/db/households';
import { saveCat } from '$lib/server/db/cats';
import { saveSchedule } from '$lib/server/db/schedules';
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

        const { email, password, language, cat, schedule } = body as Record<string, unknown>;

        if (!email || typeof email !== 'string' || email.trim() === '') {
            return json(
                { success: false, error: { code: 'VALIDATION_ERROR', message: 'Email is required' } },
                { status: 422 }
            );
        }

        if (!password || typeof password !== 'string' || password.length < 8) {
            return json(
                { success: false, error: { code: 'VALIDATION_ERROR', message: 'Password must be at least 8 characters' } },
                { status: 422 }
            );
        }

        if (!language || !VALID_LANGUAGES.includes(language as Language)) {
            return json(
                { success: false, error: { code: 'VALIDATION_ERROR', message: "Language must be one of: 'en', 'it', 'es'" } },
                { status: 422 }
            );
        }

        const normalizedEmail = (email as string).trim().toLowerCase();
        const existingUser = await getUserByEmail(normalizedEmail);
        if (existingUser) {
            return json(
                { success: false, error: { code: 'CONFLICT', message: 'Email is already registered' } },
                { status: 409 }
            );
        }

        const passwordHash = await bcrypt.hash(password as string, 10);

        const now = new Date().toISOString();
        const userId = crypto.randomUUID();
        const householdId = crypto.randomUUID();

        const household: Household = {
            householdId,
            primaryOwnerId: userId,
            createdAt: now
        };
        await saveHousehold(household);

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
        await saveUser(userRecord);

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
            await saveCat(catRecord);

            if (schedule && typeof schedule === 'object') {
                const scheduleInput = schedule as ScheduleInput;
                const scheduleRecord: Schedule = {
                    scheduleId: crypto.randomUUID(),
                    catId,
                    householdId,
                    feedingTimes: scheduleInput.feedingTimes,
                    status: 'active',
                    temporalWorkflowId: `workflow-${crypto.randomUUID()}`,
                    createdAt: now,
                    updatedAt: now
                };
                await saveSchedule(scheduleRecord);
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
    } catch (err) {
        console.error('[register] unhandled error:', err);
        return json(
            { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
            { status: 500 }
        );
    }
}
