// Mock AWS services for local development
// When MOCK_AWS=true, all AWS calls return realistic fake data
// When MOCK_AWS=false, real AWS services are used
// Swap is seamless - the rest of the app never knows the difference

import type {
    Alert,
    AlertStatus,
    Cat,
    Device,
    FeedingEvent,
    Household,
    Schedule,
    User,
    WeightEntry
} from '$lib/types';

// ---------------------------------------------------------------------------
// Session type (not in types.ts)
// ---------------------------------------------------------------------------

interface Session {
    sessionId: string;
    userId: string;
    householdId: string;
    token: string;
    createdAt: string;
    expiresAt: string;
    userAgent?: string;
    current?: boolean;
}

// ---------------------------------------------------------------------------
// In-memory singleton stores (reset on server restart)
// ---------------------------------------------------------------------------

const mockFaceCollection: Record<string, string[]> = {};

const mockFeedingEventsStore: FeedingEvent[] = [];
const mockUsersStore: User[] = [];
const mockHouseholdsStore: Household[] = [];
const mockSessionsStore: Session[] = [];
const mockCatsStore: Cat[] = [];
const mockSchedulesStore: Schedule[] = [];
const mockAlertsStore: Alert[] = [];
const mockWeightEntriesStore: WeightEntry[] = [];
const mockDevicesStore: Device[] = [];

// ---------------------------------------------------------------------------
// Mock Rekognition - simulates cat face recognition
// ---------------------------------------------------------------------------

export const mockRekognition = {
    // Simulate indexing cat photos into a Rekognition collection
    indexFaces: async (catId: string, photoCount: number) => {
        mockFaceCollection[catId] = Array.from(
            { length: photoCount },
            (_, i) => `mock-face-id-${catId}-${i}`
        );
        return {
            faceIds: mockFaceCollection[catId],
            indexedCount: photoCount
        };
    },

    // Simulate searching for a cat face - returns a realistic confidence score
    searchFacesByImage: async (catId: string) => {
        const hasFaces = mockFaceCollection[catId]?.length > 0;

        // Simulate realistic confidence scores
        // 85% chance of high confidence match (dispensed)
        // 10% chance of low confidence (rejected)
        // 5% chance of no match (skipped)
        const random = Math.random();
        if (!hasFaces || random < 0.05) {
            return { matched: false, confidence: 0, outcome: 'skipped' as const };
        } else if (random < 0.15) {
            return {
                matched: false,
                confidence: Math.random() * 30 + 50, // 50-80%
                outcome: 'rejected' as const
            };
        } else {
            return {
                matched: true,
                confidence: Math.random() * 9 + 91, // 91-100%
                outcome: 'dispensed' as const
            };
        }
    }
};

// ---------------------------------------------------------------------------
// Mock DynamoDB - simulates database operations
// ---------------------------------------------------------------------------

export const mockDB = {
    // Save a feeding event
    putFeedingEvent: async (event: FeedingEvent) => {
        // Guard against duplicate eventIds
        if (mockFeedingEventsStore.some((e) => e.eventId === event.eventId)) return { ...event };
        mockFeedingEventsStore.push(event);
        return { ...event };
    },

    // Get all feeding events for a cat
    getFeedingEvents: async (catId: string) => {
        return mockFeedingEventsStore
            .filter((e) => e.catId === catId)
            .map((e) => ({ ...e }));
    },

    // Get all feeding events for a household
    getHouseholdFeedingEvents: async (householdId: string) => {
        return mockFeedingEventsStore
            .filter((e) => e.householdId === householdId)
            .map((e) => ({ ...e }));
    },

    // Get feeding events with optional filters (cursor = timestamp string)
    getFeedingEventsFiltered: async (
        catId: string,
        opts: {
            from?: string;
            to?: string;
            outcome?: string;
            limit?: number;
            cursor?: string;
        }
    ): Promise<FeedingEvent[]> => {
        let results = mockFeedingEventsStore.filter((e) => e.catId === catId);

        if (opts.cursor) {
            // cursor is an exclusive continuation token and takes precedence over from as the lower bound
            const lowerBound = opts.from && opts.from > opts.cursor ? opts.from : opts.cursor;
            results = results.filter((e) => e.timestamp > lowerBound);
        } else if (opts.from) {
            results = results.filter((e) => e.timestamp >= opts.from!);
        }

        if (opts.to) {
            results = results.filter((e) => e.timestamp <= opts.to!);
        }
        if (opts.outcome) {
            results = results.filter((e) => e.outcome === opts.outcome);
        }

        // Sort ascending by timestamp before applying limit
        results = results.sort((a, b) => (a.timestamp < b.timestamp ? -1 : 1));

        if (opts.limit !== undefined && opts.limit > 0) {
            results = results.slice(0, opts.limit);
        }

        return results.map((e) => ({ ...e }));
    }
};

// ---------------------------------------------------------------------------
// Mock S3 - simulates photo storage
// ---------------------------------------------------------------------------

export const mockS3 = {
    // Simulate uploading a photo - returns a fake S3 key
    uploadPhoto: async (catId: string, fileName: string) => {
        return `cats/${catId}/${fileName}`;
    },

    // Simulate generating a pre-signed URL for a photo
    getPresignedUrl: async (s3Key: string) => {
        return `https://mock-s3.treatsai.local/${s3Key}`;
    }
};

// ---------------------------------------------------------------------------
// mockUsers
// ---------------------------------------------------------------------------

export const mockUsers = {
    create: async (user: User): Promise<User> => {
        mockUsersStore.push(user);
        return { ...user };
    },

    findByEmail: async (email: string): Promise<User | undefined> => {
        const item = mockUsersStore.find((u) => u.email === email);
        return item ? { ...item } : undefined;
    },

    findByUserId: async (userId: string): Promise<User | undefined> => {
        const item = mockUsersStore.find((u) => u.userId === userId);
        return item ? { ...item } : undefined;
    },

    update: async (userId: string, updates: Partial<User>): Promise<User | undefined> => {
        const idx = mockUsersStore.findIndex((u) => u.userId === userId);
        if (idx === -1) return undefined;
        mockUsersStore[idx] = { ...mockUsersStore[idx], ...updates };
        return { ...mockUsersStore[idx] };
    }
};

// ---------------------------------------------------------------------------
// mockHouseholds
// ---------------------------------------------------------------------------

export const mockHouseholds = {
    create: async (household: Household): Promise<Household> => {
        mockHouseholdsStore.push(household);
        return { ...household };
    },

    findByHouseholdId: async (householdId: string): Promise<Household | undefined> => {
        const item = mockHouseholdsStore.find((h) => h.householdId === householdId);
        return item ? { ...item } : undefined;
    }
};

// ---------------------------------------------------------------------------
// mockSessions
// ---------------------------------------------------------------------------

export const mockSessions = {
    create: async (session: Session): Promise<Session> => {
        mockSessionsStore.push(session);
        return { ...session };
    },

    findByToken: async (token: string): Promise<Session | undefined> => {
        const item = mockSessionsStore.find((s) => s.token === token);
        return item ? { ...item } : undefined;
    },

    findAllByUserId: async (userId: string): Promise<Session[]> => {
        return mockSessionsStore
            .filter((s) => s.userId === userId)
            .map((s) => ({ ...s }));
    },

    deleteBySessionId: async (sessionId: string): Promise<void> => {
        const idx = mockSessionsStore.findIndex((s) => s.sessionId === sessionId);
        if (idx !== -1) mockSessionsStore.splice(idx, 1);
    },

    deleteByToken: async (token: string): Promise<void> => {
        const idx = mockSessionsStore.findIndex((s) => s.token === token);
        if (idx !== -1) mockSessionsStore.splice(idx, 1);
    }
};

// ---------------------------------------------------------------------------
// mockCats
// ---------------------------------------------------------------------------

export const mockCats = {
    create: async (cat: Cat): Promise<Cat> => {
        mockCatsStore.push(cat);
        return { ...cat };
    },

    findByCatId: async (catId: string): Promise<Cat | undefined> => {
        const item = mockCatsStore.find((c) => c.catId === catId);
        return item ? { ...item } : undefined;
    },

    findAllByHouseholdId: async (householdId: string): Promise<Cat[]> => {
        return mockCatsStore
            .filter((c) => c.householdId === householdId)
            .map((c) => ({ ...c }));
    },

    update: async (catId: string, updates: Partial<Cat>): Promise<Cat | undefined> => {
        const idx = mockCatsStore.findIndex((c) => c.catId === catId);
        if (idx === -1) return undefined;
        mockCatsStore[idx] = { ...mockCatsStore[idx], ...updates };
        return { ...mockCatsStore[idx] };
    },

    delete: async (catId: string): Promise<void> => {
        const idx = mockCatsStore.findIndex((c) => c.catId === catId);
        if (idx !== -1) mockCatsStore.splice(idx, 1);
    }
};

// ---------------------------------------------------------------------------
// mockSchedules
// ---------------------------------------------------------------------------

export const mockSchedules = {
    create: async (schedule: Schedule): Promise<Schedule> => {
        mockSchedulesStore.push(schedule);
        return { ...schedule };
    },

    findByScheduleId: async (scheduleId: string): Promise<Schedule | undefined> => {
        const item = mockSchedulesStore.find((s) => s.scheduleId === scheduleId);
        return item ? { ...item } : undefined;
    },

    findAllByCatId: async (catId: string): Promise<Schedule[]> => {
        return mockSchedulesStore
            .filter((s) => s.catId === catId)
            .map((s) => ({ ...s }));
    },

    findAllByHouseholdId: async (householdId: string): Promise<Schedule[]> => {
        return mockSchedulesStore
            .filter((s) => s.householdId === householdId)
            .map((s) => ({ ...s }));
    },

    update: async (scheduleId: string, updates: Partial<Schedule>): Promise<Schedule | undefined> => {
        const idx = mockSchedulesStore.findIndex((s) => s.scheduleId === scheduleId);
        if (idx === -1) return undefined;
        mockSchedulesStore[idx] = { ...mockSchedulesStore[idx], ...updates };
        return { ...mockSchedulesStore[idx] };
    },

    delete: async (scheduleId: string): Promise<void> => {
        const idx = mockSchedulesStore.findIndex((s) => s.scheduleId === scheduleId);
        if (idx !== -1) mockSchedulesStore.splice(idx, 1);
    }
};

// ---------------------------------------------------------------------------
// mockAlerts
// ---------------------------------------------------------------------------

export const mockAlerts = {
    create: async (alert: Alert): Promise<Alert> => {
        mockAlertsStore.push(alert);
        return { ...alert };
    },

    findByAlertId: async (alertId: string): Promise<Alert | undefined> => {
        const item = mockAlertsStore.find((a) => a.alertId === alertId);
        return item ? { ...item } : undefined;
    },

    findAllByHouseholdId: async (
        householdId: string,
        statusFilter?: AlertStatus
    ): Promise<Alert[]> => {
        let results = mockAlertsStore.filter((a) => a.householdId === householdId);
        if (statusFilter !== undefined) {
            results = results.filter((a) => a.status === statusFilter);
        }
        return results.map((a) => ({ ...a }));
    },

    update: async (alertId: string, updates: Partial<Alert>): Promise<Alert | undefined> => {
        const idx = mockAlertsStore.findIndex((a) => a.alertId === alertId);
        if (idx === -1) return undefined;
        mockAlertsStore[idx] = { ...mockAlertsStore[idx], ...updates };
        return { ...mockAlertsStore[idx] };
    }
};

// ---------------------------------------------------------------------------
// mockWeightEntries
// ---------------------------------------------------------------------------

export const mockWeightEntries = {
    create: async (entry: WeightEntry): Promise<WeightEntry> => {
        mockWeightEntriesStore.push(entry);
        return { ...entry };
    },

    findAllByCatId: async (catId: string): Promise<WeightEntry[]> => {
        return mockWeightEntriesStore
            .filter((w) => w.catId === catId)
            .sort((a, b) => (a.loggedAt < b.loggedAt ? -1 : 1))
            .map((w) => ({ ...w }));
    }
};

// ---------------------------------------------------------------------------
// mockDevices
// ---------------------------------------------------------------------------

export const mockDevices = {
    upsert: async (device: Device): Promise<Device> => {
        // Critical #1: match on deviceId (actual PK), not householdId
        const idx = mockDevicesStore.findIndex((d) => d.deviceId === device.deviceId);
        if (idx === -1) {
            mockDevicesStore.push(device);
        } else {
            mockDevicesStore[idx] = { ...device };
        }
        return { ...device };
    },

    get: async (householdId: string): Promise<Device | undefined> => {
        const item = mockDevicesStore.find((d) => d.householdId === householdId);
        return item ? { ...item } : undefined;
    }
};