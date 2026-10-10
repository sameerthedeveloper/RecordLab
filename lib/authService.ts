"use client";

import { useEffect, useState } from "react";
import {
  confirmPasswordReset,
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updatePassword,
  updateProfile,
  verifyPasswordResetCode,
  type User,
} from "firebase/auth";
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

export async function signInWithEmail(email: string, password: string): Promise<User> {
  const result = await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
  return result.user;
}

export async function signUpWithEmail(email: string, password: string, name?: string): Promise<User> {
  const result = await createUserWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
  if (name?.trim()) await updateProfile(result.user, { displayName: name.trim() });
  return result.user;
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(getFirebaseAuth(), email.trim());
}

/** Checks a reset link's code; resolves to the account email, rejects if expired/used. */
export function verifyResetCode(oobCode: string): Promise<string> {
  return verifyPasswordResetCode(getFirebaseAuth(), oobCode);
}

export async function confirmReset(oobCode: string, newPassword: string): Promise<void> {
  await confirmPasswordReset(getFirebaseAuth(), oobCode, newPassword);
}

/** True when the account can sign in with an email + password (not only Google). */
export function hasPasswordSignIn(user: User): boolean {
  return user.providerData.some((p) => p.providerId === "password");
}

export async function updateDisplayName(name: string): Promise<void> {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error("Sign in first.");
  await updateProfile(user, { displayName: name.trim() });
}

/** Re-checks the current password first (Firebase requires a recent sign-in for this), then sets the new one. */
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const user = getFirebaseAuth().currentUser;
  if (!user?.email) throw new Error("Sign in first.");
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, currentPassword));
  await updatePassword(user, newPassword);
}

/** Firebase error code -> message a human can act on. */
export function authErrorMessage(err: unknown): string {
  const code = (err as { code?: string })?.code ?? "";
  switch (code) {
    case "auth/invalid-email":
      return "That email address looks invalid.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Wrong email or password.";
    case "auth/email-already-in-use":
      return "An account with this email already exists. Sign in instead.";
    case "auth/expired-action-code":
    case "auth/invalid-action-code":
      return "This reset link is invalid or already used.";
    case "auth/requires-recent-login":
      return "For security, sign out and back in, then try again.";
    case "auth/weak-password":
      return "Password too weak. Use at least 6 characters.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a bit and retry.";
    case "auth/network-request-failed":
      return "Network error. Check your connection.";
    case "auth/operation-not-allowed":
      return "Email/password sign-in is not enabled for this project.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "";
    default:
      return "Something went wrong. Try again.";
  }
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
