import { json } from '@sveltejs/kit';
import { mockDevices } from '$lib/server/aws/mock';
import { getAuthenticatedUser } from '$lib/server/auth';
import { broadcastSSE } from '$lib/server/sse';
import type { Device } from '$lib/types';

async function getOrCreateDevice(householdId: string): Promise<Device> {
    const existing = await mockDevices.get(householdId);
    if (existing) return existing;

    const now = new Date().toISOString();
    const device: Device = {
        deviceId: crypto.randomUUID(),
        householdId,
        status: 'online',
        foodReservoirPercent: 75,
        currentFoodTypeLabel: 'Whiskas Tuna',
        lastDispenseAt: undefined,
        cameraStatus: 'idle',
        firmwareVersion: '1.0.0',
        createdAt: now,
        updatedAt: now
    };
    await mockDevices.upsert(device);
    return device;
}

export async function GET({ request }: { request: Request }) {
    try {
        const auth = await getAuthenticatedUser(request);
        if (!auth) {
            return json(
                { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or missing session token' } },
                { status: 401 }
            );
        }

        const device = await getOrCreateDevice(auth.householdId);

        return json(
            {
                success: true,
                data: {
                    deviceId: device.deviceId,
                    status: device.status,
                    foodReservoirPercent: device.foodReservoirPercent,
                    currentFoodTypeLabel: device.currentFoodTypeLabel,
                    lastDispenseAt: device.lastDispenseAt,
                    cameraStatus: device.cameraStatus,
                    firmwareVersion: device.firmwareVersion
                }
            },
            { status: 200 }
        );
    } catch {
        return json(
            { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
            { status: 500 }
        );
    }
}

export async function PATCH({ request }: { request: Request }) {
    try {
        const auth = await getAuthenticatedUser(request);
        if (!auth) {
            return json(
                { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or missing session token' } },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { foodReservoirPercent } = body;

        if (foodReservoirPercent !== undefined) {
            if (typeof foodReservoirPercent !== 'number' || foodReservoirPercent < 0 || foodReservoirPercent > 100) {
                return json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'foodReservoirPercent must be a number between 0 and 100' } }, { status: 422 });
            }
        }

        const updates: Partial<Pick<Device, 'foodReservoirPercent' | 'currentFoodTypeLabel'>> = {};
        if (body.foodReservoirPercent !== undefined) updates.foodReservoirPercent = body.foodReservoirPercent;
        if (body.currentFoodTypeLabel !== undefined) updates.currentFoodTypeLabel = body.currentFoodTypeLabel;

        const device = await getOrCreateDevice(auth.householdId);
        const now = new Date().toISOString();
        const updated = await mockDevices.upsert({ ...device, ...updates, updatedAt: now });

        broadcastSSE('device_status', {
            deviceId: updated.deviceId,
            status: updated.status,
            foodReservoirPercent: updated.foodReservoirPercent,
            cameraStatus: updated.cameraStatus
        });

        return json(
            {
                success: true,
                data: {
                    deviceId: updated.deviceId,
                    foodReservoirPercent: updated.foodReservoirPercent,
                    currentFoodTypeLabel: updated.currentFoodTypeLabel,
                    updatedAt: updated.updatedAt
                }
            },
            { status: 200 }
        );
    } catch {
        return json(
            { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
            { status: 500 }
        );
    }
}
