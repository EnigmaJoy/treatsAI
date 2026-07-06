import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAuthenticatedUser } from '$lib/server/auth';
import { mockCats, mockS3, mockRekognition } from '$lib/server/aws/mock';

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
const MIN_PHOTOS = 3;
const MAX_PHOTOS = 10;
const ALLOWED_TYPES = ['image/jpeg', 'image/png'];

export const POST: RequestHandler = async ({ request, params }) => {
    try {
        const auth = await getAuthenticatedUser(request);
        if (!auth) {
            return json(
                { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or missing session token' } },
                { status: 401 }
            );
        }

        const cat = await mockCats.findByCatId(params.catId);
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

        if (photos.length < MIN_PHOTOS) {
            return json(
                { success: false, error: { code: 'VALIDATION_ERROR', message: `At least ${MIN_PHOTOS} photos are required` } },
                { status: 422 }
            );
        }

        if (photos.length > MAX_PHOTOS) {
            return json(
                { success: false, error: { code: 'VALIDATION_ERROR', message: `No more than ${MAX_PHOTOS} photos are allowed` } },
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
                    { success: false, error: { code: 'VALIDATION_ERROR', message: 'Only JPEG and PNG photos are allowed' } },
                    { status: 422 }
                );
            }
        }

        const s3Keys: string[] = [];
        for (const photo of photos) {
            const s3Key = await mockS3.uploadPhoto(params.catId, photo.name);
            s3Keys.push(s3Key);
        }

        const { faceIds } = await mockRekognition.indexFaces(params.catId, photos.length);

        const now = new Date().toISOString();
        const updated = await mockCats.update(params.catId, {
            photoS3Keys: [...cat.photoS3Keys, ...s3Keys],
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
