import { doc, serverTimestamp, setDoc, Timestamp } from "firebase/firestore";
import type { User } from "firebase/auth";
import { getDb } from "./firebaseConfig";

const SESSION_KEY = "recordlab.profile-touched";

/**
 * Keeps a small, content-free profile row (email, name, join date, last seen) for the admin
 * usage panel. Written at most once per browser session per user.
 */
export function touchProfile(user: User): void {
  try {
    if (sessionStorage.getItem(SESSION_KEY) === user.uid) return;
    sessionStorage.setItem(SESSION_KEY, user.uid);
  } catch {
    /* storage blocked: just write */
  }
  const created = user.metadata.creationTime ? Timestamp.fromDate(new Date(user.metadata.creationTime)) : null;
  void setDoc(
    doc(getDb(), "profiles", user.uid),
    {
      email: user.email ?? null,
      displayName: user.displayName ?? null,
      providers: user.providerData.map((p) => p.providerId),
      ...(created ? { createdAt: created } : {}),
      lastSeenAt: serverTimestamp(),
    },
    { merge: true }
  ).catch(() => {});
}
