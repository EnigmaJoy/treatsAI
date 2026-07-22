import { GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME, IS_MOCK } from './client';
import { mockAlerts } from '$lib/server/aws/mock';
import type { Alert, AlertStatus } from '$lib/types';

// DynamoDB key scheme:
//   PK = ALERT#<alertId>              SK = METADATA                           - direct lookup
//   PK = HOUSEHOLD#<householdId>      SK = ALERT#<triggeredAt>#<alertId>      - listing (sorted by time)

export async function saveAlert(alert: Alert): Promise<Alert> {
    if (IS_MOCK) {
        return mockAlerts.create(alert);
    }
    await Promise.all([
        docClient.send(
            new PutCommand({
                TableName: TABLE_NAME,
                Item: { PK: `ALERT#${alert.alertId}`, SK: 'METADATA', ...alert }
            })
        ),
        docClient.send(
            new PutCommand({
                TableName: TABLE_NAME,
                Item: {
                    PK: `HOUSEHOLD#${alert.householdId}`,
                    SK: `ALERT#${alert.triggeredAt}#${alert.alertId}`,
                    ...alert
                }
            })
        )
    ]);
    return alert;
}

export async function getAlert(alertId: string): Promise<Alert | undefined> {
    if (IS_MOCK) {
        return mockAlerts.findByAlertId(alertId);
    }
    const result = await docClient.send(
        new GetCommand({ TableName: TABLE_NAME, Key: { PK: `ALERT#${alertId}`, SK: 'METADATA' } })
    );
    return result.Item as Alert | undefined;
}

export async function listAlerts(householdId: string, statusFilter?: AlertStatus): Promise<Alert[]> {
    if (IS_MOCK) {
        return mockAlerts.findAllByHouseholdId(householdId, statusFilter);
    }
    const expressionValues: Record<string, unknown> = {
        ':pk': `HOUSEHOLD#${householdId}`,
        ':prefix': 'ALERT#'
    };
    let filterExpression: string | undefined;
    const expressionNames: Record<string, string> = {};
    if (statusFilter !== undefined) {
        filterExpression = '#s = :status';
        expressionNames['#s'] = 'status';
        expressionValues[':status'] = statusFilter;
    }
    const result = await docClient.send(
        new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
            ExpressionAttributeValues: expressionValues,
            ...(filterExpression && { FilterExpression: filterExpression }),
            ...(Object.keys(expressionNames).length > 0 && { ExpressionAttributeNames: expressionNames })
        })
    );
    return (result.Items ?? []) as Alert[];
}

export async function updateAlert(alertId: string, updates: Partial<Alert>): Promise<Alert | undefined> {
    if (IS_MOCK) {
        return mockAlerts.update(alertId, updates);
    }
    const current = await getAlert(alertId);
    if (!current) return undefined;
    const updated = { ...current, ...updates };
    await Promise.all([
        docClient.send(
            new PutCommand({
                TableName: TABLE_NAME,
                Item: { PK: `ALERT#${alertId}`, SK: 'METADATA', ...updated }
            })
        ),
        docClient.send(
            new PutCommand({
                TableName: TABLE_NAME,
                Item: {
                    PK: `HOUSEHOLD#${updated.householdId}`,
                    SK: `ALERT#${updated.triggeredAt}#${alertId}`,
                    ...updated
                }
            })
        )
    ]);
    return updated;
}
