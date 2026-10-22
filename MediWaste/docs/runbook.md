# Runbook

## First-time setup

See `docs/setup.md`. In short:

```bash
npm install
cp .env.example .env.local
# edit .env.local
npm run emu        # terminal 1 (needs Java 21+)
npm run dev        # terminal 2
```

## Daily operations

### Register a new package

1. Go to **Donations** and click **New intake**.
2. Enter the package code (or use **Suggest a code**).
3. Enter package details (description, form, strength, manufacturer, batch, expiry, quantity, unit).
4. Enter donor information.
5. Choose the intake location and enter your staff identifier.
6. Click **Register package**.

The donation is created with status **Registered** and an audit event is recorded.

### Inspect and verify

1. From **Overview** or **Donations**, open a donation that is **Awaiting Inspection**.
2. On the donation detail page, click **Start inspection**.
3. Record observations and any evidence references.
4. Run verification checks:
   - **Expiry check** — compare against the supplied expiry date.
   - **Reference data match** — compare product/batch details against reference data.
   - **Visual inspection** — packaging condition, labelling, seal integrity.
5. Record the result of each check as pass, fail, or inconclusive.
6. Complete the inspection with a verification outcome and reason.

Outcomes route the donation appropriately:
- Clear pass → **Approved for Next Stage** (if no discrepancies).
- Review required → **Pending Verification** / **Quarantined for Review**.
- Fail/discrepancy → **Discrepancy Detected**.

### Report and resolve discrepancies

1. From **Review**, open an open discrepancy.
2. Review the discrepancy title, detail, and any attached observations.
3. Resolve the discrepancy with a resolution note, or escalate to authorised review.

Only authorised reviewers can resolve discrepancies in production.

### Authorised review

1. From **Review**, find packages awaiting review.
2. Review the inspection outcome, verification checks, and any discrepancies.
3. Record a decision: **Approved** or **Rejected**, with a reason.

Approved packages move to **Approved for Next Stage**. Rejected packages move to **Rejected**.

### Record a handover

1. From a donation detail page, click **Record handover**.
2. Enter the recipient identifier and an optional note.
3. Confirm.

The handover is added to the chain of custody and an audit event is recorded.

### Record a disposition

1. From a donation detail page (typically after approval), click **Record disposition**.
2. Choose the disposition type:
   - **Reuse eligible**
   - **Destroy**
   - **Return to supplier**
   - **Held**
   - **Other**
3. Add a note if needed.
4. Confirm.

Only administrators can record dispositions in production.

## Station console

1. Go to **Station**.
2. Select a station.
3. View gate state, last heartbeat, and status.
4. Use **Send command** to:
   - Open/close the gate (admin only in production).
   - Set servo position.
   - Update the LCD message.
   - Set the status LED colour.
   - Trigger a beep.
5. Watch the command history for sent/acknowledged/rejected/timeout states.
6. View the recent events feed.

In production, commands are forwarded to the Arduino via the hardware bridge when the
station is online. The gate default is CLOSED and sensor readings do not independently
authorise acceptance.

## Simulator

1. Go to **Simulator**.
2. Use the live console to:
   - Open/close the gate.
   - Simulate IR and ultrasonic sensor readings.
   - Update the LCD message.
   - Enter keypad values and submit them.
   - Set servo position.
   - Set the status LED colour.
   - Trigger a beep.
3. Register demo packages from the simulator's **Demo intake** section.
4. Watch the event log for simulated station events.

Use the simulator to demonstrate the full workflow without hardware.

## Reports

1. Go to **Reports**.
2. Review summary cards: total donations, total items, approved, rejected, open discrepancies,
   dispositions recorded, stations online/total.
3. Review the **Donations by status** table.
4. Click **Export CSV** to download a CSV of the current local dataset.

Reports reflect the current local in-memory store and any seeded demo records. They are not
production metrics.

## Settings

1. Go to **Settings**.
2. Set your demo role (viewer, intake, reviewer, admin) for the current browser session.
3. Review locations, stations, and reference data.
4. Read the seeded-data note: reference products and demo donations are fictional and not an
   official pharmaceutical database.

In production, roles are managed in Firebase and enforced by Cloud Functions.

## Troubleshooting

- **Cannot sign in:** in emulator mode, create an account via the login page. If using real
  Firebase, confirm Auth is enabled and the email/password provider is on.
- **Station shows offline:** with the simulator, the station stays online. With real hardware,
  confirm the bridge is running and the serial/Bluetooth connection is active.
- **Gate won't open:** in production, only administrators can open the gate, and the backend
  must authorise the command. In the simulator, use the **Open** button.
- **CSV export is empty:** only donations currently in the local store are exported. Register
  some donations first.
- **Type errors after changes:** run `npm run build` or `tsc --noEmit` to locate type issues.
- **Emulator auth not working:** confirm `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true` and that
  the emulators are running.

## Safety notes

- A database match, colour reading, barcode, QR code, or sensor result must never be represented
  as proof that a medicine is genuine, uncontaminated, safe, or legally eligible for reuse.
- The prototype is an intake and review-support system, not a certified pharmaceutical
  authentication device.
- The default physical gate state is CLOSED.
- Sensor readings and device messages must not independently authorise acceptance.
