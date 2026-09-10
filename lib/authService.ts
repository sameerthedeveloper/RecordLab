"use client";

import { useEffect, useState } from "react";
import {
  GoogleAuthProvider,
  linkWithPopup,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { getFirebaseAuth } from "./firebaseConfig";
import { ensureFirebaseAuth } from "./firestoreService";

const googleProvider = new GoogleAuthProvider();

/**
 * Every visitor already has a silent Firebase Anonymous Auth identity (see
 * ensureFirebaseAuth). Signing in with Google upgrades that same uid via
 * linkWithPopup rather than creating a new one, so documents saved before
 * sign-in stay owned by the same account afterward.
 *
 * If this Google account already has its own (different) Firebase identity
 * from signing in elsewhere, linking fails with `auth/credential-already-in-use`
 * — we fall back to signing into that existing identity instead. Anything
 * saved under the anonymous id in *this* browser is not migrated in that case.
 */
export async function signInWithGoogle(): Promise<User> {
  const auth = getFirebaseAuth();
  await ensureFirebaseAuth();
  const current = auth.currentUser;

  if (current?.isAnonymous) {
    try {
      const result = await linkWithPopup(current, googleProvider);
      return result.user;
    } catch (err) {
      if (err instanceof Error && "code" in err && (err as { code: string }).code === "auth/credential-already-in-use") {
        const result = await signInWithPopup(auth, googleProvider);
        return result.user;
      }
      throw err;
    }
  }

  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutUser(): Promise<void> {
  await signOut(getFirebaseAuth());
}

/** Live Firebase auth state, always resolved (anonymous at minimum — see ensureFirebaseAuth). */
export function useAuthUser(): User | null {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    ensureFirebaseAuth().catch(() => {});
    return onAuthStateChanged(getFirebaseAuth(), setUser);
  }, []);

  return user;
}
