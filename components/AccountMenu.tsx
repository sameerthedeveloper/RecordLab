"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogIn, LogOut } from "lucide-react";
import { signInWithGoogle, signOutUser, useAuthUser } from "@/lib/authService";
import { PuterLinkButton } from "./PuterLinkButton";

interface AccountMenuProps {
  onToast: (message: string) => void;
}

export function AccountMenu({ onToast }: AccountMenuProps) {
  const user = useAuthUser();
  const [signingIn, setSigningIn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

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
    setMenuOpen(false);
    try {
      await signOutUser();
      onToast("Signed out.");
    } catch (err) {
      console.error("Sign out failed:", err);
      onToast("Unable to sign out.");
    }
  }

  if (!user) {
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
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        className="flex items-center gap-2 rounded-xl border border-line bg-white py-1 pl-1 pr-2 shadow-sm transition-colors hover:border-accent/40"
      >
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
        <ChevronDown className="h-3.5 w-3.5 text-ink-soft/60" strokeWidth={2} />
      </button>

      {menuOpen && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-20 w-60 rounded-xl border border-line bg-white p-2 shadow-lg">
          <PuterLinkButton
            user={user}
            onLinked={(username) => onToast(`Linked Puter account @${username}.`)}
            onError={onToast}
          />

          <button
            type="button"
            onClick={handleSignOut}
            className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-ink-soft transition-colors hover:bg-accent-soft/40 hover:text-accent-ink"
          >
            <LogOut className="h-3.5 w-3.5" strokeWidth={2} />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
