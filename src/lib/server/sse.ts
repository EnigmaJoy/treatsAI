import type { SSEEventType } from '$lib/types';

type SSEController = ReadableStreamDefaultController<Uint8Array>;
export const sseClients = new Set<SSEController>();

export function broadcastSSE(type: SSEEventType, data: Record<string, unknown>) {
    const message = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
    const encoded = new TextEncoder().encode(message);
    const dead = new Set<SSEController>();
    for (const client of sseClients) {
        try {
            client.enqueue(encoded);
        } catch {
            dead.add(client);
        }
    }
    dead.forEach(c => sseClients.delete(c));
}
