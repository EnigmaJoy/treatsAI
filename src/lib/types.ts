// Core TreatsAI types - shared across frontend and backend

export type WeightGoal = 'weight_loss' | 'maintenance' | 'weight_gain';
export type FeedingOutcome = 'dispensed' | 'skipped' | 'rejected';
export type AlertType = 'skip_meal' | 'baseline_deviation' | 'weight_reminder' | 'low_food_level';
export type AlertStatus = 'active' | 'acknowledged';
export type DeviceStatus = 'online' | 'offline';
export type CameraStatus = 'active' | 'idle';
export type UserRole = 'primary_owner' | 'co_owner';
export type CoOwnerRole = 'editor' | 'viewer';
export type Language = 'en' | 'it' | 'es';
export type SessionPolicy = 'standard' | 'remember_me';
export type ScheduleStatus = 'active' | 'paused';

export interface Cat {
    catId: string;
    householdId: string;
    name: string;
    dateOfBirth?: string;
    breed?: string;
    currentWeightKg: number;
    targetWeightKg?: number;
    weightGoal: WeightGoal;
    consumptionBaseline: number;
    suggestedPortionGrams?: number;
    photoS3Keys: string[];
    rekognitionCollectionId: string;
    microchipNumber?: string;
    weightReminderInterval: 3 | 7 | 14;
    createdAt: string;
    updatedAt: string;
}

export interface FeedingEvent {
    eventId: string;
    catId: string;
    scheduleId: string;
    householdId: string;
    timestamp: string;
    outcome: FeedingOutcome;
    confidenceScore: number;
    portionDispensedGrams?: number;
    consumptionPercent?: number;
    foodTypeLabel?: string;
    manualOverride: boolean;
}

export interface FeedingTime {
    time: string;
    portionGrams: number;
    suggestedPortionGrams?: number;
}

export interface Schedule {
    scheduleId: string;
    catId: string;
    householdId: string;
    feedingTimes: FeedingTime[];
    status: ScheduleStatus;
    temporalWorkflowId: string;
    createdAt: string;
    updatedAt: string;
}

export interface Alert {
    alertId: string;
    householdId: string;
    catId?: string;
    catName?: string;
    type: AlertType;
    status: AlertStatus;
    triggeredAt: string;
    acknowledgedAt?: string;
    acknowledgedBy?: string;
    metadata?: Record<string, unknown>;
}

export interface WeightEntry {
    weightEntryId: string;
    catId: string;
    householdId: string;
    weightKg: number;
    loggedAt: string;
    loggedBy: string;
    notes?: string;
}

export interface Device {
    deviceId: string;
    householdId: string;
    status: DeviceStatus;
    foodReservoirPercent: number;
    currentFoodTypeLabel?: string;
    lastDispenseAt?: string;
    cameraStatus: CameraStatus;
    firmwareVersion: string;
    createdAt: string;
    updatedAt: string;
}

export interface User {
    userId: string;
    email: string;
    role: UserRole;
    householdId: string;
    coOwnerRole?: CoOwnerRole;
    language: Language;
    twoFactorEnabled: boolean;
    sessionPolicy: SessionPolicy;
    createdAt: string;
    updatedAt: string;
}

export interface Household {
    householdId: string;
    primaryOwnerId: string;
    name?: string;
    createdAt: string;
}

// API response envelope
export interface ApiSuccess<T> {
    success: true;
    data: T;
}

export interface ApiError {
    success: false;
    error: {
        code: string;
        message: string;
    };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// SSE event types
export type SSEEventType =
    | 'feeding_event'
    | 'alert_triggered'
    | 'alert_dismissed'
    | 'device_status'
    | 'weight_reminder';

export interface SSEEvent {
    type: SSEEventType;
    data: Record<string, unknown>;
}