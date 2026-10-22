# MedWaste VerifyPoint

A physical medicine-waste intake and verification station connected to a professional web application.

**This is an intake and review-support system, not a certified pharmaceutical authentication device.**

## Project structure

- `src/app/` — Next.js App Router frontend (13 pages incl. `/station/ble` phone companion)
- `functions/` — Firebase Cloud Functions — **trusted backend** (`processStationRequest`)
- `src/types/` — shared domain models and Zod validation schemas
- `src/lib/station/` — station protocol v1 + shared request-processing engine
- `src/lib/` — Firebase client init, helper utilities
- `src/hardware/firmware/esp32/` — **ESP32 firmware** (BLE + Wi-Fi + LCD + sensors + gate)
- `src/hardware/protocol.md` — station protocol v1 specification
- `src/hardware/simulator/` — hardware simulator for development and demos
- `docs/` — setup, architecture, runbook, and backend deployment documentation

## Hardware & station architecture

```
PHONE (BLE, Web Bluetooth) --BLE--> ESP32 --HTTPS(TLS, station token)--> Cloud Functions -> Firestore
                        <--response-- ESP32 <--response--
```

- Firmware, exact pin map, provisioning: `src/hardware/firmware/esp32/README.md`
- Trusted backend deployment: `docs/deploy-firebase.md`
- Gate opens ONLY on backend status `REQUEST_ACCEPTED`; default CLOSED.
- Protocol engine tests: `npm run test:protocol`

## Prerequisites

- Node.js 20+
- npm 10+
- Firebase CLI (`npm install -g firebase-tools`) for emulators and deployment
- Arduino IDE or `arduino-cli` for firmware (optional, for physical hardware)

## Local setup

Fastest path on Windows: double-click `start-mediwaste.bat`. It checks Node.js, installs
dependencies on first run, creates `.env.local`, starts the Firebase emulators when Java 21+
and the Firebase CLI are available, then starts the app on the first free port.

Manual steps:

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in your values.
3. Start the Firebase emulators: `npm run emu` (needs Java 21+)
4. Start the Next.js dev server: `npm run dev`
5. Open http://localhost:3000 — the station simulator lives at `/simulator`.

See `docs/` for full setup, architecture, and runbook details.

## Environment variables

See `.env.example`. **Never commit real credentials.**

## Export

To export a clean copy of this project (excluding `node_modules`, build caches, and secrets):

```bash
npm install
npm run build  # optional: verify build
# then zip the repo excluding node_modules/.next/.env*
```

See the project's export instructions for the verified download location.
