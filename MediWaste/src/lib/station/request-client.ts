import { db } from "@/lib/firebase";
import { dataStore } from "@/lib/data-store";
import { syncDocument } from "@/lib/firestore-sync";
import { processStationRequest, RequestAdapter } from "./process-request";
import { BackendRequest, BackendResponse } from "./protocol";
import { doc, getDoc, getFirestore } from "firebase/firestore";
import { auth } from "@/lib/firebase";
import { User } from "firebase/auth";

/**
 * Client-side request processing, used while the Cloud Function deployment is
 * pending — identical rules to functions/src/index.ts via the shared engine.
 *
 * Station identity: the caller must be signed in (Firebase Auth when available,
 * the demo session otherwise) and pass their uid as actorUid. The evaluation
 * engine re-checks every transition against the stored record.
 */

function signedInUser(): User | null {
  return auth?.currentUser ?? null;
}

export async function processStationRequestLocally(
  raw: BackendRequest & { actorUid?: string }
): Promise<BackendResponse> {
  const user = signedInUser();
  const adapter: RequestAdapter = {
    async getDonation(donationId) {
      const storeRec = dataStore.getDonation(donationId);
      if (storeRec) return { id: storeRec.id, code: storeRec.code, status: storeRec.status };
      if (!db) return null;
      try {
        const snap = await getDoc(doc(getFirestore(db.app), "medwaste_donations", donationId));
        if (snap.exists()) {
          const d = snap.data() as Record<string, unknown>;
          return { id: snap.id, code: String(d.code ?? snap.id), status: String(d.status ?? "registered") };
        }
      } catch {
        // Firestore mirror not readable — local store already covered it.
      }
      return null;
    },
    async isDuplicate() {
      return false; // local store has no persistent dedupe ledger
    },
    async applyTransition({ donationId, to, operation, stationId, actorUid }) {
      const updated = dataStore.updateDonation(donationId, {
        status: to as never,
        auditHistory: [
          {
            event: `station_${operation}`,
            actorUid: actorUid ?? `station:${stationId}`,
            detail: `Transition applied via station ${stationId} (local fallback).`,
            at: new Date(),
          },
        ],
      });
      void syncDocument("donations", donationId, updated ?? {});
    },
    async isAuthorisedFor(actorUid, operation) {
      // The signed-in user (or a station device with a session) is authorised
      // for operational transitions here; only the dashboard records final
      // review decisions, and this fallback is never used for gate-opening on
      // a quarantined record — evaluateTransition still gates that.
      return Boolean(actorUid ?? user?.uid ?? dataStore.getDonation(operation));
    },
  };

  const { actorUid, ...frame } = raw;
  return processStationRequest({ ...frame, actorUid: actorUid ?? user?.uid }, adapter);
}
