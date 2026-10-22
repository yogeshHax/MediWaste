# Setup guide

## Prerequisites

- **Node.js** 20+ (LTS recommended)
- **npm** 10+ ( Ships with Node)
- **Firebase CLI** (`npm install -g firebase-tools`) for emulators and deployment
- **Arduino IDE** or `arduino-cli` if you plan to build/upload the firmware (optional for the simulator)

## 1. Install dependencies

```bash
cd path/to/MedWasteVerifyPoint
npm install
```

## 2. Configure environment

Copy the example env file and fill in your values. **Never commit real credentials.**

```bash
cp .env.example .env.local
```

Edit `.env.local`. For local development with the Firebase emulators, you can often leave
the Firebase config blank and set `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true`.

Required variables (see `.env.example` for placeholders):

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true   # set true for local dev with emulators
FIREBASE_EMULATOR_AUTH_HOST=localhost
FIREBASE_EMULATOR_FIREBASE_EMULATOR_HOST=localhost
```

For production, point these at your real Firebase project and set
`NEXT_PUBLIC_USE_FIREBASE_EMULATORS=false` (or unset it).

## 3. Start the Firebase emulators

In one terminal:

```bash
npm run emu
```

This starts the Authentication and Firestore emulators locally. Cloud Functions can be
run with `npm run functions:emulator` when the `functions/` directory is configured.

## 4. The hardware simulator

The station simulator is built into the web app — open http://localhost:3000/simulator
after starting the dev server. It emits the same station events the real serial bridge
would forward, so no Arduino is required.

The emulator ports come from `firebase.json`: auth `9099`, Firestore `8085`, UI `4000`.
The Firestore emulator needs **Java 21 or newer**; on this machine a JDK is installed at
`%USERPROFILE%\tools\jdk-21` and is picked up automatically by the launcher scripts.

## 5. Start the app

In another terminal:

```bash
npm run dev
```

Open http://localhost:3000.

Recommended flow for a first look:

1. Open the home page and go to **Overview**.
2. Open **Simulator** and interact with the simulated station (open/close gate, sensors,
   LCD, keypad, servo, LED, beep). Watch the event log and the station console.
3. Go to **Donations** and register a package (or record a demo package from the simulator).
4. Open the donation detail and follow it through inspection, verification, review,
   handover, and disposition.
5. Use **Reports** to view summaries and export a CSV of the current local dataset.

## 6. Build for production

```bash
npm run build
npm start
```

## 7. Firebase project setup (production)

1. Create a Firebase project.
2. Enable Authentication (Email/Password) and Firestore.
3. Set up Cloud Functions for the privileged backend operations.
4. Configure Firebase Storage if needed.
5. Copy your Firebase config into `.env.local` (production values) and set
   `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=false`.
6. Deploy functions, then the web app.

See the Firebase docs for the latest setup steps for your platform.

## 8. Firmware (optional)

See `src/hardware/firmware/VerifyPoint.ino`.

1. Install the Arduino IDE or `arduino-cli`.
2. Install required libraries via the Library Manager:
   - `Servo`
   - `LiquidCrystal_I2C` (if using an I2C LCD)
   - `Keypad` (if using a membrane keypad)
3. Adjust pin numbers in the firmware to match your wiring.
4. Upload to the Arduino UNO.
5. Pair the HC-05 Bluetooth module to your bridge/device.

## 9. Hardware bridge

See `src/hardware/bridge/index.ts`.

In production, run the bridge as a small Node process that:
- opens the serial/Bluetooth connection to the Arduino,
- sends commands from the station command queue,
- receives sensor/state events and forwards them into the app.

The simulator mirrors this protocol so you can develop without hardware.

## Troubleshooting

- **Emulators not connecting:** make sure `npm run emu` is running and
  `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true` is set.
- **Auth errors in emulator:** the emulator accepts test accounts; use the login page
  and create an account, or seed test users in the emulator.
- **Station shows offline:** the simulator keeps the simulated station online; a real
  bridge would need a live serial/Bluetooth connection.
- **Types errors after adding a file:** run `npm run build` (or `tsc --noEmit`) to catch
  type issues; the project uses strict TypeScript.
