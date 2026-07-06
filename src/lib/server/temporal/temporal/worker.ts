import { Worker } from '@temporalio/worker';
import * as activities from './activities.js';

export async function startWorker(): Promise<void> {
    const worker = await Worker.create({
        workflowsPath: new URL('./workflows.js', import.meta.url).pathname,
        activities,
        taskQueue: 'treatsai',
        connection: undefined // connects to localhost:7233 by default
    });

    await worker.run();
}

// Start worker when run directly
startWorker().catch((err) => {
    console.error('Worker failed:', err);
    process.exit(1);
});
