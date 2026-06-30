# Product Requirements Document (PRD)
## TreatsAI — Smart Food, Zero Judgment 🐾

**Version:** 1.0  
**Date:** June 30, 2026  
**Author:** Joselyn Grace Gordillo Lopez  
**Hackathon:** Hack the Kitty — World Cat Domination Day

---

## 1. Problem Statement

Most cat feeders on the market are, at their core, dumb timers. They dispense food on a fixed schedule with no awareness of the animal in front of them. They cannot tell which cat is eating, how much was consumed, whether a meal was skipped, or whether a cat's body is changing over time.

This creates a silent gap in the cat-owner relationship: owners lose visibility into one of the most reliable daily health signals their cat produces — eating behavior.

Beyond health, there is a deeper problem: **routine builds bonds**. A structured, predictable mealtime is not just good for a cat's digestion — it is a daily moment of care and connection between a cat and its owner. Current feeders automate the act of feeding but strip away the awareness that makes that routine meaningful.

---

## 2. Product Vision

TreatsAI is an AI-powered cat feeding system that learns each individual cat, tracks its eating habits over time, and strengthens the daily routine shared between a cat and its owner.

The technology — computer vision, workflow automation, cloud intelligence — operates silently in the background. What the owner experiences is clarity, calm, and connection: knowing their cat ate, knowing how much, knowing if something changed.

> "The goal is not to replace the owner's care. The goal is to make that care more informed, more consistent, and more present — even when the owner is not."

---

## 3. Target Users

### Primary — The Attentive Single-Cat Owner
- Has one cat they consider a close companion
- Travels or works long hours and worries about their cat's wellbeing
- Wants peace of mind, not complexity
- Values routine and consistency for their pet

### Secondary — The Multi-Cat Household Manager
- Has 2–4 cats with different dietary needs
- Struggles with cats eating each other's food
- Needs per-cat portion control and individual tracking
- Currently uses multiple manual strategies to manage feeding

### Tertiary — The Health-Conscious Owner
- Cat is on a vet-prescribed diet (weight loss, kidney support, etc.)
- Needs precise portion control and measurable progress
- Would benefit from weight trend data and goal tracking
- Currently logs feeding manually or relies on memory

---

## 4. Core Value Propositions

| Value | Description |
|---|---|
| **Individual recognition** | The system knows *which* cat is eating, not just *that* a cat is eating |
| **Routine reinforcement** | Structured mealtimes become consistent, shared rituals |
| **Passive health monitoring** | Weight goals and eating pattern changes are tracked automatically |
| **Owner-cat relationship** | The system returns meaningful awareness to the owner, deepening the bond |
| **Zero friction** | Once set up, TreatsAI requires no daily interaction — it simply works |

---

## 5. Goals & Non-Goals

### Goals (v1 — Hackathon MVP)
- Recognize an individual cat via computer vision
- Dispense the correct portion based on a configured schedule
- Log every feeding event (successful, skipped, rejected)
- Alert the owner if a cat skips a meal
- Display a real-time dashboard of feeding activity
- Support weight goal configuration (weight loss / maintenance / gain)
- Allow the owner to input the cat's starting weight for calibration
- Support English, Italian, and Spanish interfaces

### Non-Goals (explicitly out of scope for v1)
- Physical hardware construction (hardware design files provided as concept)
- Veterinary report export or direct vet integration
- Multi-cat household support (designed for, built for post-MVP)
- Automatic weight measurement via sensor
- Mobile native app (iOS/Android)
- Payment or subscription management

---

## 6. Success Metrics

### Primary Metrics
| Metric | Description | Target |
|---|---|---|
| **Meal adherence rate** | % of scheduled meals successfully dispensed and consumed | > 90% |
| **Recognition accuracy** | % of cat detections correctly identified | > 95% |
| **Alert response rate** | % of skip-meal alerts acknowledged by owner within 1 hour | Measurable |
| **Routine consistency** | Variance in actual vs. scheduled feeding times | < 5 minutes |

### Secondary Metrics
| Metric | Description |
|---|---|
| **Weight goal progress** | Delta between starting weight and current weight toward goal |
| **Owner engagement** | Daily active sessions in the dashboard |
| **Feeding history completeness** | % of events logged with full data (cat ID, portion, timestamp, confidence score) |

### Relationship Metric (qualitative)
The system is successful when an owner, looking at their cat's feeding history, feels **informed rather than anxious** — when the data confirms what good care looks like, rather than replacing the act of caring.

---

## 7. Assumptions

- The owner will photograph their cat during onboarding to train the recognition model
- The owner will input the cat's current weight and select a weight goal at setup
- The feeder device has a camera with sufficient FOV to capture the cat's face during feeding
- Internet connectivity is available at the feeder location
- One feeder serves one primary cat (multi-cat support is post-MVP)

---

## 8. Constraints

- **Timeline:** 5 days, solo developer, ~20 hours total
- **Budget:** AWS Free Tier only (no paid services)
- **Platform:** Web application (SvelteKit), simulated hardware dashboard
- **Judges:** Must be able to access and test the project free of charge during July 8–14, 2026

---

## 9. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| AWS Rekognition misidentifies cats of similar breed | High | Confidence threshold + manual override in UI |
| Temporal workflow complexity exceeds time budget | Medium | Start with simple schedules, add complexity last |
| SvelteKit learning curve slows frontend progress | Medium | Leverage React knowledge, study incrementally |
| Hardware simulation feels unconvincing to judges | Low | Polished UI dashboard + Figma prototype in docs |

---

## 10. Open Questions

- [ ] Should weight input be mandatory during onboarding or optional?
- [ ] What is the minimum confidence score threshold for dispensing vs. rejecting?
- [ ] Should skipped meal alerts be push notifications, in-app only, or email?
- [ ] How many photos are needed during onboarding to train Rekognition reliably?