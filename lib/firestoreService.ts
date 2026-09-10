import { onAuthStateChanged, signInAnonymously, type User } from "firebase/auth";
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
 * Firestore documents are owned by the Firebase anonymous-auth uid
 * (`request.auth.uid` in firestore.rules), not by any Puter identity —
 * Firebase Auth can't verify a Puter session, so it can't be the security
 * boundary. Anonymous auth persists across reloads (same browser/device)
 * via Firebase's own local storage, and is silent — no popup, no login form.
 */
let authReadyPromise: Promise<User> | null = null;

export function ensureFirebaseAuth(): Promise<User> {
  if (!authReadyPromise) {
    const auth = getFirebaseAuth();
    authReadyPromise = new Promise((resolve, reject) => {
      const unsubscribe = onAuthStateChanged(
        auth,
        (user) => {
          if (user) {
            unsubscribe();
            resolve(user);
          }
        },
        reject
      );
      if (!auth.currentUser) {
        signInAnonymously(auth).catch((err) => {
          unsubscribe();
          reject(err);
        });
      }
    });
  }
  return authReadyPromise;
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
  const user = await ensureFirebaseAuth();
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
  const user = await ensureFirebaseAuth();
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
  await ensureFirebaseAuth();
  await updateDoc(doc(getDb(), COLLECTION, docId), {
    title: title.trim() || "Untitled",
    data: payload,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteDocument(docId: string): Promise<void> {
  await ensureFirebaseAuth();
  await deleteDoc(doc(getDb(), COLLECTION, docId));
}
