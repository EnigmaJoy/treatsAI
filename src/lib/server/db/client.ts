import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { env } from '$env/dynamic/private';

// What this file does:
// Creates a single DynamoDB client instance that the entire app shares.
// If MOCK_AWS is true, the client is created but all actual calls
// are intercepted by the mock layer in src/lib/server/aws/mock.ts

const isMock = env.MOCK_AWS === 'true';

const dynamoClient = new DynamoDBClient({
    region: env.AWS_REGION ?? 'eu-west-1',
    credentials: isMock
        ? {
            accessKeyId: 'mock_access_key',
            secretAccessKey: 'mock_secret_key'
        }
        : {
            accessKeyId: env.AWS_ACCESS_KEY_ID!,
            secretAccessKey: env.AWS_SECRET_ACCESS_KEY!
        }
});

export const docClient = DynamoDBDocumentClient.from(dynamoClient, {
    marshallOptions: {
        removeUndefinedValues: true
    }
});

export const TABLE_NAME = env.DYNAMODB_TABLE_NAME ?? 'TreatsAI';
export const IS_MOCK = isMock;