import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAuthenticatedUser } from '$lib/server/auth';
import { getCat, updateCat, deleteCat } from '$lib/server/db/cats';
import { getProfilePhotoUrl } from '$lib/server/aws/s3';
import type { WeightGoal } from '$lib/types';

const VALID_WEIGHT_GOALS: WeightGoal[] = ['weight_loss', 'maintenance', 'weight_gain'];
const VALID_REMINDER_INTERVALS = [3, 7, 14];

export const GET: RequestHandler = async ({ request, params }) => {
    try {
        const auth = await getAuthenticatedUser(request);
        if (!auth) {
            return json(
                { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or missing session token' } },
                { status: 401 }
            );
        }

        const cat = await getCat(params.catId);
        if (!cat || cat.householdId !== auth.householdId) {
            return json(
                { success: false, error: { code: 'NOT_FOUND', message: 'Cat not found' } },
                { status: 404 }
            );
        }

        // Deduplicate keys before processing - DynamoDB records may contain duplicates
        // from a prior bug where the same key was appended more than once.
        cat.photoS3Keys = [...new Set(cat.photoS3Keys ?? [])];

        // Generate profile photo URL (1-hour expiry, used across multiple pages)
        const profilePhotoUrl = await getProfilePhotoUrl(cat);

        // Generate proxy URLs for the thumbnail picker.
        // Routing through the SvelteKit server avoids S3 CORS restrictions when the
        // browser would otherwise be making a cross-origin request to S3 directly.
        const photoUrls = cat.photoS3Keys.map((key) => ({
            key,
            url: `/api/v1/cats/${params.catId}/photo/${key}`
        }));

        const seen = new Set<string>();
        const uniqueUrls = (photoUrls ?? []).filter(p => {
            if (!p.url || !p.key || seen.has(p.key)) return false;
            seen.add(p.key);
            return true;
        });

        return json({ success: true, data: { ...cat, profilePhotoUrl, photoUrls: uniqueUrls } }, { status: 200 });
    } catch {
        return json(
            { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
            { status: 500 }
        );
    }
};

export const PATCH: RequestHandler = async ({ request, params }) => {
    try {
        const auth = await getAuthenticatedUser(request);
        if (!auth) {
            return json(
                { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or missing session token' } },
                { status: 401 }
            );
        }

        const cat = await getCat(params.catId);
        if (!cat || cat.householdId !== auth.householdId) {
            return json(
                { success: false, error: { code: 'NOT_FOUND', message: 'Cat not found' } },
                { status: 404 }
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

        const updates: Partial<typeof cat> = {};

        if ('breed' in body) {
            if (body.breed !== undefined && body.breed !== null && typeof body.breed !== 'string') {
                return json(
                    { success: false, error: { code: 'VALIDATION_ERROR', message: 'breed must be a string' } },
                    { status: 422 }
                );
            }
            updates.breed = (body.breed as string | undefined) ?? undefined;
        }

        if ('dateOfBirth' in body) {
            if (body.dateOfBirth !== undefined && body.dateOfBirth !== null && typeof body.dateOfBirth !== 'string') {
                return json(
                    { success: false, error: { code: 'VALIDATION_ERROR', message: 'dateOfBirth must be a string' } },
                    { status: 422 }
                );
            }
            updates.dateOfBirth = (body.dateOfBirth as string | undefined) ?? undefined;
        }

        if ('name' in body) {
            if (typeof body.name !== 'string' || body.name.trim() === '') {
                return json(
                    { success: false, error: { code: 'VALIDATION_ERROR', message: 'name must be a non-empty string' } },
                    { status: 422 }
                );
            }
            updates.name = body.name.trim();
        }

        if ('currentWeightKg' in body) {
            if (typeof body.currentWeightKg !== 'number' || body.currentWeightKg <= 0) {
                return json(
                    { success: false, error: { code: 'VALIDATION_ERROR', message: 'currentWeightKg must be a positive number' } },
                    { status: 422 }
                );
            }
            updates.currentWeightKg = body.currentWeightKg;
        }

        if ('weightGoal' in body) {
            if (!VALID_WEIGHT_GOALS.includes(body.weightGoal as WeightGoal)) {
                return json(
                    { success: false, error: { code: 'VALIDATION_ERROR', message: "weightGoal must be 'weight_loss', 'maintenance', or 'weight_gain'" } },
                    { status: 422 }
                );
            }
            updates.weightGoal = body.weightGoal as WeightGoal;
        }

        if ('targetWeightKg' in body) {
            if (body.targetWeightKg !== undefined && body.targetWeightKg !== null) {
                if (typeof body.targetWeightKg !== 'number' || body.targetWeightKg <= 0) {
                    return json(
                        { success: false, error: { code: 'VALIDATION_ERROR', message: 'targetWeightKg must be a positive number' } },
                        { status: 422 }
                    );
                }
            }
            updates.targetWeightKg = body.targetWeightKg as number | undefined;
        }

        if ('consumptionBaseline' in body) {
            if (typeof body.consumptionBaseline !== 'number' || body.consumptionBaseline <= 0) {
                return json(
                    { success: false, error: { code: 'VALIDATION_ERROR', message: 'consumptionBaseline must be a positive number' } },
                    { status: 422 }
                );
            }
            updates.consumptionBaseline = body.consumptionBaseline;
        }

        if ('weightReminderInterval' in body) {
            if (!VALID_REMINDER_INTERVALS.includes(body.weightReminderInterval as number)) {
                return json(
                    { success: false, error: { code: 'VALIDATION_ERROR', message: 'weightReminderInterval must be 3, 7, or 14' } },
                    { status: 422 }
                );
            }
            updates.weightReminderInterval = body.weightReminderInterval as 3 | 7 | 14;
        }

        if (body.microchipNumber !== undefined) {
            if (typeof body.microchipNumber !== 'string') {
                return json(
                    { success: false, error: { code: 'VALIDATION_ERROR', message: 'microchipNumber must be a string' } },
                    { status: 422 }
                );
            }
            updates.microchipNumber = body.microchipNumber;
        }

        if ('profilePhotoKey' in body) {
            if (body.profilePhotoKey !== null && body.profilePhotoKey !== undefined && typeof body.profilePhotoKey !== 'string') {
                return json(
                    { success: false, error: { code: 'VALIDATION_ERROR', message: 'profilePhotoKey must be a string' } },
                    { status: 422 }
                );
            }
            if (body.profilePhotoKey && !cat.photoS3Keys.includes(body.profilePhotoKey as string)) {
                return json(
                    { success: false, error: { code: 'VALIDATION_ERROR', message: 'profilePhotoKey must be one of the cat\'s uploaded photo keys' } },
                    { status: 422 }
                );
            }
            updates.profilePhotoKey = (body.profilePhotoKey as string | null | undefined) ?? undefined;
        }

        const now = new Date().toISOString();

        const updated = await updateCat(params.catId, { ...updates, updatedAt: now });
        if (!updated) {
            return json(
                { success: false, error: { code: 'NOT_FOUND', message: 'Cat not found' } },
                { status: 404 }
            );
        }

        return json({ success: true, data: { catId: params.catId, updatedAt: now } }, { status: 200 });
    } catch {
        return json(
            { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
            { status: 500 }
        );
    }
};

export const DELETE: RequestHandler = async ({ request, params }) => {
    try {
        const auth = await getAuthenticatedUser(request);
        if (!auth) {
            return json(
                { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or missing session token' } },
                { status: 401 }
            );
        }

        const cat = await getCat(params.catId);
        if (!cat || cat.householdId !== auth.householdId) {
            return json(
                { success: false, error: { code: 'NOT_FOUND', message: 'Cat not found' } },
                { status: 404 }
            );
        }

        await deleteCat(params.catId);

        return json(
            { success: true, data: { message: 'Cat profile and all associated data deleted successfully' } },
            { status: 200 }
        );
    } catch {
        return json(
            { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
            { status: 500 }
        );
    }
};
