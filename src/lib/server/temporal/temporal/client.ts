import { Client, Connection } from '@temporalio/client';

let _clientPromise: Promise<Client> | null = null;

export function getTemporalClient(): Promise<Client> {
    return (_clientPromise ??= Connection.connect({ address: 'localhost:7233' })
        .then((connection) => new Client({ connection })));
}

export const TASK_QUEUE = 'treatsai';
