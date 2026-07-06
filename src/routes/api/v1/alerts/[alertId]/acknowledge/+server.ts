import { json } from '@sveltejs/kit';
import { mockAlerts } from '$lib/server/aws/mock';
import { getAuthenticatedUser } from '$lib/server/auth';
import { broadcastSSE } from '$lib/server/sse';

export async function PATCH({
    request,
    params
}: {
    request: Request;
    params: { alertId: string };
}) {
    try {
        const auth = await getAuthenticatedUser(request);
        if (!auth) {
            return json(
                { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or missing session token' } },
                { status: 401 }
            );
        }

        const alert = await mockAlerts.findByAlertId(params.alertId);
        if (!alert || alert.householdId !== auth.householdId) {
            return json(
                { success: false, error: { code: 'NOT_FOUND', message: 'Alert not found' } },
                { status: 404 }
            );
        }

        const acknowledgedAt = new Date().toISOString();
        const updated = await mockAlerts.update(params.alertId, {
            status: 'acknowledged',
            acknowledgedAt,
            acknowledgedBy: auth.userId
        });

        broadcastSSE('alert_dismissed', {
            alertId: params.alertId,
            acknowledgedAt,
            acknowledgedBy: auth.userId
        });

        return json(
            {
                success: true,
                data: {
                    alertId: updated!.alertId,
                    status: updated!.status,
                    acknowledgedAt: updated!.acknowledgedAt,
                    acknowledgedBy: updated!.acknowledgedBy
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
}
