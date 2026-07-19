import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAuthenticatedUser } from '$lib/server/auth';
import { getCat } from '$lib/server/db/cats';
import { saveSchedule, listSchedules } from '$lib/server/db/schedules';
import { getTemporalClient, TASK_QUEUE } from '$lib/server/temporal/client';
import type { FeedingTime } from '$lib/types';

// ---------------------------------------------------------------------------
// Validation helper
// ---------------------------------------------------------------------------

function validateFeedingTimes(
    feedingTimes: unknown
): { valid: true; data: { time: string; portionGrams: number }[] } | { valid: false; message: string } {
    if (!Array.isArray(feedingTimes) || feedingTimes.length === 0) {
        return { valid: false, message: 'feedingTimes must be a non-empty array' };
    }
    for (let i = 0; i < feedingTimes.length; i++) {
        const ft = feedingTimes[i];
        if (typeof ft !== 'object' || ft === null) {
            return { valid: false, message: `feedingTimes[${i}] must be an object` };
        }
        if (typeof ft.time !== 'string' || !/^\d{2}:\d{2}$/.test(ft.time)) {
            return { valid: false, message: `feedingTimes[${i}].time must be a valid HH:MM string` };
        }
        if (typeof ft.portionGrams !== 'number' || ft.portionGrams <= 0) {
            return { valid: false, message: `feedingTimes[${i}].portionGrams must be a positive number` };
        }
    }
    return { valid: true, data: feedingTimes as { time: string; portionGrams: number }[] };
}

// ---------------------------------------------------------------------------
// POST /api/v1/cats/[catId]/schedules
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

        const validation = validateFeedingTimes(body.feedingTimes);
        if (!validation.valid) {
            return json(
                { success: false, error: { code: 'VALIDATION_ERROR', message: validation.message } },
                { status: 422 }
            );
        }

        const rawTimes = validation.data;
        const suggestedPerFeeding = Math.round(
            (cat.suggestedPortionGrams ?? cat.consumptionBaseline) / rawTimes.length
        );

        const enrichedTimes: FeedingTime[] = rawTimes.map((ft) => ({
            time: ft.time,
            portionGrams: ft.portionGrams,
            suggestedPortionGrams: suggestedPerFeeding
        }));

        const scheduleId = crypto.randomUUID();
        const now = new Date().toISOString();
        const temporalWorkflowId = `feeding-schedule-${scheduleId}`;

        const schedule = {
            scheduleId,
            catId: params.catId,
            householdId: auth.householdId,
            feedingTimes: enrichedTimes,
            status: 'active' as const,
            temporalWorkflowId,
            createdAt: now,
            updatedAt: now
        };

        await saveSchedule(schedule);

        // Start Temporal workflow — degrade gracefully if server not running
        try {
            const client = await getTemporalClient();
            await client.workflow.start('FeedingScheduleWorkflow', {
                taskQueue: TASK_QUEUE,
                workflowId: temporalWorkflowId,
                args: [{ catId: params.catId, scheduleId, householdId: auth.householdId, feedingTimes: enrichedTimes }]
            });
        } catch {
            console.warn('Temporal not available, schedule created without workflow');
        }

        return json({ success: true, data: schedule }, { status: 201 });
    } catch {
        return json(
            { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
            { status: 500 }
        );
    }
};

// ---------------------------------------------------------------------------
// GET /api/v1/cats/[catId]/schedules
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

        const schedules = await listSchedules(params.catId);

        return json(
            {
                success: true,
                data: {
                    schedules: schedules.map((s) => ({
                        scheduleId: s.scheduleId,
                        feedingTimes: s.feedingTimes,
                        status: s.status,
                        createdAt: s.createdAt
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
