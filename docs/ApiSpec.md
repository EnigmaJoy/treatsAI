# API Specification
## TreatsAI - Smart Food, Zero Judgment 🐾

**Version:** 1.2  
**Date:** July 1, 2026  
**Author:** Joselyn Grace Gordillo Lopez  
**Hackathon:** Hack the Kitty - World Cat Domination Day  
**Base URL:** `https://api.treatsai.app/v1`  
**Local URL:** `http://localhost:5173/api/v1`

---

## 1. Conventions

### 1.1 HTTP Methods
| Method | Usage |
|---|---|
| `GET` | Retrieve data, no side effects |
| `POST` | Create a new resource |
| `PUT` | Replace an entire resource |
| `PATCH` | Update specific fields of a resource |
| `DELETE` | Remove a resource |

### 1.2 Authentication
All endpoints (except `POST /auth/register` and `POST /auth/login`) require a valid session token passed as a Bearer token in the `Authorization` header:

```
Authorization: Bearer <session_token>
```

### 1.3 Response Format
All responses return JSON with the following envelope:

**Success:**
```json
{
  "success": true,
  "data": { }
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description"
  }
}
```

### 1.4 Standard Error Codes
| Code | HTTP Status | Meaning |
|---|---|---|
| `UNAUTHORIZED` | 401 | Missing or invalid session token |
| `FORBIDDEN` | 403 | Authenticated but insufficient permissions |
| `NOT_FOUND` | 404 | Resource does not exist |
| `VALIDATION_ERROR` | 422 | Request body failed validation |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

### 1.5 Timestamps
All timestamps are in **ISO 8601 format, UTC** (e.g. `"2026-06-30T14:00:00Z"`).

### 1.6 IDs
All resource IDs are **UUID v4** strings (e.g. `"550e8400-e29b-41d4-a716-446655440000"`).

---

## 2. Authentication - `/auth`

### POST `/auth/register`
Create a new Primary Owner account.

**Request body:**
```json
{
  "email": "grace@example.com",
  "password": "minimum 8 characters",
  "language": "en"
}
```

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "email": "grace@example.com",
    "householdId": "uuid",
    "language": "en",
    "createdAt": "2026-06-30T14:00:00Z"
  }
}
```

---

### POST `/auth/login`
Authenticate an existing owner and receive a session token.

**Request body:**
```json
{
  "email": "grace@example.com",
  "password": "your_password",
  "rememberMe": false
}
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "sessionToken": "string",
    "expiresAt": "2026-07-07T14:00:00Z",
    "twoFactorRequired": false,
    "userId": "uuid"
  }
}
```

> If `twoFactorRequired` is `true`, the session token is not yet valid. The client must complete 2FA via `POST /auth/verify-otp` first.

---

### POST `/auth/verify-otp`
Verify the Email OTP code sent during 2FA login.

**Request body:**
```json
{
  "userId": "uuid",
  "otpCode": "123456"
}
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "sessionToken": "string",
    "expiresAt": "2026-07-07T14:00:00Z"
  }
}
```

---

### POST `/auth/logout`
Invalidate the current session token.

**Request body:** none

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "message": "Session invalidated successfully"
  }
}
```

---

### GET `/auth/sessions`
List all active sessions for the authenticated user.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "sessionId": "uuid",
        "createdAt": "2026-06-30T14:00:00Z",
        "expiresAt": "2026-07-07T14:00:00Z",
        "userAgent": "Mozilla/5.0...",
        "current": true
      }
    ]
  }
}
```

---

### DELETE `/auth/sessions/:sessionId`
Revoke a specific session (log out a device remotely).

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "message": "Session revoked successfully"
  }
}
```

---

## 3. Cats - `/cats`

### POST `/cats`
Create a new cat profile.

**Request body:**
```json
{
  "name": "Aloy",
  "dateOfBirth": "2020-03-15",
  "breed": "Tabby",
  "currentWeightKg": 4.2,
  "weightGoal": "maintenance",
  "targetWeightKg": null,
  "consumptionBaseline": 100,
  "weightReminderInterval": 7
}
```

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "catId": "uuid",
    "householdId": "uuid",
    "name": "Aloy",
    "dateOfBirth": "2020-03-15",
    "breed": "Tabby",
    "currentWeightKg": 4.2,
    "weightGoal": "maintenance",
    "targetWeightKg": null,
    "consumptionBaseline": 100,
    "weightReminderInterval": 7,
    "rekognitionCollectionId": "uuid",
    "createdAt": "2026-06-30T14:00:00Z"
  }
}
```

---

### GET `/cats`
List all cat profiles for the authenticated owner's household.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "cats": [
      {
        "catId": "uuid",
        "householdId": "uuid",
        "name": "Aloy",
        "currentWeightKg": 4.2,
        "weightGoal": "maintenance",
        "consumptionBaseline": 100,
        "createdAt": "2026-06-30T14:00:00Z"
      }
    ]
  }
}
```

---

### GET `/cats/:catId`
Get a single cat profile by ID.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "catId": "uuid",
    "householdId": "uuid",
    "name": "Aloy",
    "dateOfBirth": "2020-03-15",
    "breed": "Tabby",
    "currentWeightKg": 4.2,
    "targetWeightKg": null,
    "weightGoal": "maintenance",
    "consumptionBaseline": 100,
    "weightReminderInterval": 7,
    "photoS3Keys": ["cats/uuid/photo1.jpg"],
    "rekognitionCollectionId": "uuid",
    "microchipNumber": null,
    "createdAt": "2026-06-30T14:00:00Z",
    "updatedAt": "2026-06-30T14:00:00Z"
  }
}
```

---

### PATCH `/cats/:catId`
Update specific fields of a cat profile.

**Request body** (all fields optional - send only what changes):
```json
{
  "name": "Aloy",
  "currentWeightKg": 4.0,
  "weightGoal": "weight_loss",
  "targetWeightKg": 3.5,
  "consumptionBaseline": 90,
  "weightReminderInterval": 14,
  "microchipNumber": "123456789012345"
}
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "catId": "uuid",
    "updatedAt": "2026-06-30T15:00:00Z"
  }
}
```

---

### DELETE `/cats/:catId`
Delete a cat profile and all associated data (feeding events, schedules, Rekognition collection).

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "message": "Cat profile and all associated data deleted successfully"
  }
}
```

---

### POST `/cats/:catId/photos`
Upload training photos for AWS Rekognition face collection.

**Request:** `multipart/form-data`
```
photos: File[] (min 3, max 10, JPEG or PNG only, max 15MB each)
```

> **Format constraint:** AWS Rekognition supports JPEG and PNG only - this is a hard AWS limit, not a TreatsAI choice. RAW, HEIC, and HEIF formats are not accepted. iPhone users shooting in HEIC or RAW format must convert to JPEG before uploading. The onboarding UI displays this guidance explicitly during the photo upload step.

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "uploadedCount": 5,
    "s3Keys": ["cats/uuid/photo1.jpg", "cats/uuid/photo2.jpg"],
    "rekognitionFaceIds": ["face-id-1", "face-id-2"]
  }
}
```

---

## 4. Feeding Schedules - `/cats/:catId/schedules`

### POST `/cats/:catId/schedules`
Create a feeding schedule for a cat.

**Request body:**
```json
{
  "feedingTimes": [
    { "time": "08:00", "portionGrams": 80 },
    { "time": "18:00", "portionGrams": 80 }
  ]
}
```

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "scheduleId": "uuid",
    "catId": "uuid",
    "feedingTimes": [
      {
        "time": "08:00",
        "portionGrams": 80,
        "suggestedPortionGrams": 75
      },
      {
        "time": "18:00",
        "portionGrams": 80,
        "suggestedPortionGrams": 75
      }
    ],
    "status": "active",
    "temporalWorkflowId": "string",
    "createdAt": "2026-06-30T14:00:00Z"
  }
}
```

---

### GET `/cats/:catId/schedules`
List all schedules for a cat.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "schedules": [
      {
        "scheduleId": "uuid",
        "feedingTimes": [
          { "time": "08:00", "portionGrams": 80 }
        ],
        "status": "active",
        "createdAt": "2026-06-30T14:00:00Z"
      }
    ]
  }
}
```

---

### PATCH `/cats/:catId/schedules/:scheduleId`
Update or pause a feeding schedule.

**Request body:**
```json
{
  "status": "paused",
  "feedingTimes": [
    { "time": "09:00", "portionGrams": 70 }
  ]
}
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "scheduleId": "uuid",
    "status": "paused",
    "updatedAt": "2026-06-30T15:00:00Z"
  }
}
```

---

### DELETE `/cats/:catId/schedules/:scheduleId`
Delete a feeding schedule and cancel its Temporal workflow.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "message": "Schedule deleted and workflow cancelled successfully"
  }
}
```

---

## 5. Feeding Events - `/cats/:catId/events`

### GET `/cats/:catId/events`
List feeding events for a cat, with optional filters.

**Query parameters:**
| Parameter | Type | Required | Description |
|---|---|---|---|
| `from` | ISO 8601 | ❌ | Start of date range |
| `to` | ISO 8601 | ❌ | End of date range |
| `outcome` | String | ❌ | Filter by outcome: `dispensed`, `skipped`, `rejected` |
| `limit` | Number | ❌ | Max results to return (default: 50) |
| `cursor` | String | ❌ | Pagination cursor from previous response |

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "events": [
      {
        "eventId": "uuid",
        "catId": "uuid",
        "scheduleId": "uuid",
        "timestamp": "2026-06-30T08:00:00Z",
        "outcome": "dispensed",
        "confidenceScore": 96.4,
        "portionDispensedGrams": 80,
        "consumptionPercent": 100,
        "foodTypeLabel": "Whiskas Tuna",
        "manualOverride": false
      }
    ],
    "nextCursor": "string"
  }
}
```

> **Note on `timestamp`:** this field serves as both the event time (when the feeding occurred) and the record creation time. Since feeding events are written immediately when they occur, no meaningful difference exists between the two. A separate `createdAt` field is intentionally omitted.

---

### POST `/cats/:catId/events/override`
Manually trigger a dispense event from the dashboard.

**Request body:**
```json
{
  "scheduleId": "uuid",
  "portionGrams": 80
}
```

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "eventId": "uuid",
    "outcome": "dispensed",
    "portionDispensedGrams": 80,
    "manualOverride": true,
    "timestamp": "2026-06-30T14:00:00Z"
  }
}
```

---

## 6. Weight - `/cats/:catId/weight`

### POST `/cats/:catId/weight`
Log a new weight entry for a cat.

**Request body:**
```json
{
  "weightKg": 4.0,
  "loggedAt": "2026-06-30T09:00:00Z",
  "notes": "Post-vet visit"
}
```

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "weightEntryId": "uuid",
    "catId": "uuid",
    "weightKg": 4.0,
    "loggedAt": "2026-06-30T09:00:00Z",
    "loggedBy": "uuid",
    "notes": "Post-vet visit",
    "updatedPortionSuggestionGrams": 72
  }
}
```

> `updatedPortionSuggestionGrams` reflects the recalculated recommended portion size immediately after logging. It is derived from `suggestedPortionGrams` on the Cat Profile entity, which is updated in DynamoDB at write time whenever a new weight entry is logged.

---

### GET `/cats/:catId/weight`
Get full weight history for a cat, sorted chronologically.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "currentWeightKg": 4.0,
    "targetWeightKg": 3.5,
    "weightGoal": "weight_loss",
    "entries": [
      {
        "weightEntryId": "uuid",
        "weightKg": 4.2,
        "loggedAt": "2026-06-01T09:00:00Z",
        "notes": null
      },
      {
        "weightEntryId": "uuid",
        "weightKg": 4.0,
        "loggedAt": "2026-06-30T09:00:00Z",
        "notes": "Post-vet visit"
      }
    ]
  }
}
```

---

## 7. Alerts - `/alerts`

### GET `/alerts`
List all alerts for the authenticated owner's household.

**Query parameters:**
| Parameter | Type | Required | Description |
|---|---|---|---|
| `status` | String | ❌ | Filter by `active` or `acknowledged` |
| `limit` | Number | ❌ | Max results (default: 20) |

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "alerts": [
      {
        "alertId": "uuid",
        "catId": "uuid",
        "catName": "Aloy",
        "type": "skip_meal",
        "status": "active",
        "triggeredAt": "2026-06-30T08:15:00Z",
        "metadata": {
          "scheduledFeedingTime": "08:00",
          "minutesElapsed": 15
        }
      }
    ]
  }
}
```

---

### PATCH `/alerts/:alertId/acknowledge`
Dismiss an alert and mark it as acknowledged.

**Request body:** none

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "alertId": "uuid",
    "status": "acknowledged",
    "acknowledgedAt": "2026-06-30T08:20:00Z",
    "acknowledgedBy": "uuid"
  }
}
```

---

## 8. Device - `/device`

### GET `/device`
Get the current state of the household's smart feeder device.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "deviceId": "uuid",
    "status": "online",
    "foodReservoirPercent": 75,
    "currentFoodTypeLabel": "Whiskas Tuna",
    "lastDispenseAt": "2026-06-30T08:00:00Z",
    "cameraStatus": "idle",
    "firmwareVersion": "1.0.0"
  }
}
```

---

### PATCH `/device`
Update device settings (food level, food type label).

**Request body:**
```json
{
  "foodReservoirPercent": 100,
  "currentFoodTypeLabel": "Royal Canin Indoor"
}
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "deviceId": "uuid",
    "foodReservoirPercent": 100,
    "currentFoodTypeLabel": "Royal Canin Indoor",
    "updatedAt": "2026-06-30T14:00:00Z"
  }
}
```

---

### POST `/device/dispense`
Manually trigger a simulated dispense event from the dashboard.

**Request body:**
```json
{
  "catId": "uuid",
  "portionGrams": 80
}
```

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "eventId": "uuid",
    "outcome": "dispensed",
    "portionDispensedGrams": 80,
    "manualOverride": true,
    "timestamp": "2026-06-30T14:00:00Z"
  }
}
```

---

## 9. Real-Time - SSE Stream

### GET `/sse`
Open a persistent Server-Sent Events connection for real-time dashboard updates.

**Headers required:**
```
Authorization: Bearer <session_token>
Accept: text/event-stream
```

**Connection response:** HTTP 200 with `Content-Type: text/event-stream`

The server pushes events in the following format:
```
event: <event_name>
data: <JSON payload>

```

**Events pushed by the server:**

### `feeding_event`
Fired on every recognition attempt outcome.
```json
{
  "eventId": "uuid",
  "catId": "uuid",
  "catName": "Aloy",
  "outcome": "dispensed",
  "confidenceScore": 96.4,
  "portionDispensedGrams": 80,
  "timestamp": "2026-06-30T08:00:00Z"
}
```

### `alert_triggered`
Fired when a new alert is generated.
```json
{
  "alertId": "uuid",
  "catId": "uuid",
  "catName": "Aloy",
  "type": "skip_meal",
  "triggeredAt": "2026-06-30T08:15:00Z",
  "metadata": {
    "scheduledFeedingTime": "08:00",
    "minutesElapsed": 15
  }
}
```

### `alert_dismissed`
Fired when an alert is acknowledged.
```json
{
  "alertId": "uuid",
  "acknowledgedAt": "2026-06-30T08:20:00Z",
  "acknowledgedBy": "uuid"
}
```

### `device_status`
Fired when the device state changes.
```json
{
  "deviceId": "uuid",
  "status": "online",
  "foodReservoirPercent": 75,
  "cameraStatus": "active"
}
```

### `weight_reminder`
Fired by Temporal WeightReminderWorkflow at the configured interval.
```json
{
  "alertId": "uuid",
  "catId": "uuid",
  "catName": "Aloy",
  "daysSinceLastLog": 7,
  "triggeredAt": "2026-06-30T09:00:00Z"
}
```

---

## 10. Changelog

| Version | Date | Changes |
|---|---|---|
| 1.0 | 2026-06-30 | Initial API Spec |
| 1.1 | 2026-07-01 | Updated photo upload: JPEG/PNG only (AWS constraint), 15MB limit, HEIC/RAW guidance added |
| 1.2 | 2026-07-01 | Added `householdId` to GET /cats list response; clarified `updatedPortionSuggestionGrams` source; added `timestamp` note to feeding events; consistency fixes aligned with Data Model v1.1 |