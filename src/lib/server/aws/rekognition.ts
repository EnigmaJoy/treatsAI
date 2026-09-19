import { RekognitionClient, IndexFacesCommand, SearchFacesByImageCommand } from '@aws-sdk/client-rekognition';
import { env } from '$env/dynamic/private';
import { IS_MOCK } from '$lib/server/db/client';
import { mockRekognition } from '$lib/server/aws/mock';

const rekognitionClient = new RekognitionClient({
    region: env.AWS_REGION ?? 'eu-west-1',
    credentials: IS_MOCK
        ? { accessKeyId: 'mock_access_key', secretAccessKey: 'mock_secret_key' }
        : { accessKeyId: env.AWS_ACCESS_KEY_ID!, secretAccessKey: env.AWS_SECRET_ACCESS_KEY! }
});

const S3_BUCKET = env.S3_BUCKET_NAME ?? 'treatsai-cat-photos';

// Index faces from a set of S3 keys into the cat's Rekognition collection.
// In mock mode delegates to in-memory mockRekognition.
// In real mode calls IndexFacesCommand for each uploaded S3 object.
export async function indexFaces(
    collectionId: string,
    catId: string,
    s3Keys: string[]
): Promise<{ faceIds: string[]; indexedCount: number }> {
    if (IS_MOCK) {
        return mockRekognition.indexFaces(catId, s3Keys.length);
    }

    const faceIds: string[] = [];
    for (const key of s3Keys) {
        const command = new IndexFacesCommand({
            CollectionId: collectionId,
            Image: { S3Object: { Bucket: S3_BUCKET, Name: key } },
            DetectionAttributes: []
        });
        const result = await rekognitionClient.send(command);
        for (const record of result.FaceRecords ?? []) {
            if (record.Face?.FaceId) {
                faceIds.push(record.Face.FaceId);
            }
        }
    }
    return { faceIds, indexedCount: faceIds.length };
}

// Search for a matching cat face in a Rekognition collection using a raw image buffer.
// In mock mode delegates to in-memory mockRekognition.
export async function searchFacesByImage(
    collectionId: string,
    catId: string,
    imageBuffer: Uint8Array
): Promise<{ matched: boolean; confidence: number; outcome: 'dispensed' | 'rejected' | 'skipped' }> {
    if (IS_MOCK) {
        return mockRekognition.searchFacesByImage(catId);
    }

    try {
        const command = new SearchFacesByImageCommand({
            CollectionId: collectionId,
            Image: { Bytes: imageBuffer },
            FaceMatchThreshold: 80,
            MaxFaces: 1
        });
        const result = await rekognitionClient.send(command);
        const match = result.FaceMatches?.[0];
        if (!match) {
            return { matched: false, confidence: 0, outcome: 'skipped' };
        }
        const confidence = match.Similarity ?? 0;
        if (confidence >= 90) {
            return { matched: true, confidence, outcome: 'dispensed' };
        }
        return { matched: false, confidence, outcome: 'rejected' };
    } catch {
        return { matched: false, confidence: 0, outcome: 'skipped' };
    }
}
