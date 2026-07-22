import type { LayoutServerLoad } from './$types';
import { getAuthenticatedUser } from '$lib/server/auth';
import { getUserById } from '$lib/server/db/users';
import { listAlerts } from '$lib/server/db/alerts';

export const load: LayoutServerLoad = async ({ request }) => {
    try {
        const auth = await getAuthenticatedUser(request);
        if (!auth) {
            return { userEmail: null, alertCount: 0, alertPreview: [] };
        }

        const [user, alerts] = await Promise.all([
            getUserById(auth.userId),
            listAlerts(auth.householdId, 'active')
        ]);

        return {
            userEmail: user?.email ?? null,
            alertCount: alerts.length,
            alertPreview: alerts.slice(0, 5).map((a) => ({
                alertId: a.alertId,
                type: a.type,
                catName: a.catName ?? null,
                triggeredAt: a.triggeredAt
            }))
        };
    } catch {
        return { userEmail: null, alertCount: 0, alertPreview: [] };
    }
};
