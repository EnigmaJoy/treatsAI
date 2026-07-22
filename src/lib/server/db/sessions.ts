import { GetCommand, PutCommand, DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME, IS_MOCK } from './client';
import { mockSessions } from '$lib/server/aws/mock';

// DynamoDB key scheme for sessions:
//   PK = SESSION#<token>          SK = METADATA  - full session record
//   PK = USERSESSIONS#<userId>    SK = <sessionId> - user-to-sessions index for listing
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

function userSessionsPk(userId: string) {
    return `USERSESSIONS#${userId}`;
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
    if (IS_MOCK) {
        fallbackStore.set(session.token, session);
        return;
    }
    try {
        await Promise.all([
            docClient.send(
                new PutCommand({
                    TableName: TABLE_NAME,
                    Item: { PK: pk(session.token), SK, ...session }
                })
            ),
            docClient.send(
                new PutCommand({
                    TableName: TABLE_NAME,
                    Item: {
                        PK: userSessionsPk(session.userId),
                        SK: session.sessionId,
                        token: session.token,
                        sessionId: session.sessionId,
                        userId: session.userId,
                        expiresAt: session.expiresAt,
                        userAgent: session.userAgent,
                        createdAt: session.createdAt
                    }
                })
            )
        ]);
    } catch (err) {
        console.error('[sessions] DynamoDB putSession failed - falling back to in-memory store. Error:', err);
        fallbackStore.set(session.token, session);
    }
}

export async function getSessionByToken(token: string): Promise<SessionRecord | null> {
    if (IS_MOCK) {
        return fallbackStore.get(token) ?? null;
    }
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
    fallbackStore.delete(token);
    if (IS_MOCK) return;
    try {
        // Get session first to know userId and sessionId for index cleanup
        const result = await docClient.send(
            new GetCommand({ TableName: TABLE_NAME, Key: { PK: pk(token), SK } })
        );
        const delOps: Promise<unknown>[] = [
            docClient.send(new DeleteCommand({ TableName: TABLE_NAME, Key: { PK: pk(token), SK } }))
        ];
        if (result.Item) {
            const session = result.Item as SessionRecord;
            delOps.push(
                docClient.send(
                    new DeleteCommand({
                        TableName: TABLE_NAME,
                        Key: { PK: userSessionsPk(session.userId), SK: session.sessionId }
                    })
                )
            );
        }
        await Promise.all(delOps);
    } catch (err) {
        console.error('[sessions] DynamoDB deleteSessionByToken failed. Session removed from in-memory fallback only. Error:', err);
    }
}

export async function listSessionsByUserId(userId: string): Promise<SessionRecord[]> {
    if (IS_MOCK) {
        return [...fallbackStore.values()].filter((s) => s.userId === userId);
    }
    try {
        const result = await docClient.send(
            new QueryCommand({
                TableName: TABLE_NAME,
                KeyConditionExpression: 'PK = :pk',
                ExpressionAttributeValues: { ':pk': userSessionsPk(userId) }
            })
        );
        const sessions = await Promise.all(
            (result.Items ?? []).map((item) => getSessionByToken(item.token as string))
        );
        return sessions.filter((s): s is SessionRecord => s !== null);
    } catch (err) {
        console.error('[sessions] DynamoDB listSessionsByUserId failed - using in-memory fallback. Error:', err);
        return [...fallbackStore.values()].filter((s) => s.userId === userId);
    }
}

export async function deleteSessionBySessionId(sessionId: string, userId: string): Promise<void> {
    if (IS_MOCK) {
        // In mock mode, sessions are in fallbackStore keyed by token
        for (const [token, session] of fallbackStore.entries()) {
            if (session.sessionId === sessionId) {
                fallbackStore.delete(token);
                return;
            }
        }
        return;
    }
    try {
        const indexResult = await docClient.send(
            new GetCommand({
                TableName: TABLE_NAME,
                Key: { PK: userSessionsPk(userId), SK: sessionId }
            })
        );
        if (!indexResult.Item) return;
        const token = indexResult.Item.token as string;
        await Promise.all([
            docClient.send(new DeleteCommand({ TableName: TABLE_NAME, Key: { PK: pk(token), SK } })),
            docClient.send(
                new DeleteCommand({ TableName: TABLE_NAME, Key: { PK: userSessionsPk(userId), SK: sessionId } })
            )
        ]);
        fallbackStore.delete(token);
    } catch (err) {
        console.error('[sessions] DynamoDB deleteSessionBySessionId failed. Error:', err);
        for (const [token, session] of fallbackStore.entries()) {
            if (session.sessionId === sessionId) {
                fallbackStore.delete(token);
                return;
            }
        }
    }
}
