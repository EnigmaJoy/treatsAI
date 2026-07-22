import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME, IS_MOCK } from './client';
import { mockDevices } from '$lib/server/aws/mock';
import type { Device } from '$lib/types';

// DynamoDB key scheme:
//   PK = HOUSEHOLD#<householdId>   SK = DEVICE
//   One device per household.

export async function upsertDevice(device: Device): Promise<Device> {
    if (IS_MOCK) {
        return mockDevices.upsert(device);
    }
    await docClient.send(
        new PutCommand({
            TableName: TABLE_NAME,
            Item: { PK: `HOUSEHOLD#${device.householdId}`, SK: 'DEVICE', ...device }
        })
    );
    return device;
}

export async function getDevice(householdId: string): Promise<Device | undefined> {
    if (IS_MOCK) {
        return mockDevices.get(householdId);
    }
    const result = await docClient.send(
        new GetCommand({ TableName: TABLE_NAME, Key: { PK: `HOUSEHOLD#${householdId}`, SK: 'DEVICE' } })
    );
    return result.Item as Device | undefined;
}
