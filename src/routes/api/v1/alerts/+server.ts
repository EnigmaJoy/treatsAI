import { json } from '@sveltejs/kit';
import { mockAlerts } from '$lib/server/aws/mock';
import { getAuthenticatedUser } from '$lib/server/auth';
import type { AlertStatus } from '$lib/types';

export async function GET({ request, url }: { request: Request; url: URL }) {
    try {
        const auth = await getAuthenticatedUser(request);
        if (!auth) {
            return json(
                { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or missing session token' } },
                { status: 401 }
            );
        }

        const statusParam = url.searchParams.get('status');
        const limitParam = url.searchParams.get('limit');
        const parsed = limitParam ? parseInt(limitParam, 10) : NaN;
        const limit = Number.isFinite(parsed) && parsed > 0 ? parsed : 20;

        const statusFilter = (statusParam === 'active' || statusParam === 'acknowledged')
            ? (statusParam as AlertStatus)
            : undefined;

        const allAlerts = await mockAlerts.findAllByHouseholdId(auth.householdId, statusFilter);
        const alerts = allAlerts.slice(0, limit).map((a) => ({
            alertId: a.alertId,
            catId: a.catId,
            catName: a.catName,
            type: a.type,
            status: a.status,
            triggeredAt: a.triggeredAt,
            metadata: a.metadata ?? {}
        }));

        return json({ success: true, data: { alerts } }, { status: 200 });
    } catch {
        return json(
            { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
            { status: 500 }
        );
    }
}
