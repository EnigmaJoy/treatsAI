import { GetCommand, PutCommand, DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME, IS_MOCK } from './client';
import { mockSchedules } from '$lib/server/aws/mock';
import type { Schedule } from '$lib/types';

// DynamoDB key scheme:
//   PK = SCHEDULE#<scheduleId>   SK = METADATA              - direct lookup by scheduleId
//   PK = CAT#<catId>             SK = SCHEDULE#<scheduleId>  - listing by cat

export async function saveSchedule(schedule: Schedule): Promise<Schedule> {
    if (IS_MOCK) {
        return mockSchedules.create(schedule);
    }
    await Promise.all([
        docClient.send(
            new PutCommand({
                TableName: TABLE_NAME,
                Item: { PK: `SCHEDULE#${schedule.scheduleId}`, SK: 'METADATA', ...schedule }
            })
        ),
        docClient.send(
            new PutCommand({
                TableName: TABLE_NAME,
                Item: { PK: `CAT#${schedule.catId}`, SK: `SCHEDULE#${schedule.scheduleId}`, ...schedule }
            })
        )
    ]);
    return schedule;
}

export async function getSchedule(scheduleId: string): Promise<Schedule | undefined> {
    if (IS_MOCK) {
        return mockSchedules.findByScheduleId(scheduleId);
    }
    const result = await docClient.send(
        new GetCommand({ TableName: TABLE_NAME, Key: { PK: `SCHEDULE#${scheduleId}`, SK: 'METADATA' } })
    );
    return result.Item as Schedule | undefined;
}

export async function listSchedules(catId: string): Promise<Schedule[]> {
    if (IS_MOCK) {
        return mockSchedules.findAllByCatId(catId);
    }
    const result = await docClient.send(
        new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
            ExpressionAttributeValues: { ':pk': `CAT#${catId}`, ':prefix': 'SCHEDULE#' }
        })
    );
    return (result.Items ?? []) as Schedule[];
}

export async function updateSchedule(
    scheduleId: string,
    updates: Partial<Schedule>
): Promise<Schedule | undefined> {
    if (IS_MOCK) {
        return mockSchedules.update(scheduleId, updates);
    }
    const current = await getSchedule(scheduleId);
    if (!current) return undefined;
    const updated = { ...current, ...updates };
    await Promise.all([
        docClient.send(
            new PutCommand({
                TableName: TABLE_NAME,
                Item: { PK: `SCHEDULE#${scheduleId}`, SK: 'METADATA', ...updated }
            })
        ),
        docClient.send(
            new PutCommand({
                TableName: TABLE_NAME,
                Item: { PK: `CAT#${updated.catId}`, SK: `SCHEDULE#${scheduleId}`, ...updated }
            })
        )
    ]);
    return updated;
}

export async function deleteSchedule(scheduleId: string): Promise<void> {
    if (IS_MOCK) {
        return mockSchedules.delete(scheduleId);
    }
    const current = await getSchedule(scheduleId);
    if (!current) return;
    await Promise.all([
        docClient.send(
            new DeleteCommand({
                TableName: TABLE_NAME,
                Key: { PK: `SCHEDULE#${scheduleId}`, SK: 'METADATA' }
            })
        ),
        docClient.send(
            new DeleteCommand({
                TableName: TABLE_NAME,
                Key: { PK: `CAT#${current.catId}`, SK: `SCHEDULE#${scheduleId}` }
            })
        )
    ]);
}
