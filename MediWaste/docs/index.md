# Documentation

- [Setup](setup.md) — prerequisites, install, environment, emulators, running the app, firmware.
- [Architecture](architecture.md) — layers, data flow, auth, backend enforcement, hardware integration, simulator.
- [Runbook](runbook.md) — daily operations, common tasks, station console, simulator, reports, troubleshooting.

## Project structure

- `src/app/` — Next.js App Router frontend (12 pages).
- `src/backend/` — backend business logic (production: Cloud Functions; demo: mirrored in data-store).
- `src/types/` — shared domain types and Zod schemas.
- `src/lib/` — Firebase client init, helpers, in-memory demo data store.
- `src/components/` — UI components: app shell, auth context, shadcn-style primitives, donation UI.
- `src/hardware/bridge/` — Node.js serial/Bluetooth bridge.
- `src/hardware/firmware/` — Arduino C++ firmware.
- `src/hardware/simulator/` — hardware simulator.
- `docs/` — setup, architecture, and runbook.
- `.env.example` — example environment variables (placeholders only).

## Stack

- Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS
- Firebase Authentication, Firestore, Cloud Functions, Emulator Suite
- shadcn-style UI primitives (button, input, label, select, textarea, card, badge, table, sheet)
- Zod for validation
- Node.js hardware bridge (serial/HC-05)
- Arduino C++ firmware
- Hardware simulator

## Safety

- A database match, colour reading, barcode, QR code, or sensor result must never be represented
  as proof that a medicine is genuine, uncontaminated, safe, or legally eligible for reuse.
- The prototype is an intake and review-support system, not a certified pharmaceutical
  authentication device.
- The default physical gate state is CLOSED.
- Sensor readings and device messages must not independently authorise acceptance.

## Data

- The local build seeds clearly-labelled fictional data (donations, stations, locations, reference
  products) for demonstration.
- Reference products are labelled as fictional and are not an official pharmaceutical database.
- Reports are derived from the current local dataset and are not production metrics.
- In production, data is persisted in Cloud Firestore with appropriate access controls and auditability.
