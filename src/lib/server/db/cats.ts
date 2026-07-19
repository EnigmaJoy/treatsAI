import { GetCommand, PutCommand, DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME, IS_MOCK } from './client';
import { mockCats } from '$lib/server/aws/mock';
import type { Cat } from '$lib/types';

// DynamoDB key scheme:
//   PK = CAT#<catId>              SK = METADATA          - direct lookup by catId
//   PK = HOUSEHOLD#<householdId>  SK = CAT#<catId>       - listing by household

export async function saveCat(cat: Cat): Promise<Cat> {
    if (IS_MOCK) {
        return mockCats.create(cat);
    }
    await Promise.all([
        docClient.send(
            new PutCommand({ TableName: TABLE_NAME, Item: { PK: `CAT#${cat.catId}`, SK: 'METADATA', ...cat } })
        ),
        docClient.send(
            new PutCommand({
                TableName: TABLE_NAME,
                Item: { PK: `HOUSEHOLD#${cat.householdId}`, SK: `CAT#${cat.catId}`, ...cat }
            })
        )
    ]);
    return cat;
}

export async function getCat(catId: string): Promise<Cat | undefined> {
    if (IS_MOCK) {
        return mockCats.findByCatId(catId);
    }
    const result = await docClient.send(
        new GetCommand({ TableName: TABLE_NAME, Key: { PK: `CAT#${catId}`, SK: 'METADATA' } })
    );
    return result.Item as Cat | undefined;
}

export async function listCats(householdId: string): Promise<Cat[]> {
    if (IS_MOCK) {
        return mockCats.findAllByHouseholdId(householdId);
    }
    const result = await docClient.send(
        new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
            ExpressionAttributeValues: { ':pk': `HOUSEHOLD#${householdId}`, ':prefix': 'CAT#' }
        })
    );
    return (result.Items ?? []) as Cat[];
}

export async function updateCat(catId: string, updates: Partial<Cat>): Promise<Cat | undefined> {
    if (IS_MOCK) {
        return mockCats.update(catId, updates);
    }
    const current = await getCat(catId);
    if (!current) return undefined;
    const updated = { ...current, ...updates };
    await Promise.all([
        docClient.send(
            new PutCommand({ TableName: TABLE_NAME, Item: { PK: `CAT#${catId}`, SK: 'METADATA', ...updated } })
        ),
        docClient.send(
            new PutCommand({
                TableName: TABLE_NAME,
                Item: { PK: `HOUSEHOLD#${updated.householdId}`, SK: `CAT#${catId}`, ...updated }
            })
        )
    ]);
    return updated;
}

export async function deleteCat(catId: string): Promise<void> {
    if (IS_MOCK) {
        return mockCats.delete(catId);
    }
    const current = await getCat(catId);
    if (!current) return;
    await Promise.all([
        docClient.send(
            new DeleteCommand({ TableName: TABLE_NAME, Key: { PK: `CAT#${catId}`, SK: 'METADATA' } })
        ),
        docClient.send(
            new DeleteCommand({
                TableName: TABLE_NAME,
                Key: { PK: `HOUSEHOLD#${current.householdId}`, SK: `CAT#${catId}` }
            })
        )
    ]);
}
