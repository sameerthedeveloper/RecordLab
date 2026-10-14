import { addDoc, collection, doc, getDoc, serverTimestamp } from "firebase/firestore";
import { getDb, getFirebaseAuth } from "./firebaseConfig";
import type { RlabPayload } from "./firestoreService";

const COLLECTION = "shares";

/**
 * Publishes a snapshot of the record and returns a link anyone can open in the editor
 * (an editable copy lands in their browser; the sender's own file is untouched).
 * Needs a signed-in user: only the owner can create or delete a share.
 */
export async function createShareLink(payload: RlabPayload, title: string): Promise<string> {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error("Sign in to create a share link.");
  const ref = await addDoc(collection(getDb(), COLLECTION), {
    userId: user.uid,
    title: title.trim() || "Untitled",
    data: payload,
    createdAt: serverTimestamp(),
  });
  return `${window.location.origin}/editor?share=${ref.id}`;
}

/** Reads a shared snapshot; null when the link is unknown or was removed. */
export async function loadSharedRecord(id: string): Promise<RlabPayload | null> {
  const snap = await getDoc(doc(getDb(), COLLECTION, id));
  const data = snap.exists() ? (snap.data().data as RlabPayload | undefined) : undefined;
  return data?.record ? data : null;
}
