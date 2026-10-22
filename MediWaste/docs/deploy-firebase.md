# Deploying the trusted backend (Firebase)

The backend runs as Cloud Functions gen-2 in `functions/`. It is the only place
that applies protected state transitions, writes the duplicate-request ledger,
and authenticates ESP32 stations.

## 1. One-time setup

```bash
npm install -g firebase-tools   # or use npx firebase-tools
firebase login
firebase use people-s-info      # your project (already in .firebaserc)
```

Make sure Firestore is enabled in the console (Database → Create database).

## 2. Build & deploy

```bash
npm run functions:build          # installs deps + compiles -> functions/lib
npx firebase-tools deploy --only firestore:rules,functions
```

Deploys:

- `processStationRequestCallable` — callable from the signed-in dashboard/phone
  client. Identity comes from Firebase Auth; unauthenticated callers are
  rejected with `UNAUTHORISED`/`UNAUTHENTICATED`.
- `stationHttpRequest` — HTTPS POST endpoint for the ESP32.

## 3. Provision a station (create its device token)

Stations authenticate with a per-station **bearer token** — generated once, then
saved to NVS on the device. No Firebase admin key ever reaches hardware.

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
```

In Firestore create `medwaste_stations/<stationId>`:

```
name: Verification Station A
locationId: loc-1
provisioningToken: <the generated token>   # read by the backend only; consider splitting storage later
serialNumber: MW-VS-A-001
```

Rules currently let signed-in admins manage station docs; the Cloud Function
resolves the token server-side per request.

Then feed the device over USB serial (115200) on first boot:

```
SET ID station-1
SET SSID <wifi>
SET PASS <wifi password>
SET TOKEN <the same token>
SAVE
```

## 4. Point the ESP32 firmware at your deployment

Edit `BACKEND_URL` in `src/hardware/firmware/esp32/VerifyPointESP32.ino` (or set
the `BACKEND_URL` build flag) to:

```
https://europe-west2-people-s-info.cloudfunctions.net/stationHttpRequest
```

(region follows `setGlobalOptions` in `functions/src/index.ts` — europe-west2.)

For verified TLS, save the GTS Root R4 certificate (download from Google Trust
Services PKI) as `src/hardware/firmware/esp32/certs/gts_root_r4.h` — without it
the firmware compiles in demo mode with TLS verification disabled and prints a
permanent warning.

## 5. Seed demo data

```bash
npm run seed     # optional: writes fictional demo records (requires CLI auth)
```

## 6. Verify

```bash
curl -s -X POST https://europe-west2-people-s-info.cloudfunctions.net/stationHttpRequest \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"v":1,"msgId":"curl-test-001","stationId":"station-1","operation":"inspection_started","donationId":"MW-AB12CD34"}'
```

Expected: `{"status":"REQUEST_ACCEPTED",...}` (or a refusal status for locked
records). Without the token header you must get `UNAUTHORISED`.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Deploy asks to upgrade pricing | v2 functions need Blaze; emulator still works free |
| Device LCD shows `backend cfg err` | wrong BACKEND_URL |
| `UNAUTHORISED` on device requests | token mismatch or stationId ≠ token's station |
| Rules deny dashboard writes | deploy `firestore.rules` (`npm run deploy:rules`) |
