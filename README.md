# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project
npx sv create my-app
```

To recreate this project with the same configuration:

```sh
# recreate this project
npx sv@0.16.1 create --template minimal --types ts --add prettier eslint tailwindcss="plugins:none" paraglide="languageTags:en, es, it+demo:no" --install yarn .
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.
-----
# TreatsAI

> Smart Food, Zero Judgment 🐾

An AI-powered cat food dispenser that recognizes individual cats via computer vision, tracks eating habits, and adjusts portions automatically — built for **World Cat Domination Day**.

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
- [Testing](#testing)
- [Demo Video](#demo-video)
- [Roadmap](#roadmap)
- [License](#license)

---

## What It Does

<!-- TODO: 2-3 sentence plain description of the product, written for someone who has never seen it -->

## Why It's Different

<!-- TODO: the innovation angle — most feeders are dumb timers, this one learns. Mention SvelteKit edge-first choice + Temporal durable workflows as part of the innovation story -->

## Theme Connection

<!-- TODO: explicit connection to World Cat Domination Day — make it intentional, not surface-level -->

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | SvelteKit (edge-first) | <!-- TODO --> |
| Styling | Tailwind CSS | <!-- TODO --> |
| i18n | Paraglide (EN / IT / ES) | <!-- TODO --> |
| Workflow Orchestration | Temporal | <!-- TODO --> |
| Computer Vision | AWS Rekognition | <!-- TODO --> |
| Database | AWS DynamoDB | <!-- TODO --> |
| Compute | AWS Lambda | <!-- TODO --> |
| Storage | AWS S3 | <!-- TODO --> |
| Real-time updates | Server-Sent Events (SSE) | <!-- TODO --> |

## Architecture

<!-- TODO: system architecture diagram (image) + written walkthrough -->

## Getting Started

### Prerequisites

<!-- TODO: Node version, AWS account requirements, env vars needed -->

### Installation

```sh
git clone <repo-url>
cd treatsai
yarn install
```

### Environment Variables

<!-- TODO: .env.example contents explained -->

### Running locally

```sh
yarn dev
```

## Project Structure

<!-- TODO: brief folder map once features are built -->

## Features

<!-- TODO: checklist of implemented features, matches Priority 2 list -->

- [ ] Cat recognition (AWS Rekognition)
- [ ] Automated feeding schedule (Temporal)
- [ ] Portion adjustment logic
- [ ] Skip-meal alerts
- [ ] Feeding history log
- [ ] Real-time dashboard

## Security

<!-- TODO: auth approach, data handling practices, Aikido scan report link -->

## Hardware Design

<!-- TODO: Figma prototype link + 3D model file reference, explain it's a conceptual design for future physical build -->

## Testing

<!-- TODO: if any unit tests added, document here -->

## Demo Video

<!-- TODO: link, under 5 minutes, English narration -->

## Roadmap

<!-- TODO: what's next post-hackathon (physical hardware, multi-cat support, etc.) -->

## License

<!-- TODO -->