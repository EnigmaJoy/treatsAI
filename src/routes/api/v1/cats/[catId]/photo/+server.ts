import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAuthenticatedUser } from '$lib/server/auth';
import { getCat } from '$lib/server/db/cats';
import { mockS3 } from '$lib/server/aws/mock';

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

        if (!cat.photoS3Keys || cat.photoS3Keys.length === 0) {
            return json(
                { success: false, error: { code: 'NOT_FOUND', message: 'No photos uploaded for this cat' } },
                { status: 404 }
            );
        }

        // Generate a pre-signed URL for the first photo (15 minute expiry in production)
        const url = await mockS3.getPresignedUrl(cat.photoS3Keys[0]);

        return json({ success: true, data: { url } });
    } catch {
        return json(
            { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
            { status: 500 }
        );
    }
};
