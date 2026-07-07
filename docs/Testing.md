# Testing Guide
## TreatsAI - Smart Food, Zero Judgment

**Version:** 1.0
**Date:** July 7, 2026
**For:** Hackathon judges and external testers

---

## 1. Prerequisites

Before testing, ensure the following are running:

### Option A - With mock AWS (recommended for judges)

```bash
# Terminal 1 - Start Temporal
temporal server start-dev --ui-port 8233

# Terminal 2 - Start the app
npm run dev
```

Make sure `.env` contains:
```
MOCK_AWS=true
```

### Option B - With real AWS credentials

```bash
# Terminal 1 - Start Temporal
temporal server start-dev --ui-port 8233

# Terminal 2 - Start the app
npm run dev
```

Make sure `.env` contains real AWS credentials and `MOCK_AWS=false`.

### Verify everything is running

- App: `http://localhost:5173`
- Temporal Web UI: `http://localhost:8233`

---

## 2. Core Test Flows

### Flow 1 - Registration (3-step wizard)

**Expected time:** 3-5 minutes

1. Navigate to `http://localhost:5173/register`
2. **Step 1 - Account:**
    - Enter any email address
    - Enter a password (minimum 8 characters)
    - Confirm the password
    - Select a language (EN, IT, or ES)
    - Click "Next - Your cat"
3. **Step 2 - Cat details:**
    - Enter cat name (e.g. "Aloy")
    - Enter breed (optional, e.g. "Tabby")
    - Enter current weight (e.g. 4.2)
    - Select weight goal: "Maintenance"
    - Set consumption baseline slider to 95%
    - Click "Next - Schedule"
4. **Step 3 - Schedule:**
    - Leave default feeding times (08:00, 14:00, 18:00)
    - Leave default portions (80g each)
    - Enter food type (e.g. "Whiskas Tuna")
    - Click "Finish setup"

**Expected result:** Redirect to dashboard showing the cat's data.

---

### Flow 2 - Dashboard verification

**Expected time:** 2 minutes

After registration, verify the dashboard shows:

- [ ] Cat name in the cat status card
- [ ] Green "Feeder online" badge
- [ ] Next scheduled feeding time
- [ ] Device panel with food reservoir at 75%
- [ ] Food type label matching what was entered
- [ ] Green "Live" SSE indicator in the topbar
- [ ] 7-day feeding history chart (empty on first login - expected)

---

### Flow 3 - Manual dispense

**Expected time:** 1 minute

1. From the dashboard, click "Manual Dispense" on the cat card
2. **Expected result:** A feeding event is created with `manualOverride: true`
3. The 7-day chart should update to show 1 dispensed meal
4. The "Today's meals" stat card should increment

---

### Flow 4 - Cat profile

**Expected time:** 2 minutes

1. Click "My Cats" in the sidebar
2. Click on the cat card
3. Verify:
    - [ ] Weight card shows current weight and goal
    - [ ] Feeding stats show consumption baseline (95%)
    - [ ] Suggested portion is displayed
    - [ ] Feeding schedule shows all 3 time slots
    - [ ] Recent events section (empty initially - expected)
4. Click "Log Weight" - enter a new weight value
5. **Expected result:** Weight entry saved, suggested portion recalculates

---

### Flow 5 - Add a second cat

**Expected time:** 2 minutes

1. Go to "My Cats" - click "+ Add Cat"
2. Fill in details for a second cat with different settings:
    - Name: "Shadow"
    - Weight goal: "Weight loss"
    - Current weight: 5.5kg
    - Target weight: 4.5kg
3. **Expected result:** Both cats appear in the My Cats list

---

### Flow 6 - Settings

**Expected time:** 2 minutes

1. Navigate to Settings
2. Click a different colour palette (e.g. "Ocean Whisker")
3. **Expected result:** Page background and sidebar change colour
4. Try changing the language to IT or ES
5. Update the food type label and click Save
6. Click "Simulate refill (100%)"
7. **Expected result:** Food reservoir updates to 100%

---

### Flow 7 - Alerts page

**Expected time:** 1 minute

1. Navigate to Alerts
2. **Expected result:** "No active alerts / Everything looks good" (expected when no meals are missed)
3. Verify the Active and History tabs are present and clickable

---

### Flow 8 - Logout and login

**Expected time:** 1 minute

1. Click "Logout" in the sidebar
2. **Expected result:** Redirect to login page
3. Enter the credentials used during registration
4. Click "Sign in"
5. **Expected result:** Redirect to dashboard with data intact

---

## 3. Temporal Workflow Verification

### Check Temporal Web UI

1. Open `http://localhost:8233`
2. Navigate to "Workflows"
3. After registering a cat and schedule, you should see active workflows:
    - `FeedingScheduleWorkflow` - one per cat schedule
    - `WeightReminderWorkflow` - one per cat

### What to expect

- Workflows show status "Running"
- Each workflow has a unique ID
- Click on a workflow to see its execution history and timeline

---

## 4. API Testing (Optional)

The full API is documented in `docs/API_SPEC.md`. To test endpoints directly:

### Register a user
```bash
curl -X POST http://localhost:5173/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123","language":"en"}'
```

### Expected response
```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "email": "test@example.com",
    "householdId": "uuid",
    "language": "en"
  }
}
```

---

## 5. Known Limitations

| Limitation | Reason | Impact |
|---|---|---|
| Data resets on server restart | In-memory mock DB | Low - restart and re-register |
| Photo upload simulated | AWS S3 mock | Low - Rekognition training is simulated |
| Feeding events are mock-generated | No real camera | Expected - this is a software simulation |
| Language strings partially translated | Time constraint | Low - infrastructure is fully wired |
| 2FA email not sent | No email provider configured | Low - OTP flow is implemented, email delivery is post-MVP |

---

## 6. Architecture Notes for Technical Judges

- All Temporal workflows are in `src/lib/server/temporal/workflows.ts`
- All AWS service calls (real and mock) go through `src/lib/server/aws/mock.ts`
- To switch from mock to real AWS: set `MOCK_AWS=false` in `.env` and provide real credentials
- SSE stream endpoint: `GET /api/v1/sse` - connect with `EventSource` in the browser
- DynamoDB single-table design: all entities share one table (`TreatsAI`) with PK/SK pattern
- Full API contract: `docs/API_SPEC.md`
- Full data model: `docs/DATA_MODEL.md`

---

## 7. Quick Reference

| URL | Description |
|---|---|
| `http://localhost:5173` | Main app |
| `http://localhost:5173/register` | Registration wizard |
| `http://localhost:5173/login` | Login page |
| `http://localhost:5173/cats` | Cat list |
| `http://localhost:5173/alerts` | Alerts page |
| `http://localhost:5173/settings` | Settings |
| `http://localhost:8233` | Temporal Web UI |
| `http://localhost:5173/api/v1/` | API base URL |