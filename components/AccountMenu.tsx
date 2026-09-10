"use client";

import { useState } from "react";
import { LogIn, LogOut } from "lucide-react";
import { signInWithGoogle, signOutUser, useAuthUser } from "@/lib/authService";
import { PuterLinkButton } from "./PuterLinkButton";

interface AccountMenuProps {
  onToast: (message: string) => void;
}

export function AccountMenu({ onToast }: AccountMenuProps) {
  const user = useAuthUser();
  const [signingIn, setSigningIn] = useState(false);

  async function handleSignIn() {
    setSigningIn(true);
    try {
      await signInWithGoogle();
      onToast("Signed in with Google.");
    } catch (err) {
      console.error("Google sign-in failed:", err);
      onToast("Unable to sign in with Google.");
    } finally {
      setSigningIn(false);
    }
  }

  async function handleSignOut() {
    try {
      await signOutUser();
      onToast("Signed out.");
    } catch (err) {
      console.error("Sign out failed:", err);
      onToast("Unable to sign out.");
    }
  }

  if (!user) return null;

  if (user.isAnonymous) {
    return (
      <button
        type="button"
        onClick={handleSignIn}
        disabled={signingIn}
        className="flex items-center gap-1.5 rounded-xl bg-accent px-3 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-accent-hover disabled:opacity-60"
      >
        <LogIn className="h-3.5 w-3.5" strokeWidth={2.5} />
        {signingIn ? "Signing in…" : "Sign in with Google"}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <PuterLinkButton user={user} onLinked={(username) => onToast(`Linked Puter account @${username}.`)} onError={onToast} />

      <div className="flex items-center gap-2 rounded-xl border border-line bg-white py-1 pl-1 pr-2 shadow-sm">
        {user.photoURL ? (
          <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="h-6 w-6 rounded-full" />
        ) : (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-soft text-[10px] font-bold text-accent-ink">
            {(user.displayName || user.email || "?").charAt(0).toUpperCase()}
          </div>
        )}
        <span className="max-w-[120px] truncate text-xs font-semibold text-ink">
          {user.displayName || user.email}
        </span>
        <button
          type="button"
          title="Sign out"
          aria-label="Sign out"
          onClick={handleSignOut}
          className="flex items-center justify-center text-ink-soft/60 transition-colors hover:text-accent"
        >
          <LogOut className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
