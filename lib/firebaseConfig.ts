import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Lazily initialized on first use from client code only. Next.js prerenders
// "use client" pages on the server too, and initializing eagerly at module
// load would run this — with no browser and possibly no env vars yet —
// during that server pass, which throws (auth/invalid-api-key). Deferring
// to first call (always inside a useEffect or an event handler) avoids that.
let app: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;
let authInstance: Auth | null = null;
let analyticsInstance: Analytics | null = null;
let analyticsSupportChecked = false;

function getFirebaseApp(): FirebaseApp {
  if (!app) {
    app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
  }
  return app;
}

export function getDb(): Firestore {
  if (!dbInstance) dbInstance = getFirestore(getFirebaseApp());
  return dbInstance;
}

export function getFirebaseAuth(): Auth {
  if (!authInstance) authInstance = getAuth(getFirebaseApp());
  return authInstance;
}

/**
 * Resolves to null (not an error) when analytics can't run — no
 * NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID configured, server-side rendering, or
 * an unsupported browser (e.g. no IndexedDB, Safari private mode, tracker
 * blockers). `firebase/analytics`'s own `isSupported()` check covers the
 * last case; callers should treat a null result as "silently skip".
 */
export async function getFirebaseAnalytics(): Promise<Analytics | null> {
  if (analyticsInstance) return analyticsInstance;
  if (analyticsSupportChecked) return null;
  analyticsSupportChecked = true;

  if (typeof window === "undefined" || !firebaseConfig.measurementId) return null;
  if (!(await isSupported())) return null;

  analyticsInstance = getAnalytics(getFirebaseApp());
  return analyticsInstance;
}
