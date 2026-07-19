import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAuthenticatedUser } from '$lib/server/auth';
import { getCat } from '$lib/server/db/cats';
import { getSchedule } from '$lib/server/db/schedules';
import { saveFeedingEvent } from '$lib/server/db/feeding-events';
import { broadcastSSE } from '$lib/server/sse';

// ---------------------------------------------------------------------------
// POST /api/v1/cats/[catId]/events/override
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

        if (!body.scheduleId || typeof body.scheduleId !== 'string') {
            return json(
                { success: false, error: { code: 'VALIDATION_ERROR', message: 'scheduleId is required and must be a string' } },
                { status: 422 }
            );
        }

        const scheduleId = body.scheduleId;
        const schedule = await getSchedule(scheduleId);
        if (!schedule || schedule.catId !== params.catId) {
            return json(
                { success: false, error: { code: 'NOT_FOUND', message: 'Schedule not found' } },
                { status: 404 }
            );
        }

        if (typeof body.portionGrams !== 'number' || body.portionGrams <= 0) {
            return json(
                { success: false, error: { code: 'VALIDATION_ERROR', message: 'portionGrams must be a positive number' } },
                { status: 422 }
            );
        }

        const eventId = crypto.randomUUID();
        const now = new Date().toISOString();

        const event = {
            eventId,
            catId: params.catId,
            scheduleId,
            householdId: auth.householdId,
            timestamp: now,
            outcome: 'dispensed' as const,
            confidenceScore: 100,
            portionDispensedGrams: body.portionGrams,
            consumptionPercent: 100,
            manualOverride: true
        };

        await saveFeedingEvent(event);

        broadcastSSE('feeding_event', {
            eventId,
            catId: params.catId,
            catName: cat.name,
            outcome: 'dispensed',
            confidenceScore: 100,
            portionDispensedGrams: body.portionGrams,
            timestamp: now
        });

        return json(
            {
                success: true,
                data: {
                    eventId,
                    outcome: 'dispensed',
                    portionDispensedGrams: body.portionGrams,
                    manualOverride: true,
                    timestamp: now
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
