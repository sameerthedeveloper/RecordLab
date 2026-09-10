"use client";

import { useEffect, useState } from "react";
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import { getFirebaseAuth } from "./firebaseConfig";

const googleProvider = new GoogleAuthProvider();

/**
 * Deliberately does NOT await anything before calling signInWithPopup:
 * browsers only allow a popup opened synchronously within a user-gesture
 * call stack, and an `await` before it — even one that resolves
 * near-instantly — breaks that chain and gets it blocked (auth/popup-blocked).
 */
export async function signInWithGoogle(): Promise<User> {
  const auth = getFirebaseAuth();
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutUser(): Promise<void> {
  await signOut(getFirebaseAuth());
}

/**
 * Live Firebase auth state: null until Firebase resolves (fresh visitor, or
 * mid-restore of a persisted session on page load) or confirms nobody's
 * signed in. There's no anonymous fallback here — see lib/firestoreService.ts
 * for why forcing one caused permission errors on refresh.
 */
export function useAuthUser(): User | null {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => onAuthStateChanged(getFirebaseAuth(), setUser), []);

  return user;
}
