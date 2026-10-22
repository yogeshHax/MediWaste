# Architecture

## Layers

1. **Frontend** — Next.js App Router, React, TypeScript, Tailwind CSS, shadcn-style UI.
   - 12 pages: login, overview, donations, donations/new, donations/[code], review, station,
     handovers, dispositions, reports, settings, simulator.
   - Shared domain types and Zod schemas in `src/types/`.
   - Client-side Firebase Auth with role awareness for the emulator demo.

2. **Shared domain** — TypeScript types, Zod validation, Firebase client init.
   - `src/types/schema.ts` defines every domain object and operation schema.
   - `src/lib/firebase.ts` initialises Firebase and connects to emulators when configured.

3. **Backend** — Firebase Cloud Functions (production) + in-memory demo store.
   - `src/backend/index.ts` contains the authoritative business logic and role checks.
   - In production, the same functions are enforced inside Cloud Functions so the client
     cannot bypass validation or authorisation.
   - The local emulator demo mirrors this logic in `src/lib/data-store.ts` so the UI can
     be demonstrated without real credentials.

4. **Data** — Cloud Firestore (production) + emulator.
   - Donations, inspections, verification checks, discrepancies, reviews, handovers,
     dispositions, audit history, stations, locations, reference products.

5. **Hardware** — Arduino firmware + Node.js serial/Bluetooth bridge + simulator.
   - `src/hardware/firmware/VerifyPoint.ino` — Arduino firmware.
   - `src/hardware/bridge/index.ts` — Node.js serial/Bluetooth bridge.
   - `src/hardware/simulator/index.ts` — hardware simulator for dev/demo.

## Data flow

1. A staff member signs in and selects a role (demo). In production, roles are assigned
   in Firebase and enforced by Cloud Functions.
2. A donation is registered; the backend creates a unique code, records intake staff and
   timestamp, validates required fields, and writes an audit event.
3. An inspector starts an inspection, records observations, runs verification checks
   (expiry, reference data match, visual), and completes the inspection with an outcome.
4. Verification checks compare entered product/batch details against seeded reference data
   and flag missing, inconsistent, expired, or otherwise review-worthy information.
5. Discrepancies are reported and routed to quarantine/review. Only authorised reviewers
   can resolve discrepancies or make review decisions.
6. Authorised review decisions (approve/reject) transition the donation status and record
   the reviewer, reason, and timestamp.
7. Handovers record chain of custody between authorised parties.
8. An authorised disposition is recorded with type, authoriser, timestamp, and note.
9. The station console shows station status, sensor readings, and command history; commands
   are queued and forwarded to the hardware bridge when a station is online.
10. The simulator mirrors the hardware protocol so the full workflow can be demonstrated
    without physical hardware.

## Auth and authorisation

- Client-side Firebase Auth for sign-in.
- Role awareness is a demo convenience in the emulator build. In production:
  - Roles are assigned per user in Firebase.
  - All business-critical operations (create donation, start/complete inspection,
    report/resolve discrepancy, review decision, handover, disposition, gate control)
    are enforced by Cloud Functions, not by the client.
- The default physical gate state is CLOSED. Sensor readings and device messages do not
  independently authorise acceptance.

## Hardware integration

- The Arduino firmware reports sensor state and executes commanded gate movements.
- The firmware does not decide whether a package is genuine, safe, or eligible for reuse.
- The backend validates and authorises commands before they reach the device.
- The Node.js bridge communicates over serial (USB) or Bluetooth (HC-05), sends commands,
  and receives events.
- The simulator emits the same event types so the station console and event feed work
  without hardware.

## Simulator vs production

- Simulator: in-memory, emits station events, mirrors firmware protocol semantics.
- Production: real serial/Bluetooth bridge + Arduino firmware + Cloud Functions + Firestore.

## Seeded data

- The local store seeds clearly-labelled fictional donations, stations, locations,
  and reference products for demonstration.
- Reference products are labelled as fictional and are not an official pharmaceutical
  database.
- Reports are derived from the current local dataset and are not production metrics.
