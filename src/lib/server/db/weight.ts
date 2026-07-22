import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME, IS_MOCK } from './client';
import { mockWeightEntries } from '$lib/server/aws/mock';
import type { WeightEntry } from '$lib/types';

// DynamoDB key scheme:
//   PK = CAT#<catId>   SK = WEIGHT#<loggedAt>#<weightEntryId>
//   SK sorts chronologically, enabling range queries.

export async function saveWeightEntry(entry: WeightEntry): Promise<WeightEntry> {
    if (IS_MOCK) {
        return mockWeightEntries.create(entry);
    }
    await docClient.send(
        new PutCommand({
            TableName: TABLE_NAME,
            Item: {
                PK: `CAT#${entry.catId}`,
                SK: `WEIGHT#${entry.loggedAt}#${entry.weightEntryId}`,
                ...entry
            }
        })
    );
    return entry;
}

export async function listWeightEntries(catId: string): Promise<WeightEntry[]> {
    if (IS_MOCK) {
        return mockWeightEntries.findAllByCatId(catId);
    }
    const result = await docClient.send(
        new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
            ExpressionAttributeValues: { ':pk': `CAT#${catId}`, ':prefix': 'WEIGHT#' }
        })
    );
    const items = (result.Items ?? []) as WeightEntry[];
    return items.sort((a, b) => (a.loggedAt < b.loggedAt ? -1 : 1));
}
