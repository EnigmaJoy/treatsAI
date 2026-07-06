import { getAuthenticatedUser } from '$lib/server/auth';
import { sseClients, broadcastSSE } from '$lib/server/sse';

export async function GET({ request }: { request: Request }) {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
        return new Response(
            JSON.stringify({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or missing session token' } }),
            { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
    }

    try {
        let controller: ReadableStreamDefaultController<Uint8Array>;
        let heartbeatInterval: ReturnType<typeof setInterval>;

        const stream = new ReadableStream<Uint8Array>({
            start(ctrl) {
                controller = ctrl;
                sseClients.add(ctrl);
                // Send initial connected event
                const msg = `event: connected\ndata: ${JSON.stringify({ connected: true })}\n\n`;
                ctrl.enqueue(new TextEncoder().encode(msg));

                // Send periodic heartbeat every 30s
                heartbeatInterval = setInterval(() => {
                    try {
                        const hb = `event: heartbeat\ndata: ${JSON.stringify({ ts: new Date().toISOString() })}\n\n`;
                        ctrl.enqueue(new TextEncoder().encode(hb));
                    } catch {
                        clearInterval(heartbeatInterval);
                        sseClients.delete(ctrl);
                    }
                }, 30000);
            },
            cancel() {
                clearInterval(heartbeatInterval);
                sseClients.delete(controller);
            }
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no'
            }
        });
    } catch {
        return new Response(
            JSON.stringify({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

