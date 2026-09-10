import { onAuthStateChanged, type User } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { getDb, getFirebaseAuth } from "./firebaseConfig";
import { getPuterIdentity } from "./puter";
import type { RecordState, WatermarkOptions } from "./types";

const COLLECTION = "documents";

/** The .rlab.json payload shape — see docs/rlab-json-format.md. */
export interface RlabPayload {
  version: number;
  record: RecordState;
  watermark: WatermarkOptions;
}

export interface CloudDocument {
  id: string;
  userId: string;
  puterUserId: string | null;
  puterUsername: string | null;
  title: string;
  data: RlabPayload;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

/**
 * Firestore documents are owned by the Firebase Auth uid (`request.auth.uid`
 * in firestore.rules) of a real Google sign-in — see lib/authService.ts.
 * There's deliberately no anonymous-auth fallback: forcing a silent
 * signInAnonymously() before Firebase had a chance to restore a persisted
 * Google session (an async process) raced with that restore on every page
 * refresh, sometimes winning and leaving the app on a fresh anonymous uid
 * that couldn't see the signed-in user's documents (Missing or insufficient
 * permissions). Waiting for the first real onAuthStateChanged event instead
 * avoids the race entirely.
 */
let authInitPromise: Promise<void> | null = null;

function waitForAuthInit(): Promise<void> {
  if (!authInitPromise) {
    const auth = getFirebaseAuth();
    authInitPromise = new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, () => {
        unsubscribe();
        resolve();
      });
    });
  }
  return authInitPromise;
}

async function requireUser(): Promise<User> {
  await waitForAuthInit();
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error("Sign in with Google to use cloud features.");
  return user;
}

function toCloudDocument(id: string, data: Record<string, unknown>): CloudDocument {
  return {
    id,
    userId: (data.userId as string) ?? "",
    puterUserId: (data.puterUserId as string) ?? null,
    puterUsername: (data.puterUsername as string) ?? null,
    title: (data.title as string) ?? "Untitled",
    data: data.data as RlabPayload,
    createdAt: (data.createdAt as Timestamp) ?? null,
    updatedAt: (data.updatedAt as Timestamp) ?? null,
  };
}

/** Saves a new document. Puter linking is best-effort and silent (no sign-in popup) — see `getPuterIdentity`. */
export async function saveDocument(payload: RlabPayload, title: string): Promise<string> {
  const user = await requireUser();
  const puterUser = await getPuterIdentity();

  const docRef = await addDoc(collection(getDb(), COLLECTION), {
    userId: user.uid,
    puterUserId: puterUser?.uuid ?? null,
    puterUsername: puterUser?.username ?? null,
    title: title.trim() || "Untitled",
    data: payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/** Live-subscribes to the current user's documents, newest first. Returns an unsubscribe function. */
export async function watchUserDocuments(
  onChange: (documents: CloudDocument[]) => void,
  onError: (error: Error) => void
): Promise<() => void> {
  const user = await requireUser();
  const q = query(collection(getDb(), COLLECTION), where("userId", "==", user.uid), orderBy("createdAt", "desc"));

  return onSnapshot(
    q,
    (snapshot) => {
      onChange(snapshot.docs.map((d) => toCloudDocument(d.id, d.data())));
    },
    (err) => onError(err instanceof Error ? err : new Error(String(err)))
  );
}

export async function updateDocument(docId: string, payload: RlabPayload, title: string): Promise<void> {
  await requireUser();
  await updateDoc(doc(getDb(), COLLECTION, docId), {
    title: title.trim() || "Untitled",
    data: payload,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteDocument(docId: string): Promise<void> {
  await requireUser();
  await deleteDoc(doc(getDb(), COLLECTION, docId));
}
