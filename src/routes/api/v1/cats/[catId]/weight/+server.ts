import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAuthenticatedUser } from '$lib/server/auth';
import { getCat, updateCat } from '$lib/server/db/cats';
import { saveWeightEntry, listWeightEntries } from '$lib/server/db/weight';

// ---------------------------------------------------------------------------
// POST /api/v1/cats/[catId]/weight
// ---------------------------------------------------------------------------

export const POST: RequestHandler = async ({ request, params }) => {
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

        if (typeof body.weightKg !== 'number' || body.weightKg <= 0) {
            return json(
                { success: false, error: { code: 'VALIDATION_ERROR', message: 'weightKg must be a positive number' } },
                { status: 422 }
            );
        }

        if (typeof body.loggedAt !== 'string' || isNaN(Date.parse(body.loggedAt))) {
            return json(
                { success: false, error: { code: 'VALIDATION_ERROR', message: 'loggedAt must be a valid ISO 8601 date string' } },
                { status: 422 }
            );
        }

        const notes = body.notes !== undefined ? String(body.notes) : undefined;

        const entry = {
            weightEntryId: crypto.randomUUID(),
            catId: params.catId,
            householdId: auth.householdId,
            weightKg: body.weightKg,
            loggedAt: body.loggedAt,
            loggedBy: auth.userId,
            notes
        };

        await saveWeightEntry(entry);

        const updatedSuggestion = Math.max(20, Math.round(body.weightKg * 30));
        const now = new Date().toISOString();

        await updateCat(params.catId, {
            currentWeightKg: body.weightKg,
            suggestedPortionGrams: updatedSuggestion,
            updatedAt: now
        });

        return json(
            {
                success: true,
                data: {
                    weightEntryId: entry.weightEntryId,
                    catId: params.catId,
                    weightKg: body.weightKg,
                    loggedAt: body.loggedAt,
                    loggedBy: auth.userId,
                    notes: entry.notes,
                    updatedPortionSuggestionGrams: updatedSuggestion
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
};

// ---------------------------------------------------------------------------
// GET /api/v1/cats/[catId]/weight
// ---------------------------------------------------------------------------

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

        const entries = await listWeightEntries(params.catId);

        return json(
            {
                success: true,
                data: {
                    currentWeightKg: cat.currentWeightKg,
                    targetWeightKg: cat.targetWeightKg,
                    weightGoal: cat.weightGoal,
                    entries: entries.map((e) => ({
                        weightEntryId: e.weightEntryId,
                        weightKg: e.weightKg,
                        loggedAt: e.loggedAt,
                        notes: e.notes ?? null
                    }))
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
};
