# TreatsAI

> Smart Food, Zero Judgment 🐾

An AI-powered cat food dispenser that recognizes individual cats via computer vision, tracks eating habits, adjusts portions automatically, and strengthens the daily routine shared between a cat and its owner - built for **Cat World Domination Day**.

---

## Table of Contents

- [What It Does](#what-it-does)
- [Why It's Different](#why-its-different)
- [Theme Connection](#theme-connection)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Features](#features)
- [Security](#security)
- [Hardware Design](#hardware-design)
- [Demo Video](#demo-video)
- [Roadmap](#roadmap)
- [License](#license)

---

## What It Does

TreatsAI is a smart cat feeding system that uses AWS Rekognition to identify individual cats at the feeder, dispenses the correct portion based on a configured schedule, and tracks eating behavior over time. When a cat skips a meal or deviates from its consumption baseline, the owner receives a real-time alert on their dashboard.

The system learns each cat's normal eating pattern — starting from an owner-set baseline and refining it automatically over time — turning passive daily feeding into meaningful health data.

---

## Why It's Different

Most smart feeders are dumb timers. They dispense food on a schedule with no awareness of the animal in front of them. TreatsAI is different in three ways:

**It knows which cat is eating.** AWS Rekognition identifies individual cats by face, with a configurable confidence threshold. A rejected recognition never triggers dispensing.

**It learns what normal looks like.** The owner sets an initial consumption baseline ("my cat normally finishes 95% of her food"). The system refines this automatically over time and alerts when behavior deviates — passive health monitoring, every day.

**It's built on durable workflows.** Temporal orchestrates every feeding schedule, skip-meal alert, and weight reminder. If the server restarts mid-workflow, Temporal replays from exactly where it stopped. No missed alerts, no lost feeding events.

The tech stack itself is a deliberate architectural statement: SvelteKit on the edge, Temporal for durable execution, AWS Rekognition for managed CV, DynamoDB for serverless persistence. Each choice was made for a reason — documented in `docs/TAD.md`.

---

## Theme Connection

Cat World Domination Day (June 24) celebrates the quiet, inevitable supremacy of cats. TreatsAI leans into this: the feeder adapts to the cat, not the other way around. The cat's schedule, the cat's portions, the cat's consumption patterns — the system organizes itself around the animal. The owner is just the interface.

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | SvelteKit 2.x (edge-first) | Compile-time reactivity, edge deployment, file-based routing |
| Styling | Tailwind CSS v4 | Utility-first, zero runtime cost, direct Vite integration |
| i18n | Paraglide JS (EN / IT / ES) | Compile-time translations, tree-shaken per language |
| Workflow Orchestration | Temporal | Durable execution — workflows survive server restarts |
| Computer Vision | AWS Rekognition | Managed face collection API, no ML model to train or host |
| Database | AWS DynamoDB | Serverless, Always Free tier, single-table design |
| Compute | AWS Lambda | Serverless functions, native AWS ecosystem integration |
| Storage | AWS S3 | Cat photo storage with pre-signed URL access |
| Real-time updates | Server-Sent Events (SSE) | Server-to-browser push, simpler than WebSockets for our use case |
| Auth | Session tokens + Email OTP 2FA | Secure, no third-party dependency |

---

## Architecture

See `docs/TAD.md` for the full Technical Architecture Document including system diagram, sequence diagrams, and Architecture Decision Records (ADRs).

High-level flow:

```
[SvelteKit Dashboard] ← SSE ← [AWS Lambda]
                                     ↑
                              [Temporal Workflows]
                                     ↑
                         [AWS Rekognition + DynamoDB + S3]
```

At each scheduled feeding time, Temporal fires a workflow that triggers Lambda to call Rekognition with a simulated camera capture. If the confidence score meets the threshold (default 90%), food is dispensed and the event is logged to DynamoDB. The dashboard updates in real time via SSE. If no dispense event is recorded within 15 minutes, Temporal triggers a skip-meal alert.

---

## Getting Started

### Prerequisites

- Node.js v22.13.1+
- npm
- Docker Desktop (for local Temporal server)
- AWS account (free tier sufficient)
- Temporal CLI (for local dev alternative to Docker)

### Installation

```bash
git clone https://github.com/EnigmaJoy/TreatsAI.git
cd TreatsAI
npm install
```

### Environment Variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

Required variables:

```bash
AWS_REGION=eu-west-1
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
DYNAMODB_TABLE_NAME=TreatsAI
MOCK_AWS=true   # set to false when using real AWS credentials
```

### Running locally

**Option A - Temporal via Docker:**
```bash
docker compose up -d
npm run dev
```

**Option B - Temporal via CLI:**
```bash
temporal server start-dev --ui-port 8233
npm run dev
```

Open `http://localhost:5173` for the app and `http://localhost:8233` for the Temporal Web UI.

### Running with mock AWS (no AWS account needed)

Set `MOCK_AWS=true` in your `.env` file. All AWS calls (Rekognition, DynamoDB, S3) will use the in-memory mock layer in `src/lib/server/aws/mock.ts`. The app runs fully end-to-end without any AWS credentials.

---

## Project Structure

```
TreatsAI/
├── src/
│   ├── lib/
│   │   ├── types.ts                    # All TypeScript types
│   │   ├── components/                 # Shared Svelte components
│   │   └── server/
│   │       ├── aws/mock.ts             # Mock AWS layer
│   │       ├── db/client.ts            # DynamoDB client
│   │       └── temporal/               # Workflows, activities, worker
│   └── routes/
│       ├── api/v1/                     # All API endpoints
│       └── (pages)/                    # SvelteKit pages
├── docs/
│   ├── PRD.md                          # Product Requirements Document
│   ├── FRD.md                          # Functional Requirements Document
│   ├── TAD.md                          # Technical Architecture Document
│   ├── DATA_MODEL.md                   # DynamoDB data model
│   └── API_SPEC.md                     # Full API specification
├── messages/                           # Paraglide i18n translations
│   ├── en.json
│   ├── it.json
│   └── es.json
├── docker-compose.yml                  # Temporal local dev setup
└── .env.example                        # Environment variables template
```

---

## Features

- [x] Cat profile management (create, edit, delete)
- [x] AWS Rekognition face collection (onboarding photo upload)
- [x] Automated feeding schedule with Temporal workflows
- [x] Portion size suggestions based on weight and goal
- [x] Skip-meal detection and real-time alerts (SSE)
- [x] Consumption baseline tracking (owner-set + auto-refined)
- [x] Feeding event history with confidence scores
- [x] Weight logging and goal progress tracking
- [x] Recurring weight-check reminders via Temporal
- [x] Real-time dashboard with SSE
- [x] Simulated feeder device panel with camera feed mock
- [x] Multi-language UI (English, Italian, Spanish)
- [x] 6 customizable color palettes
- [x] Dark and light mode
- [x] Auth with session management and Email OTP 2FA
- [x] Responsive layout (desktop and mobile)

---

## Security

- All AWS credentials stored as environment variables, never hardcoded
- AWS IAM roles follow least-privilege principle
- Session tokens stored in httpOnly cookies
- Email OTP 2FA available for all accounts
- S3 photos accessed via pre-signed URLs (15-minute expiration)
- Passwords hashed with bcryptjs
- Session revocation panel for remote logout

See `docs/SECURITY_REPORT.md` for the Aikido security scan report.

---

## Hardware Design

TreatsAI is currently implemented as a software simulation. The feeder hardware is represented as a dashboard panel with real-time status, camera feed simulation, and manual dispense controls.

Hardware design files for a future physical build are available in `docs/hardware/`:
- Figma prototype: feeder unit industrial design
- 3D model concept: STL file for 3D printing

The software architecture is designed hardware-first: the recognition pipeline, workflow triggers, and dispense logic are all implemented as if a real camera and dispensing mechanism exist. Connecting physical hardware requires only replacing the simulated camera capture with a real camera feed.

Post-MVP plan: ISO 11784/11785 RFID microchip reader as a secondary identity verification layer alongside computer vision.

---

## Demo Video

<!-- TODO: link, under 5 minutes, English narration -->

---

## Roadmap

**Post-hackathon:**
- Physical hardware build (camera module, servo dispenser, RFID reader)
- Multi-cat household support (per-cat feeder assignment)
- ISO 11784/11785 microchip scanning as secondary verification
- Household shared access (Co-Owner invitations)
- Barcode scanning for automatic food type detection
- Vet report export
- Mobile native app (iOS / Android)
- TOTP 2FA (Google Authenticator)

---

## License

MIT License - see LICENSE file for details.

Built with for Cat World Domination Day 2026 - Hack the Kitty Hackathon