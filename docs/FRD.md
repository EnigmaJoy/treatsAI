# Functional Requirements Document (FRD)
## TreatsAI - Smart Food, Zero Judgment 🐾

**Version:** 1.1  
**Date:** June 30, 2026  
**Author:** Joselyn Grace Gordillo Lopez  
**Hackathon:** Hack the Kitty - Cat World Domination Day

---

## 1. Purpose

This document defines the functional requirements of TreatsAI - what the system **shall** do, at a level of precision sufficient to implement and verify each feature. Every requirement listed here corresponds directly to a testable behavior in the application.

---

## 2. Definitions

| Term | Definition |
|---|---|
| **Cat Profile** | A stored record representing one individual cat, including name, photo embeddings, weight data, and weight goal |
| **Feeding Event** | A single recorded instance of a cat approaching the feeder, with outcome (dispensed, skipped, rejected) |
| **Schedule** | A configured set of feeding times and portion sizes assigned to a specific cat |
| **Confidence Score** | A percentage (0–100) returned by AWS Rekognition indicating how certain the system is about a cat's identity |
| **Dispense Threshold** | The minimum confidence score required to trigger food dispensing (default: 90%) |
| **Consumption Baseline** | The expected food consumption percentage for a cat, set initially by the owner at onboarding and refined automatically over time by the system based on observed feeding behavior |
| **Skip-Meal Alert** | A notification triggered when a cat's feeding event outcome deviates significantly from its Consumption Baseline, or when a scheduled feeding time passes with no feeding event recorded within the grace period |
| **Primary Owner** | The authenticated user who created the account and holds full admin rights over all cat profiles, feeder devices, and household member access |
| **Co-Owner** | A secondary user invited by the Primary Owner to share access to cat profiles, feeding history, and the dashboard within the same household, with configurable permissions |
| **Device** | The simulated smart feeder unit, represented in the UI as a dashboard panel |
| **ISO 11784/11785** | The international standard for pet RFID microchip identification, producing a globally unique 15-digit numeric code. Post-MVP, TreatsAI plans to support microchip number as a secondary identity verification layer alongside computer vision |

---

## 3. User Authentication

**FR-AUTH-01:** The system shall require owners to create an account using an email address and password before accessing any feature.

**FR-AUTH-02:** The system shall authenticate owners via a secure login flow before granting access to the dashboard. The login flow shall support optional Two-Factor Authentication (2FA) via Email OTP (a one-time password sent to the owner's registered email address). Post-MVP, TOTP-based 2FA (e.g. Google Authenticator) shall be supported.

**FR-AUTH-03:** At login, the system shall offer the owner two session options:
- **Standard session:** expires automatically after 7 days, requiring re-authentication
- **Remember me:** session persists until the owner manually logs out

Regardless of the chosen option, the system shall automatically invalidate all active sessions when the owner changes their password. The Primary Owner shall be able to view all active sessions and revoke any of them individually from a Security Settings panel.

**FR-AUTH-04:** The system shall never expose authentication credentials in client-side code, logs, or API responses.

---

## 4. Cat Profile Management

**FR-CAT-01:** The system shall allow an owner to create one or more cat profiles under a single account, with each profile representing one individual cat. Each cat profile shall contain the following fields:
- Name (required, max 50 characters)
- Date of birth (optional)
- Breed (optional, free text)
- Current weight in kilograms (required, numeric, min 0.5kg, max 20kg)
- Weight goal: one of `weight_loss`, `maintenance`, `weight_gain` (required)
- Target weight in kilograms (required if goal is `weight_loss` or `weight_gain`)
- Profile photo (required, used for Rekognition training)
- Consumption Baseline percentage (required, set by owner at onboarding, e.g. "my cat normally finishes 100% of food")

**FR-CAT-02:** The system shall allow an owner to upload a minimum of 3 and a maximum of 10 clear, front-facing photos of the cat's face during onboarding, to train the AWS Rekognition face collection. The UI shall display guidance on acceptable photo quality (good lighting, unobstructed face, single cat per photo).

**FR-CAT-03:** The system shall store cat photo embeddings in AWS Rekognition and associate them with the cat's profile UUID - a universally unique identifier (e.g. `550e8400-e29b-41d4-a716-446655440000`) generated at profile creation time and used as the primary key across all TreatsAI data stores.

**FR-CAT-04:** The system shall allow an authenticated user with edit permissions (Primary Owner or Co-Owner with edit role) to edit any cat profile field at any time.

**FR-CAT-05:** The system shall allow an authenticated user with edit permissions (Primary Owner or Co-Owner with edit role) to delete a cat profile, which shall also delete all associated feeding events, schedules, and Rekognition data.

**FR-CAT-06:** The system shall allow an authenticated user with edit permissions (Primary Owner or Co-Owner with edit role) to manually log a weight update for a cat, with a timestamp, to track progress toward the weight goal.

**FR-CAT-07:** The system shall allow the owner to configure a recurring weight-check reminder interval (every 3, 7, or 14 days). At the configured interval, the system shall trigger a dashboard alert and an optional email notification reminding the owner to weigh and log their cat's weight. This reminder workflow shall be managed by Temporal, guaranteeing delivery even across server restarts.

---

## 5. Feeding Schedule

**FR-SCH-01:** The system shall allow an owner to configure a feeding schedule per cat, consisting of one or more daily feeding times (e.g. 08:00, 18:00).

**FR-SCH-02:** The system shall allow an owner to set a portion size in grams for each scheduled feeding time.

**FR-SCH-03:** The system shall automatically adjust the recommended portion size based on the cat's current weight, weight goal, and target weight, presenting the suggestion to the owner for confirmation.

**FR-SCH-04:** The system shall allow an owner to override the suggested portion size with a custom value.

**FR-SCH-05:** The system shall allow an owner to pause a schedule temporarily without deleting it.

**FR-SCH-06:** The system shall persist schedules across sessions - schedules shall remain active until explicitly paused or deleted by the owner.

---

## 6. Cat Recognition

**FR-REC-01:** At each scheduled feeding time, the system shall simulate a camera capture event and pass the image to AWS Rekognition for identification.

**FR-REC-02:** The system shall compare the captured image against the stored Rekognition face collection for the registered cat.

**FR-REC-03:** The system shall trigger food dispensing only if the returned confidence score meets or exceeds the configured Dispense Threshold (default: 90%).

**FR-REC-04:** The system shall reject dispensing and log a `rejected` feeding event if the confidence score is below the Dispense Threshold.

**FR-REC-05:** The system shall log the confidence score for every recognition attempt, regardless of outcome.

**FR-REC-06:** The system shall allow the owner to manually override a rejected feeding event and trigger dispensing from the dashboard.

**FR-REC-07:** The system shall complete the recognition-to-dispense decision in under 3 seconds from the moment the camera capture is initiated.

**FR-REC-08 (Post-MVP):** The system shall support ISO 11784/11785 RFID microchip scanning as a secondary identity verification layer. When a cat's microchip number is registered in their profile, the feeder hardware shall read the chip as the cat approaches, using it to confirm or supplement the computer vision confidence score.

---

## 7. Feeding Event Logging

**FR-LOG-01:** The system shall create a feeding event record for every recognition attempt, containing:
- Cat profile UUID
- Timestamp (UTC)
- Outcome: `dispensed`, `skipped`, or `rejected`
- Confidence score
- Portion dispensed in grams (if outcome is `dispensed`)
- Food type label (free text, e.g. "Whiskas Tuna", inherited from current device food type setting)
- Schedule ID that triggered the event

**FR-LOG-02:** The system shall store all feeding event records in AWS DynamoDB.

**FR-LOG-03:** The system shall display feeding event history in the dashboard, sorted by most recent first.

**FR-LOG-04:** The system shall allow the owner to filter feeding history by cat, date range, and outcome type.

**FR-LOG-05:** The system shall retain feeding event records indefinitely (no automatic deletion).

---

## 8. Skip-Meal Alerts

**FR-ALT-01:** The system shall trigger a skip-meal alert in two cases:
- A scheduled feeding time passes with no feeding event recorded within a 15-minute grace period
- A feeding event is recorded but the consumed portion deviates significantly from the cat's Consumption Baseline (threshold: > 20% deviation from baseline)

**FR-ALT-02:** The system shall display skip-meal alerts in the dashboard in real time using Server-Sent Events (SSE).

**FR-ALT-03:** The system shall display the following information in each alert:
- Cat name
- Scheduled feeding time that was missed or deviated
- Time elapsed since the missed meal
- Quick action button to manually trigger dispensing

**FR-ALT-04:** The system shall allow the owner to dismiss an alert, marking it as acknowledged with a timestamp.

**FR-ALT-05:** The system shall persist all alerts in DynamoDB, including acknowledged status and acknowledgement timestamp.

---

## 9. Real-Time Dashboard

**FR-DASH-01:** The system shall display a dashboard as the primary screen after login, showing:
- Current status of each registered cat (last fed, next scheduled feeding, weight goal progress)
- Active alerts (if any)
- Simulated feeder device status (online/offline, food level indicator)
- Today's feeding summary (total meals dispensed, total skipped)

**FR-DASH-02:** The dashboard shall update in real time using Server-Sent Events (SSE) without requiring a page refresh.

**FR-DASH-03:** The system shall display a simulated live camera feed panel on the dashboard, showing the feeder's "view" (simulated, not a real video stream).

**FR-DASH-04:** The system shall display a feeding history chart showing the last 7 days of feeding events per cat.

**FR-DASH-05:** The dashboard shall be fully functional on both desktop and mobile screen sizes (responsive layout).

---

## 10. Weight Goal Tracking

**FR-WGT-01:** The system shall display the cat's current weight, target weight, and weight goal on the cat profile screen.

**FR-WGT-02:** The system shall display a weight progress indicator showing the delta between current weight and target weight.

**FR-WGT-03:** The system shall display a weight history chart showing all manually logged weight entries over time.

**FR-WGT-04:** The system shall recalculate and update the recommended portion size whenever a new weight entry is logged.

---

## 11. Household Shared Access (Post-MVP)

**FR-ACCESS-01:** The Primary Owner shall be able to invite additional users (Co-Owners) to their household by email address.

**FR-ACCESS-02:** Co-Owners shall be assigned one of two roles by the Primary Owner:
- **Editor** - can view and modify cat profiles, schedules, and feeding events
- **Viewer** - can view dashboard and feeding history but cannot modify any settings

**FR-ACCESS-03:** The Primary Owner shall be able to revoke a Co-Owner's access at any time, immediately terminating their session.

**FR-ACCESS-04:** The dashboard shall display a "Household Members" section in settings, listing all Co-Owners and their roles.

---

## 12. Multi-Language Support

**FR-I18N-01:** The system shall support three interface languages: English (default), Italian, and Spanish.

**FR-I18N-02:** The system shall allow the owner to switch the interface language from any screen without losing their current session or data.

**FR-I18N-03:** All user-facing strings, labels, error messages, and notifications shall be available in all three supported languages.

**FR-I18N-04:** The system shall detect the appropriate language using the following priority order:
1. Browser language setting - if Italian (`it`) or Spanish (`es`), use it
2. Browser timezone mapping - if no language match, infer from timezone:
    - `Europe/Rome`, `Europe/Vatican` → Italian
    - `Europe/Madrid`, `America/Mexico_City`, `America/Buenos_Aires`, `America/Bogota`, and other Latin American timezones → Spanish
3. Default to English if neither signal matches

The owner can always override the auto-detected language manually via the language selector, regardless of detection result.

---

## 13. Device Simulation

**FR-DEV-01:** The system shall represent the smart feeder as a simulated device in the dashboard UI, with the following displayed states:
- Online / Offline
- Food reservoir level (percentage, manually configurable in settings)
- Current food type (free-text label, e.g. "Whiskas Tuna", "Royal Canin Chicken", manually set by owner)
- Last dispense timestamp
- Current camera status (active / idle)

**FR-DEV-02:** The system shall allow the owner to manually trigger a dispense event from the dashboard (simulated).

**FR-DEV-03:** The system shall allow the owner to update the food reservoir level manually (simulating a physical refill).

**FR-DEV-04 (Post-MVP):** The system shall support barcode scanning of food packaging to automatically retrieve and populate the food type label, eliminating the need for manual entry.

---

## 14. Non-Functional Requirements (Summary)

| ID | Requirement |
|---|---|
| NFR-01 | Recognition-to-dispense decision shall complete in under 3 seconds |
| NFR-02 | Dashboard SSE updates shall arrive within 2 seconds of a triggering event |
| NFR-03 | The application shall be accessible free of charge during the judging period (July 8–14, 2026) |
| NFR-04 | All API keys and secrets shall be stored as environment variables, never hardcoded |
| NFR-05 | The application shall function correctly on Chrome, Firefox, and Safari (latest versions) |
| NFR-06 | The application shall be installable and runnable by a judge following only the README setup instructions |

---

## 15. Requirements Traceability

| Requirement Group | Priority | Linked PRD Goal |
|---|---|---|
| Authentication (FR-AUTH) | MVP | Security |
| Cat Profile (FR-CAT) | MVP | Individual recognition + Health monitoring |
| Feeding Schedule (FR-SCH) | MVP | Routine reinforcement |
| Cat Recognition (FR-REC) | MVP | Individual recognition |
| Feeding Event Logging (FR-LOG) | MVP | Passive health monitoring |
| Skip-Meal Alerts (FR-ALT) | MVP | Owner awareness |
| Real-Time Dashboard (FR-DASH) | MVP | Owner-cat relationship |
| Weight Goal Tracking (FR-WGT) | MVP | Health monitoring |
| Household Shared Access (FR-ACCESS) | Post-MVP | Owner-cat relationship |
| Multi-Language Support (FR-I18N) | MVP | Accessibility |
| Device Simulation (FR-DEV) | MVP | Hardware concept |