import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAuthenticatedUser } from '$lib/server/auth';
import { mockCats, mockDB } from '$lib/server/aws/mock';
import type { FeedingOutcome } from '$lib/types';

const VALID_OUTCOMES: FeedingOutcome[] = ['dispensed', 'skipped', 'rejected'];

// ---------------------------------------------------------------------------
// GET /api/v1/cats/[catId]/events
// ---------------------------------------------------------------------------

export const GET: RequestHandler = async ({ request, params, url }) => {
    try {
        const auth = await getAuthenticatedUser(request);
        if (!auth) {
            return json(
                { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or missing session token' } },
                { status: 401 }
            );
        }

        const cat = await mockCats.findByCatId(params.catId);
        if (!cat || cat.householdId !== auth.householdId) {
            return json(
                { success: false, error: { code: 'NOT_FOUND', message: 'Cat not found' } },
                { status: 404 }
            );
        }

        const from = url.searchParams.get('from') ?? undefined;
        const to = url.searchParams.get('to') ?? undefined;
        const outcomeParam = url.searchParams.get('outcome') ?? undefined;
        const limitParam = url.searchParams.get('limit');
        const cursor = url.searchParams.get('cursor') ?? undefined;

        // Validate outcome if provided
        if (outcomeParam && !VALID_OUTCOMES.includes(outcomeParam as FeedingOutcome)) {
            return json(
                { success: false, error: { code: 'VALIDATION_ERROR', message: "outcome must be 'dispensed', 'skipped', or 'rejected'" } },
                { status: 422 }
            );
        }

        const parsed = limitParam !== null ? parseInt(limitParam, 10) : 50;
        if (isNaN(parsed) || parsed <= 0) {
            return json(
                { success: false, error: { code: 'VALIDATION_ERROR', message: 'limit must be a positive integer' } },
                { status: 422 }
            );
        }
        const limit = Math.min(parsed, 200); // cap at 200

        const events = await mockDB.getFeedingEventsFiltered(params.catId, {
            from,
            to,
            outcome: outcomeParam,
            limit,
            cursor
        });

        const nextCursor = events.length === limit ? events[events.length - 1].timestamp : null;

        return json(
            {
                success: true,
                data: {
                    events: events.map((e) => ({
                        eventId: e.eventId,
                        catId: e.catId,
                        scheduleId: e.scheduleId,
                        timestamp: e.timestamp,
                        outcome: e.outcome,
                        confidenceScore: e.confidenceScore,
                        portionDispensedGrams: e.portionDispensedGrams,
                        consumptionPercent: e.consumptionPercent,
                        foodTypeLabel: e.foodTypeLabel,
                        manualOverride: e.manualOverride
                    })),
                    nextCursor
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
