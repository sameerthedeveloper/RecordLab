"use client";

import { EmailAuthProvider, GoogleAuthProvider, deleteUser, reauthenticateWithCredential, reauthenticateWithPopup, type User } from "firebase/auth";
import { collection, doc, getDocs, query, where, writeBatch, type DocumentReference } from "firebase/firestore";
import { getDb } from "./firebaseConfig";
import { hasPasswordSignIn } from "./authService";

/**
 * Layer one of "reset" and "delete": prove it is really the owner. Password accounts re-enter the password;
 * Google accounts go through the Google popup again (so call this straight from a click, with nothing awaited first).
 */
export async function verifyOwner(user: User, password?: string): Promise<void> {
  if (hasPasswordSignIn(user) && user.email) {
    if (!password) throw Object.assign(new Error("Enter your password."), { code: "auth/missing-password" });
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
    return;
  }
  await reauthenticateWithPopup(user, new GoogleAuthProvider());
}

async function refsWhere(path: string, field: string, uid: string): Promise<DocumentReference[]> {
  const snap = await getDocs(query(collection(getDb(), path), where(field, "==", uid)));
  return snap.docs.map((d) => d.ref);
}

async function deleteAll(refs: DocumentReference[]): Promise<void> {
  for (let i = 0; i < refs.length; i += 400) {
    const batch = writeBatch(getDb());
    refs.slice(i, i + 400).forEach((r) => batch.delete(r));
    await batch.commit();
  }
}

/** Everything the person made: records, share links, hand-ins, subjects and saved settings (users/<uid>). */
async function wipeContent(uid: string): Promise<void> {
  const refs = [
    ...(await refsWhere("documents", "userId", uid)),
    ...(await refsWhere("shares", "userId", uid)),
    ...(await refsWhere("submissions", "studentUid", uid)),
    doc(getDb(), "users", uid),
  ];
  await deleteAll(refs);
}

/** Clears this browser's copy too: the editor draft, defaults and remembered choices. */
function clearLocal(): void {
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith("recordlab")) localStorage.removeItem(k);
    for (const k of Object.keys(sessionStorage)) if (k.startsWith("recordlab")) sessionStorage.removeItem(k);
  } catch {}
}

/** Reset: back to a brand-new account. The login stays; records, subjects, share links and settings go. */
export async function resetAccount(user: User): Promise<void> {
  await wipeContent(user.uid);
  clearLocal();
}

/** Delete: everything above, plus the profile row, any faculty request or classes, and the sign-in itself. Cannot be undone. */
export async function deleteAccount(user: User): Promise<void> {
  const uid = user.uid;
  await wipeContent(uid);
  await deleteAll([
    ...(await refsWhere("classes", "facultyUid", uid)),
    doc(getDb(), "facultyRequests", uid),
    doc(getDb(), "welcomes", uid),
    doc(getDb(), "profiles", uid),
  ]);
  clearLocal();
  await deleteUser(user);
}
