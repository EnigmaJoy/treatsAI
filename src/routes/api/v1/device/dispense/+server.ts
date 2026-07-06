import { json } from '@sveltejs/kit';
import { mockDB, mockCats, mockDevices } from '$lib/server/aws/mock';
import { getAuthenticatedUser } from '$lib/server/auth';
import { broadcastSSE } from '$lib/server/sse';
import type { FeedingEvent } from '$lib/types';

export async function POST({ request }: { request: Request }) {
    try {
        const auth = await getAuthenticatedUser(request);
        if (!auth) {
            return json(
                { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or missing session token' } },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { catId, portionGrams } = body;

        if (!catId || typeof portionGrams !== 'number' || portionGrams <= 0) {
            return json(
                { success: false, error: { code: 'VALIDATION_ERROR', message: 'catId is required and portionGrams must be a positive number' } },
                { status: 422 }
            );
        }

        const cat = await mockCats.findByCatId(catId);
        if (!cat || cat.householdId !== auth.householdId) {
            return json(
                { success: false, error: { code: 'NOT_FOUND', message: 'Cat not found' } },
                { status: 404 }
            );
        }

        const now = new Date().toISOString();
        const eventId = crypto.randomUUID();

        const event: FeedingEvent = {
            eventId,
            catId,
            scheduleId: 'manual',
            householdId: auth.householdId,
            timestamp: now,
            outcome: 'dispensed',
            confidenceScore: 100,
            portionDispensedGrams: portionGrams,
            consumptionPercent: 100,
            manualOverride: true
        };

        await mockDB.putFeedingEvent(event);

        // Update device's lastDispenseAt
        const device = await mockDevices.get(auth.householdId);
        if (device) {
            await mockDevices.upsert({ ...device, lastDispenseAt: now, updatedAt: now });
        }

        broadcastSSE('feeding_event', {
            eventId,
            catId,
            catName: cat.name,
            outcome: 'dispensed',
            confidenceScore: 100,
            portionDispensedGrams: portionGrams,
            timestamp: now
        });

        return json(
            {
                success: true,
                data: {
                    eventId,
                    outcome: 'dispensed',
                    portionDispensedGrams: portionGrams,
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
}
