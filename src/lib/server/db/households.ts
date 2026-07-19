import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME, IS_MOCK } from './client';
import { mockHouseholds } from '$lib/server/aws/mock';
import type { Household } from '$lib/types';

// DynamoDB key scheme:
//   PK = HOUSEHOLD#<householdId>   SK = METADATA

export async function saveHousehold(household: Household): Promise<Household> {
    if (IS_MOCK) {
        return mockHouseholds.create(household);
    }
    await docClient.send(
        new PutCommand({
            TableName: TABLE_NAME,
            Item: { PK: `HOUSEHOLD#${household.householdId}`, SK: 'METADATA', ...household }
        })
    );
    return household;
}

export async function getHousehold(householdId: string): Promise<Household | undefined> {
    if (IS_MOCK) {
        return mockHouseholds.findByHouseholdId(householdId);
    }
    const result = await docClient.send(
        new GetCommand({ TableName: TABLE_NAME, Key: { PK: `HOUSEHOLD#${householdId}`, SK: 'METADATA' } })
    );
    return result.Item as Household | undefined;
}
