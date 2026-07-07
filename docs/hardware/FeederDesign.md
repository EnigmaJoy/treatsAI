# TreatsAI Feeder - Hardware Design Concept
## Physical Unit Specification

**Version:** 1.0
**Date:** July 7, 2026
**Status:** Concept design - software simulation in v1.0, physical build planned post-MVP

---

## 1. Overview

The TreatsAI smart feeder is a countertop unit designed for domestic cat feeding. It integrates a camera module for computer vision-based cat identification, a precision servo dispenser for portion-controlled food delivery, an edge compute module for local processing, and a Wi-Fi radio for cloud connectivity.

The v1.0 software release simulates this hardware via a dashboard UI. The physical unit described in this document represents the post-MVP hardware target that the software architecture is already designed to support.

---

## 2. Physical Dimensions

| Dimension | Value |
|---|---|
| Height | 320mm |
| Width | 220mm |
| Depth | 220mm |
| Food reservoir capacity | 2kg dry food |
| Bowl diameter | 150mm |
| Total weight (empty) | ~1.2kg |
| Total weight (full) | ~3.2kg |

**Form factor:** Vertical cylinder with a removable top reservoir, integrated bowl at the base, and a front-facing camera module mounted at 45mm height from the base - optimized for cat face detection at typical feeding posture.

---

## 3. Component List

### 3.1 Compute Module

**Component:** Raspberry Pi Zero 2W
**Rationale:**
- Sufficient compute for edge inference pre-processing
- Built-in Wi-Fi (2.4GHz 802.11 b/g/n)
- Low power consumption (~1W idle)
- Small form factor fits within the unit housing
- GPIO pins for servo and sensor control
- Cost: ~$15 USD

**Alternative (higher performance):** Raspberry Pi 4 Model B (2GB) for on-device Rekognition preprocessing, ~$45 USD

---

### 3.2 Camera Module

**Component:** Raspberry Pi Camera Module 3 Wide
**Specifications:**
- Sony IMX708 sensor
- 12 megapixel
- 120-degree field of view
- Auto-focus
- Low-light performance suitable for kitchen environments
**Mounting position:** Front face of unit, 45mm from base, angled 15 degrees downward
**Rationale:** Wide FOV captures the cat's face reliably from multiple approach angles. Auto-focus handles variable cat approach distances (200-400mm typical).
**Cost:** ~$35 USD

---

### 3.3 Food Dispenser Mechanism

**Component:** Custom auger servo dispenser
**Specifications:**
- Auger diameter: 30mm
- Motor: 12V DC geared motor, 10 RPM
- Portion accuracy: +/- 2g at 80g serving
- Compatible food types: dry kibble, 4-12mm pellet size
- Portion range: 10g - 200g per dispense
**Control:** PWM signal from GPIO pin on compute module
**Rationale:** Auger mechanism provides more consistent portioning than gravity-fed flap designs used by competitors. Portion accuracy directly supports the weight management goal tracking feature.
**Cost:** ~$25 USD (motor + auger assembly)

---

### 3.4 Load Cell (Bowl Weight Sensor)

**Component:** 1kg load cell with HX711 amplifier
**Purpose:** Measures actual food weight consumed vs dispensed, enabling true consumption percentage tracking without owner manual logging
**Accuracy:** +/- 1g
**Integration:** Reading sent to compute module every 60 seconds during active feeding window
**Note:** Post-MVP feature. v1.0 uses owner-reported consumption baseline. Hardware is designed to support load cell from day one.
**Cost:** ~$8 USD

---

### 3.5 Power Supply

**Component:** 12V 2A DC adapter (wall power)
**Backup:** 4x AA battery holder for dispense-only emergency operation during power outage
**UPS logic:** On power loss, unit sends `device_status` SSE event with `status: offline`, continues dispensing from battery for up to 24 hours on fixed schedule
**Cost:** ~$10 USD

---

### 3.6 Connectivity

**Primary:** Wi-Fi 2.4GHz via Raspberry Pi Zero 2W onboard radio
**Protocol:** HTTPS to TreatsAI API (`POST /api/v1/cats/:catId/events`)
**Offline behavior:** Local queue of up to 100 feeding events, synced when connectivity restored
**Security:** TLS 1.3, device authenticated via pre-provisioned device certificate

---

### 3.7 Indicators

| Indicator | Type | Meaning |
|---|---|---|
| Ring LED (green) | RGB LED strip, 8 LEDs | Online, ready |
| Ring LED (amber, pulsing) | RGB LED strip | Recognizing cat |
| Ring LED (red, flash) | RGB LED strip | Recognition rejected |
| Ring LED (blue) | RGB LED strip | Dispensing |
| Ring LED (white) | RGB LED strip | Low food level |

---

## 4. Software Integration Points

The physical hardware connects to the TreatsAI software stack at these points:

### 4.1 Camera capture - recognition flow
```
Camera captures frame
  -> Raspberry Pi preprocesses (resize to 1080x1080, JPEG encode)
  -> HTTPS POST to /api/v1/cats/:catId/events/recognize
  -> Server calls AWS Rekognition SearchFacesByImage
  -> Response: { outcome, confidenceScore, portionGrams }
  -> Raspberry Pi triggers servo dispenser via GPIO
  -> Result logged to DynamoDB
  -> SSE event pushed to dashboard
```

### 4.2 Temporal workflow trigger
```
Temporal FeedingScheduleWorkflow fires at scheduled time
  -> Sends signal to device via MQTT or webhook
  -> Device activates camera
  -> Recognition flow begins (see 4.1)
```

### 4.3 Device status reporting
```
Every 60 seconds:
  HTTPS PATCH /api/v1/device
  Body: { status, foodReservoirPercent, cameraStatus, lastDispenseAt }
```

---

## 5. Bill of Materials (BOM) - Estimated Unit Cost

| Component | Cost (USD) |
|---|---|
| Raspberry Pi Zero 2W | $15 |
| Camera Module 3 Wide | $35 |
| Auger dispenser assembly | $25 |
| Load cell + HX711 | $8 |
| RGB LED ring | $6 |
| Power supply | $10 |
| Housing (injection molded ABS) | $18 |
| PCB + assembly | $12 |
| Packaging | $5 |
| **Total BOM** | **$134** |
| **Retail price** | **$199** |
| **Gross margin** | **~33%** |

---

## 6. Housing Design Concept

**Material:** ABS plastic, matte finish
**Color options:** Midnight Black (default), Arctic White
**Key design principles:**
- Removable top reservoir for easy refilling without tools
- Dishwasher-safe stainless steel bowl
- Cable management channel on rear
- Non-slip silicone base pad
- Front camera window: scratch-resistant polycarbonate lens cover
- LED ring visible from all approach angles (360 degrees)
- Minimum 2-year IP21 rating (splash resistant)

**Inspiration references:**
- Simplehuman sensor pump (minimal, premium kitchen aesthetic)
- Dyson AM07 (tall vertical form, cable routing)
- Apple HomePod mini (fabric + hard shell material contrast)

---

## 7. Manufacturing Path (Post-MVP)

**Phase 1 - Prototype (Month 1-3)**
- 3D printed housing (FDM, PLA)
- Off-the-shelf Raspberry Pi + camera
- Hand-assembled auger mechanism
- Target: 10 functional prototypes for beta testing

**Phase 2 - Small batch (Month 4-6)**
- Injection molded housing (soft tooling)
- Custom PCB for integrated compute + GPIO
- Contract assembly: Shenzhen, China
- Target: 500 units

**Phase 3 - Production (Month 7-12)**
- Hard tooling for housing
- Full contract manufacturing
- Target: 5,000 units / month

---

## 8. Regulatory Considerations

| Certification | Region | Required for |
|---|---|---|
| CE marking | EU | Electrical safety, EMC |
| FCC Part 15 | US | Wi-Fi radio emissions |
| RoHS | EU/UK | Hazardous substances |
| WEEE | EU | End-of-life disposal |
| ISO 11784/11785 | Global | RFID microchip reader (post-MVP) |

---

## 9. Connection to Software Architecture

The physical feeder is designed as a thin client - it captures images, triggers dispensing, and reports status. All intelligence (recognition, scheduling, alerting, baseline learning) runs in the cloud.

This means:
- Replacing or upgrading the compute module does not require software changes
- The same API that powers the software simulation (`MOCK_AWS=true`) powers the physical device
- Connecting a real camera requires only changing the image source in `src/lib/server/temporal/activities.ts` - the rest of the pipeline is identical

This is documented in `docs/TAD.md` under ADR-004.