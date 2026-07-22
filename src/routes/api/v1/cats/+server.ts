import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAuthenticatedUser } from '$lib/server/auth';
import { saveCat, listCats } from '$lib/server/db/cats';
import type { Cat, WeightGoal } from '$lib/types';

const VALID_WEIGHT_GOALS: WeightGoal[] = ['weight_loss', 'maintenance', 'weight_gain'];
const VALID_REMINDER_INTERVALS = [3, 7, 14];

export const POST: RequestHandler = async ({ request }) => {
    try {
        const auth = await getAuthenticatedUser(request);
        if (!auth) {
            return json(
                { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or missing session token' } },
                { status: 401 }
            );
        }

        let body: Record<string, unknown>;
        try {
            body = await request.json();
        } catch {
            return json(
                { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid JSON body' } },
                { status: 422 }
            );
        }

        const { name, dateOfBirth, breed, currentWeightKg, weightGoal, targetWeightKg, consumptionBaseline, weightReminderInterval } = body as {
            name?: unknown;
            dateOfBirth?: unknown;
            breed?: unknown;
            currentWeightKg?: unknown;
            weightGoal?: unknown;
            targetWeightKg?: unknown;
            consumptionBaseline?: unknown;
            weightReminderInterval?: unknown;
        };

        if (!name || typeof name !== 'string' || name.trim() === '') {
            return json(
                { success: false, error: { code: 'VALIDATION_ERROR', message: 'name is required' } },
                { status: 422 }
            );
        }

        if (typeof currentWeightKg !== 'number' || currentWeightKg <= 0) {
            return json(
                { success: false, error: { code: 'VALIDATION_ERROR', message: 'currentWeightKg must be a positive number' } },
                { status: 422 }
            );
        }

        if (!weightGoal || !VALID_WEIGHT_GOALS.includes(weightGoal as WeightGoal)) {
            return json(
                { success: false, error: { code: 'VALIDATION_ERROR', message: "weightGoal must be 'weight_loss', 'maintenance', or 'weight_gain'" } },
                { status: 422 }
            );
        }

        if (targetWeightKg !== undefined && targetWeightKg !== null) {
            if (typeof targetWeightKg !== 'number' || targetWeightKg <= 0) {
                return json(
                    { success: false, error: { code: 'VALIDATION_ERROR', message: 'targetWeightKg must be a positive number' } },
                    { status: 422 }
                );
            }
        }

        if (consumptionBaseline !== undefined) {
            if (typeof consumptionBaseline !== 'number' || consumptionBaseline <= 0) {
                return json(
                    { success: false, error: { code: 'VALIDATION_ERROR', message: 'consumptionBaseline must be a positive number' } },
                    { status: 422 }
                );
            }
        }

        if (dateOfBirth !== undefined && typeof dateOfBirth !== 'string') {
            return json(
                { success: false, error: { code: 'VALIDATION_ERROR', message: 'dateOfBirth must be a string' } },
                { status: 422 }
            );
        }

        if (breed !== undefined && typeof breed !== 'string') {
            return json(
                { success: false, error: { code: 'VALIDATION_ERROR', message: 'breed must be a string' } },
                { status: 422 }
            );
        }

        const resolvedInterval = weightReminderInterval ?? 7;
        if (!VALID_REMINDER_INTERVALS.includes(resolvedInterval as number)) {
            return json(
                { success: false, error: { code: 'VALIDATION_ERROR', message: 'weightReminderInterval must be 3, 7, or 14' } },
                { status: 422 }
            );
        }

        const now = new Date().toISOString();
        const cat = {
            catId: crypto.randomUUID(),
            householdId: auth.householdId,
            name: name.trim(),
            dateOfBirth: dateOfBirth as string | undefined,
            breed: breed as string | undefined,
            currentWeightKg,
            targetWeightKg: (targetWeightKg as number | null | undefined) ?? undefined,
            weightGoal: weightGoal as WeightGoal,
            consumptionBaseline: (consumptionBaseline as number | undefined) ?? 100,
            suggestedPortionGrams: Math.round(currentWeightKg * 30),
            photoS3Keys: [] as string[],
            rekognitionCollectionId: crypto.randomUUID(),
            microchipNumber: undefined as string | undefined,
            weightReminderInterval: resolvedInterval as 3 | 7 | 14,
            createdAt: now,
            updatedAt: now
        };

        const created = await saveCat(cat as Cat);

        return json({
            success: true,
            data: {
                catId: created.catId,
                householdId: created.householdId,
                name: created.name,
                dateOfBirth: created.dateOfBirth ?? null,
                breed: created.breed ?? null,
                currentWeightKg: created.currentWeightKg,
                weightGoal: created.weightGoal,
                targetWeightKg: created.targetWeightKg ?? null,
                consumptionBaseline: created.consumptionBaseline,
                weightReminderInterval: created.weightReminderInterval,
                rekognitionCollectionId: created.rekognitionCollectionId,
                createdAt: created.createdAt
            }
        }, { status: 201 });
    } catch {
        return json(
            { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
            { status: 500 }
        );
    }
};

export const GET: RequestHandler = async ({ request }) => {
    try {
        const auth = await getAuthenticatedUser(request);
        if (!auth) {
            return json(
                { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or missing session token' } },
                { status: 401 }
            );
        }

        const cats = await listCats(auth.householdId);

        const mapped = cats.map((c) => ({
            catId: c.catId,
            householdId: c.householdId,
            name: c.name,
            currentWeightKg: c.currentWeightKg,
            weightGoal: c.weightGoal,
            consumptionBaseline: c.consumptionBaseline,
            createdAt: c.createdAt
        }));

        return json({ success: true, data: { cats: mapped } }, { status: 200 });
    } catch (err) {
        console.error('[GET /api/v1/cats] unhandled error:', err);
        return json(
            { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
            { status: 500 }
        );
    }
};
