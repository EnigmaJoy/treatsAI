import { mockRekognition, mockDB, mockAlerts, mockCats } from '../aws/mock.js';
import type { Alert, AlertType, FeedingEvent } from '../../types.js';

// ---------------------------------------------------------------------------
// recognizeCat
// ---------------------------------------------------------------------------

export async function recognizeCat(
    catId: string
): Promise<{ outcome: 'dispensed' | 'skipped' | 'rejected'; confidenceScore: number }> {
    const result = await mockRekognition.searchFacesByImage(catId);
    return {
        outcome: result.outcome,
        confidenceScore: result.confidence
    };
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
