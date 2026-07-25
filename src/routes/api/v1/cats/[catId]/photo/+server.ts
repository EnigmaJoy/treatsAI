import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { env } from '$env/dynamic/private';
import { getAuthenticatedUser } from '$lib/server/auth';
import { getCat, updateCat } from '$lib/server/db/cats';
import { IS_MOCK } from '$lib/server/db/client';
import { mockS3 } from '$lib/server/aws/mock';
import { s3Client } from '$lib/server/aws/s3';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 15 * 1024 * 1024;
const MAX_PHOTOS = 10;
const S3_BUCKET = env.S3_BUCKET_NAME ?? 'treatsai-cat-photos';

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

        const key = cat.photoS3Keys[0];
        const url = `/api/v1/cats/${params.catId}/photo/${key}`;

        return json({ success: true, data: { url } });
    } catch {
        return json(
            { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
            { status: 500 }
        );
    }
};

// POST - upload a single photo to S3 for the profile picker.
// No Rekognition indexing - Rekognition training happens only during registration.
// No minimum count - one photo is enough.
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

        if (cat.photoS3Keys.length >= MAX_PHOTOS) {
            return json(
                { success: false, error: { code: 'VALIDATION_ERROR', message: `Cannot exceed ${MAX_PHOTOS} photos total` } },
                { status: 422 }
            );
        }

        let formData: FormData;
        try {
            formData = await request.formData();
        } catch {
            return json(
                { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid multipart/form-data' } },
                { status: 422 }
            );
        }

        const file = formData.get('photo');
        if (!(file instanceof File)) {
            return json(
                { success: false, error: { code: 'VALIDATION_ERROR', message: 'photo file is required' } },
                { status: 422 }
            );
        }

        if (file.size > MAX_FILE_SIZE) {
            return json(
                { success: false, error: { code: 'VALIDATION_ERROR', message: 'Photo must be no larger than 15MB' } },
                { status: 422 }
            );
        }

        if (!ALLOWED_TYPES.includes(file.type)) {
            return json(
                { success: false, error: { code: 'VALIDATION_ERROR', message: 'Only JPEG, PNG, and WebP photos are allowed' } },
                { status: 422 }
            );
        }

        const buffer = await file.arrayBuffer();
        let s3Key: string;
        let url: string;

        if (IS_MOCK) {
            s3Key = await mockS3.uploadPhoto(
                params.catId,
                file.name,
                new Uint8Array(buffer),
                file.type
            );
        } else {
            // Use a UUID prefix to avoid collisions when the same filename is uploaded again
            s3Key = `cats/${params.catId}/${crypto.randomUUID()}-${file.name}`;
            const putCommand = new PutObjectCommand({
                Bucket: S3_BUCKET,
                Key: s3Key,
                Body: new Uint8Array(buffer),
                ContentType: file.type
            });
            await s3Client.send(putCommand);
        }

        // Return a proxy URL so the browser fetches the image through the SvelteKit
        // server rather than directly from S3, avoiding CORS restrictions.
        url = `/api/v1/cats/${params.catId}/photo/${s3Key}`;

        const existingKeys = cat.photoS3Keys ?? [];
        const updatedKeys = existingKeys.includes(s3Key)
            ? existingKeys
            : [...existingKeys, s3Key];

        const now = new Date().toISOString();
        const updated = await updateCat(params.catId, {
            photoS3Keys: updatedKeys,
            updatedAt: now
        });

        if (!updated) {
            return json(
                { success: false, error: { code: 'NOT_FOUND', message: 'Cat not found' } },
                { status: 404 }
            );
        }

        return json({ success: true, data: { s3Key, url } }, { status: 201 });
    } catch {
        return json(
            { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
            { status: 500 }
        );
    }
};
