import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { env } from '$env/dynamic/private';
import { getAuthenticatedUser } from '$lib/server/auth';
import { getCat, updateCat } from '$lib/server/db/cats';
import { IS_MOCK } from '$lib/server/db/client';
import { mockS3 } from '$lib/server/aws/mock';
import { s3Client } from '$lib/server/aws/s3';
import { indexFaces } from '$lib/server/aws/rekognition';

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
const MIN_PHOTOS_INITIAL = 3;
const MAX_PHOTOS = 10;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const S3_BUCKET = env.S3_BUCKET_NAME ?? 'treatsai-cat-photos';

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

        let formData: FormData;
        try {
            formData = await request.formData();
        } catch {
            return json(
                { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid multipart/form-data' } },
                { status: 422 }
            );
        }

        const allPhotos = formData.getAll('photos');
        const photos = allPhotos.filter((item): item is File => item instanceof File);

        if (photos.length === 0) {
            return json(
                { success: false, error: { code: 'VALIDATION_ERROR', message: 'At least one photo is required' } },
                { status: 422 }
            );
        }

        // Require at least 3 photos only on initial upload (cat has no photos yet)
        const existingCount = cat.photoS3Keys.length;
        if (existingCount === 0 && photos.length < MIN_PHOTOS_INITIAL) {
            return json(
                { success: false, error: { code: 'VALIDATION_ERROR', message: `At least ${MIN_PHOTOS_INITIAL} photos are required for initial setup` } },
                { status: 422 }
            );
        }

        if (existingCount + photos.length > MAX_PHOTOS) {
            return json(
                { success: false, error: { code: 'VALIDATION_ERROR', message: `Cannot exceed ${MAX_PHOTOS} photos total` } },
                { status: 422 }
            );
        }

        for (const photo of photos) {
            if (photo.size > MAX_FILE_SIZE) {
                return json(
                    { success: false, error: { code: 'VALIDATION_ERROR', message: `Each photo must be no larger than 15MB` } },
                    { status: 422 }
                );
            }
            if (!ALLOWED_TYPES.includes(photo.type)) {
                return json(
                    { success: false, error: { code: 'VALIDATION_ERROR', message: 'Only JPEG, PNG, and WebP photos are allowed' } },
                    { status: 422 }
                );
            }
        }

        const s3Keys: string[] = [];
        for (const photo of photos) {
            const buffer = await photo.arrayBuffer();
            let s3Key: string;

            if (IS_MOCK) {
                s3Key = await mockS3.uploadPhoto(
                    params.catId,
                    photo.name,
                    new Uint8Array(buffer),
                    photo.type
                );
            } else {
                // UUID prefix prevents collisions when the same filename is re-uploaded
                s3Key = `cats/${params.catId}/${crypto.randomUUID()}-${photo.name}`;
                const command = new PutObjectCommand({
                    Bucket: S3_BUCKET,
                    Key: s3Key,
                    Body: new Uint8Array(buffer),
                    ContentType: photo.type
                });
                await s3Client.send(command);
            }

            s3Keys.push(s3Key);
        }

        const { faceIds } = await indexFaces(
            cat.rekognitionCollectionId,
            params.catId,
            s3Keys
        );

        const now = new Date().toISOString();
        // Set profilePhotoKey to the first uploaded photo if the cat does not have one yet.
        // This ensures the profile avatar is populated automatically after registration.
        const profilePhotoKey =
            !cat.profilePhotoKey && s3Keys.length > 0 ? s3Keys[0] : cat.profilePhotoKey;

        const existingKeys = cat.photoS3Keys ?? [];
        const newKeys = s3Keys.filter(k => !existingKeys.includes(k));
        const updatedKeys = [...existingKeys, ...newKeys];

        const updated = await updateCat(params.catId, {
            photoS3Keys: updatedKeys,
            ...(profilePhotoKey !== cat.profilePhotoKey ? { profilePhotoKey } : {}),
            updatedAt: now
        });
        if (!updated) {
            return json(
                { success: false, error: { code: 'NOT_FOUND', message: 'Cat not found' } },
                { status: 404 }
            );
        }

        return json(
            {
                success: true,
                data: {
                    uploadedCount: photos.length,
                    s3Keys,
                    rekognitionFaceIds: faceIds
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
};
