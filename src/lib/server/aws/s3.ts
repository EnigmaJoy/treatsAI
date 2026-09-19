import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '$env/dynamic/private';
import { IS_MOCK } from '$lib/server/db/client';
import { mockS3 } from '$lib/server/aws/mock';
import type { Cat } from '$lib/types';

export const s3Client = new S3Client({
    region: env.AWS_REGION ?? 'eu-west-1',
    credentials: IS_MOCK
        ? { accessKeyId: 'mock_access_key', secretAccessKey: 'mock_secret_key' }
        : { accessKeyId: env.AWS_ACCESS_KEY_ID!, secretAccessKey: env.AWS_SECRET_ACCESS_KEY! }
});

const S3_BUCKET = env.S3_BUCKET_NAME ?? 'treatsai-cat-photos';

// Generate a pre-signed URL for any S3 key (used for thumbnail arrays, etc.).
// In mock mode the local mock-s3 route is used so the dev UI still works.
// In real mode a genuine AWS pre-signed URL is returned.
// Returns an empty string on failure so callers can filter rather than crash.
export async function getPhotoUrl(key: string): Promise<string> {
    if (IS_MOCK) {
        console.log('[s3] getPhotoUrl: IS_MOCK=true, key:', key);
        return mockS3.getPresignedUrl(key);
    }
    try {
        console.log('[s3] getPhotoUrl: IS_MOCK=false, generating real pre-signed URL for key:', key);
        const command = new GetObjectCommand({ Bucket: S3_BUCKET, Key: key });
        return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    } catch (err) {
        console.error('[s3] getPhotoUrl: failed to generate pre-signed URL for key:', key, err);
        return '';
    }
}

// Generate a profile photo URL for a cat.
// Tries profilePhotoKey first, falls back to the first key in photoS3Keys.
// Returns null when the cat has no photos or URL generation fails.
// In mock mode returns null so the caller falls back to the emoji avatar;
// real photos in mock mode are served by the dedicated /photo endpoint instead.
export async function getProfilePhotoUrl(cat: Cat): Promise<string | null> {
    const key = cat.profilePhotoKey ?? cat.photoS3Keys?.[0] ?? null;
    if (!key) return null;
    if (IS_MOCK) return null;
    try {
        const command = new GetObjectCommand({ Bucket: S3_BUCKET, Key: key });
        return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    } catch {
        return null;
    }
}
