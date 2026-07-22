import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME, IS_MOCK } from './client';
import { mockDB } from '$lib/server/aws/mock';
import type { FeedingEvent } from '$lib/types';

// DynamoDB key scheme:
//   PK = CAT#<catId>   SK = EVENT#<timestamp>#<eventId>
//   SK prefix sorts chronologically, enabling range queries.

export interface FeedingEventsFilter {
    from?: string;
    to?: string;
    outcome?: string;
    limit?: number;
    cursor?: string;
}

export async function saveFeedingEvent(event: FeedingEvent): Promise<FeedingEvent> {
    if (IS_MOCK) {
        return mockDB.putFeedingEvent(event);
    }
    await docClient.send(
        new PutCommand({
            TableName: TABLE_NAME,
            Item: { PK: `CAT#${event.catId}`, SK: `EVENT#${event.timestamp}#${event.eventId}`, ...event }
        })
    );
    return event;
}

export async function listFeedingEvents(
    catId: string,
    opts: FeedingEventsFilter = {}
): Promise<FeedingEvent[]> {
    if (IS_MOCK) {
        return mockDB.getFeedingEventsFiltered(catId, opts);
    }
    const result = await docClient.send(
        new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
            ExpressionAttributeValues: { ':pk': `CAT#${catId}`, ':prefix': 'EVENT#' }
        })
    );
    let events = (result.Items ?? []) as FeedingEvent[];

    // Apply same cursor/from/to/outcome/limit logic as the mock
    if (opts.cursor) {
        const lowerBound = opts.from && opts.from > opts.cursor ? opts.from : opts.cursor;
        events = events.filter((e) => e.timestamp > lowerBound);
    } else if (opts.from) {
        events = events.filter((e) => e.timestamp >= opts.from!);
    }
    if (opts.to) events = events.filter((e) => e.timestamp <= opts.to!);
    if (opts.outcome) events = events.filter((e) => e.outcome === opts.outcome);
    events = events.sort((a, b) => (a.timestamp < b.timestamp ? -1 : 1));
    if (opts.limit !== undefined && opts.limit > 0) events = events.slice(0, opts.limit);
    return events;
}
