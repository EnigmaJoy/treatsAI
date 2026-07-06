import { proxyActivities, sleep, defineSignal, setHandler, condition } from '@temporalio/workflow';

// Activity type imports — only types, no runtime imports from server code
import type * as Activities from './activities.js';

const {
    recognizeCat,
    logFeedingEvent,
    triggerAlert,
    updateBaseline
} = proxyActivities<typeof Activities>({
    startToCloseTimeout: '30 seconds'
});

// ---------------------------------------------------------------------------
// Signals
// ---------------------------------------------------------------------------

export const pauseSignal = defineSignal<[boolean]>('pauseSignal');

// ---------------------------------------------------------------------------
// FeedingScheduleWorkflow
// ---------------------------------------------------------------------------

export interface FeedingScheduleWorkflowInput {
    catId: string;
    scheduleId: string;
    householdId: string;
    feedingTimes: Array<{ time: string; portionGrams: number }>;
}

/** Calculate milliseconds until the next feeding time (HH:MM) across all feeding times. */
function msUntilNextFeeding(
    feedingTimes: Array<{ time: string; portionGrams: number }>,
    nowMs: number
): {
    ms: number;
    portionGrams: number;
} {
    const now = new Date(nowMs);

    let nearest: { ms: number; portionGrams: number } | null = null;

    for (const ft of feedingTimes) {
        const [hours, minutes] = ft.time.split(':').map(Number);
        const candidate = new Date(now);
        candidate.setHours(hours, minutes, 0, 0);

        // If the time has already passed today, schedule for tomorrow
        if (candidate.getTime() <= nowMs) {
            candidate.setDate(candidate.getDate() + 1);
        }

        const diff = candidate.getTime() - nowMs;
        if (nearest === null || diff < nearest.ms) {
            nearest = { ms: diff, portionGrams: ft.portionGrams };
        }
    }

    // Fallback: 24 hours (should never happen if feedingTimes is non-empty)
    return nearest ?? { ms: 24 * 60 * 60 * 1000, portionGrams: 0 };
}

export async function FeedingScheduleWorkflow(input: FeedingScheduleWorkflowInput): Promise<void> {
    const { catId, scheduleId, householdId, feedingTimes } = input;
    let paused = false;

    setHandler(pauseSignal, (value: boolean) => {
        paused = value;
    });

    while (true) {
        // Wait if paused
        if (paused) {
            await condition(() => !paused);
        }

        const { ms, portionGrams } = msUntilNextFeeding(feedingTimes, Date.now());
        await sleep(ms);

        // Check again after waking — may have been paused in the meantime
        if (paused) {
            await condition(() => !paused);
        }

        const recognition = await recognizeCat(catId);
        const feedingTime = feedingTimes.find((ft) => {
            const { ms: remaining } = msUntilNextFeeding([ft], Date.now());
            return remaining > 0;
        }) ?? feedingTimes[0];
        const { outcome } = recognition;
        await logFeedingEvent({
            catId,
            scheduleId,
            householdId,
            outcome,
            confidenceScore: recognition.confidenceScore,
            portionGrams
        });

        if (outcome === 'skipped') {
            await triggerAlert({
                catId,
                catName: catId,
                householdId,
                type: 'skip_meal',
                metadata: { scheduledFeedingTime: feedingTime.time }
            });
        }
    }
}

// ---------------------------------------------------------------------------
// SkipMealAlertWorkflow
// ---------------------------------------------------------------------------

export interface SkipMealAlertWorkflowInput {
    catId: string;
    catName: string;
    householdId: string;
    scheduleId: string;
    scheduledFeedingTime: string;
}

export async function SkipMealAlertWorkflow(input: SkipMealAlertWorkflowInput): Promise<void> {
    const { catId, catName, householdId, scheduleId, scheduledFeedingTime } = input;

    // Wait 15 minutes after the scheduled feeding time
    await sleep(15 * 60 * 1000);

    await triggerAlert({
        catId,
        catName,
        householdId,
        type: 'skip_meal',
        metadata: { scheduleId, scheduledFeedingTime }
    });
}

// ---------------------------------------------------------------------------
// WeightReminderWorkflow
// ---------------------------------------------------------------------------

export interface WeightReminderWorkflowInput {
    catId: string;
    catName: string;
    householdId: string;
    intervalDays: number;
}

export async function WeightReminderWorkflow(input: WeightReminderWorkflowInput): Promise<void> {
    const { catId, catName, householdId, intervalDays } = input;

    while (true) {
        await sleep(intervalDays * 24 * 60 * 60 * 1000);

        await triggerAlert({
            catId,
            catName,
            householdId,
            type: 'weight_reminder',
            metadata: { intervalDays }
        });
    }
}

// ---------------------------------------------------------------------------
// ConsumptionBaselineWorkflow
// ---------------------------------------------------------------------------

export interface ConsumptionBaselineWorkflowInput {
    catId: string;
    householdId: string;
}

export async function ConsumptionBaselineWorkflow(
    input: ConsumptionBaselineWorkflowInput
): Promise<void> {
    const { catId, householdId } = input;

    while (true) {
        await sleep(24 * 60 * 60 * 1000);

        await updateBaseline({ catId, householdId });
    }
}
