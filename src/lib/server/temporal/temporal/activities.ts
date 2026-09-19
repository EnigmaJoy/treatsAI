import { RekognitionClient, SearchFacesByImageCommand } from '@aws-sdk/client-rekognition';
import { mockRekognition, mockDB, mockAlerts, mockCats } from '../aws/mock.js';
import type { Alert, AlertType, FeedingEvent } from '../../types.js';

const IS_MOCK = process.env.MOCK_AWS === 'true';

const rekognitionClient = IS_MOCK
    ? null
    : new RekognitionClient({
        region: process.env.AWS_REGION ?? 'eu-west-1',
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
        }
    });

// ---------------------------------------------------------------------------
// recognizeCat
// ---------------------------------------------------------------------------

export async function recognizeCat(
    catId: string,
    collectionId: string,
    imageBuffer?: Uint8Array
): Promise<{ outcome: 'dispensed' | 'skipped' | 'rejected'; confidenceScore: number }> {
    if (IS_MOCK || !rekognitionClient) {
        const result = await mockRekognition.searchFacesByImage(catId);
        return { outcome: result.outcome, confidenceScore: result.confidence };
    }

    if (!imageBuffer) {
        return { outcome: 'skipped', confidenceScore: 0 };
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
            return { outcome: 'skipped', confidenceScore: 0 };
        }
        const confidence = match.Similarity ?? 0;
        if (confidence >= 90) {
            return { outcome: 'dispensed', confidenceScore: confidence };
        }
        return { outcome: 'rejected', confidenceScore: confidence };
    } catch {
        return { outcome: 'skipped', confidenceScore: 0 };
    }
}

// ---------------------------------------------------------------------------
// logFeedingEvent
// ---------------------------------------------------------------------------

export interface LogFeedingEventParams {
    catId: string;
    scheduleId: string;
    householdId: string;
    outcome: 'dispensed' | 'skipped' | 'rejected';
    confidenceScore: number;
    portionGrams: number;
}

export async function logFeedingEvent(params: LogFeedingEventParams): Promise<FeedingEvent> {
    const { catId, scheduleId, householdId, outcome, confidenceScore, portionGrams } = params;

    const event: FeedingEvent = {
        eventId: crypto.randomUUID(),
        catId,
        scheduleId,
        householdId,
        timestamp: new Date().toISOString(),
        outcome,
        confidenceScore,
        portionDispensedGrams: outcome === 'dispensed' ? portionGrams : undefined,
        manualOverride: false
    };

    await mockDB.putFeedingEvent(event);
    return event;
}

// ---------------------------------------------------------------------------
// triggerAlert
// ---------------------------------------------------------------------------

export interface TriggerAlertParams {
    catId: string;
    catName: string;
    householdId: string;
    type: AlertType;
    metadata?: Record<string, unknown>;
}

export async function triggerAlert(params: TriggerAlertParams): Promise<Alert> {
    const { catId, catName, householdId, type, metadata } = params;

    const alert: Alert = {
        alertId: crypto.randomUUID(),
        householdId,
        catId,
        catName,
        type,
        status: 'active',
        triggeredAt: new Date().toISOString(),
        metadata
    };

    await mockAlerts.create(alert);
    return alert;
}

// ---------------------------------------------------------------------------
// updateBaseline
// ---------------------------------------------------------------------------

export interface UpdateBaselineParams {
    catId: string;
    householdId: string;
}

export async function updateBaseline(params: UpdateBaselineParams): Promise<void> {
    const { catId } = params;

    const cat = await mockCats.findByCatId(catId);
    if (!cat) return;

    let newBaseline: number;
    const suggested = cat.suggestedPortionGrams ?? cat.consumptionBaseline;
    const threshold = suggested * 0.8;

    if (cat.consumptionBaseline < threshold) {
        newBaseline = Math.max(50, Math.round(cat.consumptionBaseline * 0.95));
    } else {
        newBaseline = Math.min(300, Math.round(cat.consumptionBaseline * 1.05));
    }

    await mockCats.update(catId, { consumptionBaseline: newBaseline });
}
