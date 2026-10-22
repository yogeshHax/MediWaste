# MedWaste VerifyPoint — Agent guidance

## Project

- Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS
- Firebase Auth + Firestore + Cloud Functions + Emulator Suite
- Node.js hardware bridge (serial/HC-05), Arduino firmware, simulator
- shadcn/ui components in `src/components/ui/`

## Conventions

- Use `@/` imports for `src/`.
- Keep backend business logic and authorisation in Cloud Functions, not client-side.
- Validate all inputs with Zod; share schemas in `src/types/`.
- Never commit secrets. Use `.env.example` placeholders only.
- Hardware events must never independently authorise acceptance; gate default is CLOSED.

## Firebase

Run emulators locally:
- `npm run emu` — auth + firestore
- `npm run functions:emulator` — cloud functions

## Hardware

- Firmware: `src/hardware/firmware/` (Arduino C++)
- Bridge: `src/hardware/bridge/index.ts` (serial/HC-05; TS module, not a standalone `node` entry point)
- Simulator: `src/hardware/simulator/index.ts` (in-app at `/simulator`)

Launchers: `start-mediwaste.bat` (emulators + app) and `run-mediwaste-system.bat`
(emulators + app, opening `/simulator`). Shared helpers live in `scripts/`.
Emulator ports come from `firebase.json` (auth 9099, firestore 8085, UI 4000);
Firestore needs Java 21+.
