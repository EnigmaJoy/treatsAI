// Mock AWS services for local development
// When MOCK_AWS=true, all AWS calls return realistic fake data
// When MOCK_AWS=false, real AWS services are used
// Swap is seamless - the rest of the app never knows the difference

import type { FeedingEvent } from '$lib/types';

// Mock cat face collection - simulates AWS Rekognition
const mockFaceCollection: Record<string, string[]> = {};

// Mock feeding events store - simulates DynamoDB
const mockFeedingEvents: FeedingEvent[] = [];

// Mock Rekognition - simulates cat face recognition
export const mockRekognition = {
    // Simulate indexing cat photos into a Rekognition collection
    indexFaces: async (catId: string, photoCount: number) => {
        mockFaceCollection[catId] = Array.from(
            { length: photoCount },
            (_, i) => `mock-face-id-${catId}-${i}`
        );
        return {
            faceIds: mockFaceCollection[catId],
            indexedCount: photoCount
        };
    },

    // Simulate searching for a cat face - returns a realistic confidence score
    searchFacesByImage: async (catId: string) => {
        const hasFaces = mockFaceCollection[catId]?.length > 0;

        // Simulate realistic confidence scores
        // 85% chance of high confidence match (dispensed)
        // 10% chance of low confidence (rejected)
        // 5% chance of no match (skipped)
        const random = Math.random();
        if (!hasFaces || random < 0.05) {
            return { matched: false, confidence: 0, outcome: 'skipped' as const };
        } else if (random < 0.15) {
            return {
                matched: false,
                confidence: Math.random() * 30 + 50, // 50-80%
                outcome: 'rejected' as const
            };
        } else {
            return {
                matched: true,
                confidence: Math.random() * 9 + 91, // 91-100%
                outcome: 'dispensed' as const
            };
        }
    }
};

// Mock DynamoDB - simulates database operations
export const mockDB = {
    // Save a feeding event
    putFeedingEvent: async (event: FeedingEvent) => {
        mockFeedingEvents.push(event);
        return event;
    },

    // Get all feeding events for a cat
    getFeedingEvents: async (catId: string) => {
        return mockFeedingEvents.filter((e) => e.catId === catId);
    },

    // Get all feeding events for a household
    getHouseholdFeedingEvents: async (householdId: string) => {
        return mockFeedingEvents.filter((e) => e.householdId === householdId);
    }
};

// Mock S3 - simulates photo storage
export const mockS3 = {
    // Simulate uploading a photo - returns a fake S3 key
    uploadPhoto: async (catId: string, fileName: string) => {
        return `cats/${catId}/${fileName}`;
    },

    // Simulate generating a pre-signed URL for a photo
    getPresignedUrl: async (s3Key: string) => {
        return `https://mock-s3.treatsai.local/${s3Key}`;
    }
};