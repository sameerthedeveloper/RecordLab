import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

/**
 * The Firebase Admin SDK, used only where the server must write something a browser must never be able to
 * write (a paid subscription). Needs FIREBASE_SERVICE_ACCOUNT: the service-account JSON, as plain JSON or base64.
 */
function credentials() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  if (!raw) return null;
  try {
    const json = raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
    const sa = JSON.parse(json) as { project_id?: string; client_email?: string; private_key?: string };
    if (!sa.project_id || !sa.client_email || !sa.private_key) return null;
    return { projectId: sa.project_id, clientEmail: sa.client_email, privateKey: sa.private_key.replace(/\\n/g, "\n") };
  } catch {
    return null;
  }
}

export const adminSdkConfigured = () => credentials() !== null;

let app: App | null = null;

/** The server's Firestore, or null when FIREBASE_SERVICE_ACCOUNT is missing or unreadable. */
export function getAdminDb(): Firestore | null {
  if (!app) {
    const c = credentials();
    if (!c) return null;
    app = getApps()[0] ?? initializeApp({ credential: cert(c) });
  }
  return getFirestore(app);
}
