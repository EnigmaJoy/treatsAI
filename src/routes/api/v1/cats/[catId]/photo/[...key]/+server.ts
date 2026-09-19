import type { RequestHandler } from './$types';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { env } from '$env/dynamic/private';
import { getAuthenticatedUser } from '$lib/server/auth';
import { getCat } from '$lib/server/db/cats';
import { IS_MOCK } from '$lib/server/db/client';
import { mockS3 } from '$lib/server/aws/mock';
import { s3Client } from '$lib/server/aws/s3';

const S3_BUCKET = env.S3_BUCKET_NAME ?? 'treatsai-cat-photos';

// Proxies a cat photo through the SvelteKit server to avoid S3 CORS restrictions.
// The S3 key is passed as a rest parameter so slashes in the key are preserved.
// Requires authentication and verifies the cat belongs to the caller's household.
export const GET: RequestHandler = async ({ request, params }) => {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
        return new Response(null, { status: 401 });
    }

    const cat = await getCat(params.catId);
    if (!cat || cat.householdId !== auth.householdId) {
        return new Response(null, { status: 404 });
    }

    const s3Key = params.key;

    if (IS_MOCK) {
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
    }

    try {
        const command = new GetObjectCommand({ Bucket: S3_BUCKET, Key: s3Key });
        const result = await s3Client.send(command);
        const body = await result.Body?.transformToByteArray();
        if (!body) {
            return new Response(null, { status: 404 });
        }
        return new Response(body, {
            headers: {
                'Content-Type': result.ContentType ?? 'image/jpeg',
                'Cache-Control': 'private, max-age=3600'
            }
        });
    } catch {
        return new Response(null, { status: 404 });
    }
};
