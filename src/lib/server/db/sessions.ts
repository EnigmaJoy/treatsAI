import { GetCommand, PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME } from './client';

// DynamoDB key scheme for sessions:
//   PK = SESSION#<token>   (enables O(1) lookup by the cookie value)
//   SK = METADATA
//
// In-memory fallback: when DynamoDB is unavailable (wrong credentials, missing table,
// network error, etc.) the fallback store is used automatically. The real DynamoDB error
// is logged to the console so you can diagnose it without the app becoming unusable.
// Note: the fallback store resets on server restart - sessions must be re-created by
// logging in again after a restart when DynamoDB is not available.

const SK = 'METADATA';

function pk(token: string) {
    return `SESSION#${token}`;
}

export interface SessionRecord {
    sessionId: string;
    userId: string;
    householdId: string;
    token: string;
    createdAt: string;
    expiresAt: string;
    userAgent?: string;
}

const fallbackStore = new Map<string, SessionRecord>();

export async function putSession(session: SessionRecord): Promise<void> {
    try {
        await docClient.send(
            new PutCommand({
                TableName: TABLE_NAME,
                Item: { PK: pk(session.token), SK, ...session }
            })
        );
    } catch (err) {
        console.error('[sessions] DynamoDB putSession failed - falling back to in-memory store. Error:', err);
        fallbackStore.set(session.token, session);
    }
}

export async function getSessionByToken(token: string): Promise<SessionRecord | null> {
    try {
        const result = await docClient.send(
            new GetCommand({
                TableName: TABLE_NAME,
                Key: { PK: pk(token), SK }
            })
        );
        if (result.Item) {
            return result.Item as SessionRecord;
        }
        // DynamoDB succeeded but returned no item - also check fallback in case this
        // session was written to the fallback during a previous DynamoDB outage
        return fallbackStore.get(token) ?? null;
    } catch (err) {
        console.error('[sessions] DynamoDB getSessionByToken failed - checking in-memory fallback. Error:', err);
        return fallbackStore.get(token) ?? null;
    }
}

export async function deleteSessionByToken(token: string): Promise<void> {
    // Always remove from fallback immediately so it cannot be replayed
    fallbackStore.delete(token);
    try {
        await docClient.send(
            new DeleteCommand({
                TableName: TABLE_NAME,
                Key: { PK: pk(token), SK }
            })
        );
    } catch (err) {
        console.error('[sessions] DynamoDB deleteSessionByToken failed. Session removed from in-memory fallback only. Error:', err);
    }
}
