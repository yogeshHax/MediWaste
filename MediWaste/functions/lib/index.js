"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROTOCOL_COPY = exports.stationHttpRequest = exports.processStationRequestCallable = void 0;
/**
 * MedWaste VerifyPoint — trusted backend (Cloud Functions, gen-2).
 *
 * Two entry points, one rulebook:
 *   1. processStationRequest  (callable)  — phone app / dashboard
 *   2. stationHttpRequest     (HTTPS)     — ESP32 station devices
 *
 * The ESP32 holds NO Firebase admin key. It authenticates with a per-station
 * bearer token stored in `medwaste_stations/{stationId}.provisioningToken`,
 * created by an admin during provisioning.
 */
const v2_1 = require("firebase-functions/v2");
const https_1 = require("firebase-functions/v2/https");
const https_2 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
const admin = __importStar(require("firebase-admin"));
const zod_1 = require("zod");
const protocol_1 = require("./protocol");
admin.initializeApp();
(0, v2_1.setGlobalOptions)({ region: "europe-west2", maxInstances: 10 });
const db = admin.firestore();
// ---------------------------------------------------------------------------
// Shared protocol schema (kept in sync with src/lib/station/protocol.ts)
// ---------------------------------------------------------------------------
const PROTOCOL_COPY = {
    PROTOCOL_VERSION: protocol_1.PROTOCOL_VERSION,
    PERMITTED_TRANSITIONS: protocol_1.PERMITTED_TRANSITIONS,
};
exports.PROTOCOL_COPY = PROTOCOL_COPY;
const IncomingRequestSchema = zod_1.z.object({
    v: zod_1.z.literal(protocol_1.PROTOCOL_VERSION),
    msgId: zod_1.z.string().min(4).max(64),
    stationId: zod_1.z.string().min(1).max(64),
    operation: protocol_1.StationOperationSchema,
    donationId: zod_1.z.string().min(1).max(64),
    actorUid: zod_1.z.string().max(128).optional(),
    deviceSerial: zod_1.z.string().min(1).max(64).optional(),
});
const PREFIX = "medwaste_";
// ---------------------------------------------------------------------------
// Core processing — shared by both transports.
// ---------------------------------------------------------------------------
async function processRequest(raw, callerKind) {
    // 1. Validate the message.
    const parsed = IncomingRequestSchema.safeParse(raw);
    if (!parsed.success) {
        return {
            v: protocol_1.PROTOCOL_VERSION,
            msgId: raw?.msgId ?? "",
            ack: true,
            status: "INVALID_MESSAGE",
            detail: "Malformed request frame",
            appliedAt: Date.now(),
        };
    }
    const req = parsed.data;
    const respond = (status, extra = {}) => ({
        v: protocol_1.PROTOCOL_VERSION,
        msgId: req.msgId,
        ack: true,
        status,
        detail: (0, protocol_1.statusHeadline)(status),
        appliedAt: Date.now(),
        ...extra,
    });
    try {
        // 2. Resolve the actor. Callables carry a verified Auth uid; station HTTPS
        //    callers leave actorUid unset (identity = the station itself).
        let actorUid = req.actorUid ?? null;
        if (callerKind === "client" && !actorUid) {
            // Unreachable in production (callable injects the uid, and validation
            // would reject an empty frame) — kept as a defensive check.
            return respond("UNAUTHORISED", { detail: "Missing caller identity" });
        }
        // 3. Validate the referenced donation — read the SERVER copy of the record.
        const donations = db.collection(`${PREFIX}donations`);
        let donationSnap = await donations.doc(req.donationId).get();
        if (!donationSnap.exists) {
            // Treat the donationId as the human code and search for it.
            const byCode = await donations
                .where("code", "==", req.donationId.toUpperCase())
                .limit(1)
                .get();
            donationSnap = byCode.docs[0] ?? donationSnap;
            if (!donationSnap.exists)
                return respond("UNKNOWN_ID");
        }
        const donation = donationSnap.data();
        const currentStatus = donation.status ?? "registered";
        // 4. Duplicate protection — ledger keyed by msgId.
        const ledgerDoc = db
            .collection(`${PREFIX}donations`)
            .doc(donationSnap.id)
            .collection("request_ledger")
            .doc(req.msgId);
        const seen = await ledgerDoc.get();
        if (seen.exists)
            return respond("ALREADY_PROCESSED", { currentStatus });
        // 5. Evaluate the transition against the stored state, not the request.
        const result = (0, protocol_1.evaluateTransition)({
            operation: req.operation,
            donation: { status: currentStatus, code: donation.code ?? donationSnap.id },
        });
        if (result.status !== "REQUEST_ACCEPTED") {
            return respond(result.status, { currentStatus: result.currentStatus });
        }
        // 6. Apply atomically: transition + ledger + audit in one transaction.
        const to = result.currentStatus;
        await db.runTransaction(async (tx) => {
            tx.update(donations.doc(donationSnap.id), {
                status: to,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                auditHistory: admin.firestore.FieldValue.arrayUnion({
                    event: `station_${req.operation}`,
                    actorUid: actorUid ?? `station:${req.stationId}`,
                    detail: "Authenticated station transition.",
                    at: admin.firestore.FieldValue.serverTimestamp(),
                }),
            });
            tx.create(ledgerDoc, {
                operation: req.operation,
                stationId: req.stationId,
                actorUid,
                at: admin.firestore.FieldValue.serverTimestamp(),
            });
        });
        return respond("REQUEST_ACCEPTED", { currentStatus: to, donationCode: donation.code });
    }
    catch (error) {
        if (error instanceof https_1.HttpsError)
            throw error;
        logger.error("processRequest failed", error);
        return respond("SERVER_ERROR", {
            detail: error?.message?.slice(0, 120) ?? "unknown error",
        });
    }
}
// ---------------------------------------------------------------------------
// 1. Callable for the phone app and dashboard.
// ---------------------------------------------------------------------------
exports.processStationRequestCallable = (0, https_1.onCall)({ cors: true }, async (request) => {
    // Callable callers MUST be signed in; the identity comes from the token.
    const uid = request.auth?.uid;
    if (!uid) {
        throw new https_1.HttpsError("unauthenticated", "Sign in required.");
    }
    const actorMessage = { ...request.data, actorUid: uid, callerKind: "client" };
    // Reuse the station path but pass the caller kind so the branch below is
    // explicit and untrusted fields are ignored.
    const parsed = IncomingRequestSchema.safeParse(request.data);
    if (!parsed.success) {
        return { status: "INVALID_MESSAGE", detail: "Malformed request frame" };
    }
    return processRequest({ ...parsed.data, actorUid: uid }, "client");
});
// ---------------------------------------------------------------------------
// 2. HTTPS endpoint for ESP32 stations (bearer token = provisioning token).
// ---------------------------------------------------------------------------
exports.stationHttpRequest = (0, https_2.onRequest)({ region: "europe-west2" }, async (req, res) => {
    if (req.method !== "POST") {
        res.status(405).send("POST required");
        return;
    }
    // Station identity: Authorization: Bearer <provisioningToken>
    const authHeader = req.headers.authorization ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token || token.length < 24) {
        res.status(401).json({
            v: protocol_1.PROTOCOL_VERSION,
            ack: true,
            status: "UNAUTHORISED",
            detail: "Missing station token",
        });
        return;
    }
    // The token maps to exactly one station document.
    const stationSnap = await db
        .collection(`${PREFIX}stations`)
        .where("provisioningToken", "==", token)
        .limit(1)
        .get();
    if (stationSnap.empty) {
        res.status(401).json({
            v: protocol_1.PROTOCOL_VERSION,
            ack: true,
            status: "UNAUTHORISED",
            detail: "Unknown station token",
        });
        return;
    }
    const station = stationSnap.docs[0];
    const stationId = station.id;
    const parsed = IncomingRequestSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(200).json({
            v: protocol_1.PROTOCOL_VERSION,
            msgId: req.body?.msgId ?? "",
            ack: true,
            status: "INVALID_MESSAGE",
            detail: "Malformed frame",
            appliedAt: Date.now(),
        });
        return;
    }
    // Require the request to name THIS station (prevents token cross-talk).
    if (parsed.data.stationId !== stationId) {
        res.status(200).json({
            v: protocol_1.PROTOCOL_VERSION,
            msgId: parsed.data.msgId,
            ack: true,
            status: "UNAUTHORISED",
            detail: "Station ID does not match token",
            appliedAt: Date.now(),
        });
        return;
    }
    // Touch lastSeen (best effort, never blocks the response).
    station.ref.update({ lastHeartbeat: admin.firestore.FieldValue.serverTimestamp() })
        .catch(() => undefined);
    const result = await processRequest({ ...parsed.data, deviceSerial: parsed.data.deviceSerial ?? "" }, "station");
    res.status(200).json(result);
});
//# sourceMappingURL=index.js.map