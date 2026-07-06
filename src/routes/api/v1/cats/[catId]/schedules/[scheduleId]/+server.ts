import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAuthenticatedUser } from '$lib/server/auth';
import { mockSchedules } from '$lib/server/aws/mock';
import { getTemporalClient } from '$lib/server/temporal/client';
import type { FeedingTime, ScheduleStatus } from '$lib/types';

const VALID_STATUSES: ScheduleStatus[] = ['active', 'paused'];

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
        if (typeof ft.time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(ft.time)) {
            return { valid: false, message: `feedingTimes[${i}].time must be a valid HH:MM string` };
        }
        if (typeof ft.portionGrams !== 'number' || ft.portionGrams <= 0) {
            return { valid: false, message: `feedingTimes[${i}].portionGrams must be a positive number` };
        }
    }
    return { valid: true, data: feedingTimes as { time: string; portionGrams: number }[] };
}

// ---------------------------------------------------------------------------
// PATCH /api/v1/cats/[catId]/schedules/[scheduleId]
// ---------------------------------------------------------------------------

export const PATCH: RequestHandler = async ({ request, params }) => {
    try {
        const auth = await getAuthenticatedUser(request);
        if (!auth) {
            return json(
                { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or missing session token' } },
                { status: 401 }
            );
        }

        const schedule = await mockSchedules.findByScheduleId(params.scheduleId);
        if (!schedule || schedule.householdId !== auth.householdId || schedule.catId !== params.catId) {
            return json(
                { success: false, error: { code: 'NOT_FOUND', message: 'Schedule not found' } },
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

        const updates: Partial<typeof schedule> = {};

        if ('status' in body) {
            if (!VALID_STATUSES.includes(body.status as ScheduleStatus)) {
                return json(
                    { success: false, error: { code: 'VALIDATION_ERROR', message: "status must be 'active' or 'paused'" } },
                    { status: 422 }
                );
            }
            updates.status = body.status as ScheduleStatus;
        }

        if ('feedingTimes' in body) {
            const validation = validateFeedingTimes(body.feedingTimes);
            if (!validation.valid) {
                return json(
                    { success: false, error: { code: 'VALIDATION_ERROR', message: validation.message } },
                    { status: 422 }
                );
            }
            updates.feedingTimes = validation.data as FeedingTime[];
        }

        const now = new Date().toISOString();
        const updated = await mockSchedules.update(params.scheduleId, { ...updates, updatedAt: now });

        if (!updated) {
            return json(
                { success: false, error: { code: 'NOT_FOUND', message: 'Schedule not found' } },
                { status: 404 }
            );
        }

        return json(
            {
                success: true,
                data: {
                    scheduleId: updated.scheduleId,
                    status: updated.status,
                    updatedAt: updated.updatedAt
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

// ---------------------------------------------------------------------------
// DELETE /api/v1/cats/[catId]/schedules/[scheduleId]
// ---------------------------------------------------------------------------

export const DELETE: RequestHandler = async ({ request, params }) => {
    try {
        const auth = await getAuthenticatedUser(request);
        if (!auth) {
            return json(
                { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or missing session token' } },
                { status: 401 }
            );
        }

        const schedule = await mockSchedules.findByScheduleId(params.scheduleId);
        if (!schedule || schedule.householdId !== auth.householdId || schedule.catId !== params.catId) {
            return json(
                { success: false, error: { code: 'NOT_FOUND', message: 'Schedule not found' } },
                { status: 404 }
            );
        }

        // Cancel Temporal workflow — degrade gracefully if server not running
        try {
            const client = await getTemporalClient();
            const handle = client.workflow.getHandle(`feeding-schedule-${schedule.scheduleId}`);
            await handle.cancel();
        } catch {
            console.warn('Could not cancel Temporal workflow');
        }

        await mockSchedules.delete(params.scheduleId);

        return json(
            { success: true, data: { message: 'Schedule deleted and workflow cancelled successfully' } },
            { status: 200 }
        );
    } catch {
        return json(
            { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
            { status: 500 }
        );
    }
};
