import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME, IS_MOCK } from './client';
import { mockUsers } from '$lib/server/aws/mock';
import type { User } from '$lib/types';

// DynamoDB key scheme:
//   PK = USER#<userId>      SK = METADATA   - full user record (including passwordHash)
//   PK = EMAIL#<email>      SK = USER        - email-to-userId lookup

export type UserWithHash = User & { passwordHash: string };

export async function saveUser(user: UserWithHash): Promise<UserWithHash> {
    if (IS_MOCK) {
        return mockUsers.create(user) as Promise<UserWithHash>;
    }
    await Promise.all([
        docClient.send(
            new PutCommand({
                TableName: TABLE_NAME,
                Item: { PK: `USER#${user.userId}`, SK: 'METADATA', ...user }
            })
        ),
        docClient.send(
            new PutCommand({
                TableName: TABLE_NAME,
                Item: { PK: `EMAIL#${user.email}`, SK: 'USER', userId: user.userId, email: user.email }
            })
        )
    ]);
    return user;
}

export async function getUserByEmail(email: string): Promise<UserWithHash | undefined> {
    if (IS_MOCK) {
        return mockUsers.findByEmail(email) as Promise<UserWithHash | undefined>;
    }
    const lookupResult = await docClient.send(
        new GetCommand({ TableName: TABLE_NAME, Key: { PK: `EMAIL#${email}`, SK: 'USER' } })
    );
    if (!lookupResult.Item) return undefined;
    const { userId } = lookupResult.Item as { userId: string };
    const userResult = await docClient.send(
        new GetCommand({ TableName: TABLE_NAME, Key: { PK: `USER#${userId}`, SK: 'METADATA' } })
    );
    return userResult.Item as UserWithHash | undefined;
}

export async function getUserById(userId: string): Promise<UserWithHash | undefined> {
    if (IS_MOCK) {
        return mockUsers.findByUserId(userId) as Promise<UserWithHash | undefined>;
    }
    const result = await docClient.send(
        new GetCommand({ TableName: TABLE_NAME, Key: { PK: `USER#${userId}`, SK: 'METADATA' } })
    );
    return result.Item as UserWithHash | undefined;
}
