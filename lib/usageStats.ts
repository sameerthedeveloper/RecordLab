import { doc, increment, setDoc } from "firebase/firestore";
import { getDb, getFirebaseAuth } from "./firebaseConfig";

/** UTC calendar day, e.g. "2026-10-10": the document id of that day's counters. */
export function dayKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Adds one to this event's counter for today and for all time (stats/<day>, stats/_all).
 * Content-free: no user id, no record data. Only signed-in users write (see firestore.rules),
 * so signed-out usage shows up in Firebase Analytics but not in the admin panel.
 * Fire-and-forget; never throws.
 */
export function recordUsageEvent(name: string): void {
  try {
    if (!getFirebaseAuth().currentUser) return;
    const bump = { events: { [name]: increment(1) }, total: increment(1) };
    const db = getDb();
    void setDoc(doc(db, "stats", dayKey()), { day: dayKey(), ...bump }, { merge: true }).catch(() => {});
    void setDoc(doc(db, "stats", "_all"), bump, { merge: true }).catch(() => {});
  } catch {
    /* analytics must never break the app */
  }
}
