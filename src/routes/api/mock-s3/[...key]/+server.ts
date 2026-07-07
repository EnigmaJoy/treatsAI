import type { RequestHandler } from './$types';
import { mockS3 } from '$lib/server/aws/mock';

// Serves files stored in the in-memory mock S3 store.
// Only used during local development when MOCK_AWS=true (or when all routes use the mock directly).
// In production, images are served from real S3 via pre-signed URLs and this route is never called.
export const GET: RequestHandler = async ({ params }) => {
    const s3Key = decodeURIComponent(params.key);
    const file = mockS3.getFile(s3Key);

    if (!file) {
        return new Response(null, { status: 404 });
    }

    return new Response(file.data, {
        headers: {
            'Content-Type': file.contentType,
            'Cache-Control': 'no-store'
        }
    });
};
