"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogIn, LogOut, Sparkles } from "lucide-react";
import { signOutUser, useAuthUser } from "@/lib/authService";
import { useBillingConfig, useSubscription } from "@/lib/billing";
import { touchProfile } from "@/lib/profileService";
import { AuthModal } from "./AuthModal";
import { PuterLinkButton } from "./PuterLinkButton";
import { UpgradeModal } from "./UpgradeModal";

interface AccountMenuProps {
  onToast: (message: string) => void;
  /** "start": on phones the menu opens from the chip's left edge (use when the chip sits at the left of the screen). */
  menuAlign?: "end" | "start";
}

export function AccountMenu({ onToast, menuAlign = "end" }: AccountMenuProps) {
  const user = useAuthUser();

  // Keep this user's admin-panel profile row (email, last seen) fresh: once per session.
  useEffect(() => {
    if (user) touchProfile(user);
  }, [user]);
  const [authOpen, setAuthOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const billing = useBillingConfig();
  const sub = useSubscription();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

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
      <>
        <button
          type="button"
          data-onboarding="account-menu"
          onClick={() => setAuthOpen(true)}
          className="flex items-center gap-1.5 ui-primary px-4 py-2.5 text-[13px] max-md:min-h-11 font-semibold"
        >
          <LogIn className="h-3.5 w-3.5" strokeWidth={2.5} />
          Sign in
        </button>
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onToast={onToast} />
      </>
    );
  }

  return (
    <div ref={menuRef} data-onboarding="account-menu" className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        className="flex items-center gap-2 ui-chip py-1 pl-1 pr-3"
      >
        {user.photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element -- a 24px Google avatar from an external host; next/image would add nothing
          <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="h-6 w-6 rounded-full" />
        ) : (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-soft text-[10px] font-bold text-accent-ink">
            {(user.displayName || user.email || "?").charAt(0).toUpperCase()}
          </div>
        )}
        <span className="max-w-[120px] truncate text-xs font-semibold text-ink max-[420px]:hidden">
          {user.displayName || user.email}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-ink-soft/60" strokeWidth={2} />
      </button>

      {menuOpen && (
        <div className={`ui-menu absolute top-[calc(100%+6px)] z-20 w-60 p-2 ${menuAlign === "start" ? "left-0 sm:left-auto sm:right-0" : "right-0"}`}>
          <PuterLinkButton
            user={user}
            onLinked={(username) => onToast(`Linked Puter account @${username}.`)}
            onError={onToast}
          />

                    <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setPlanOpen(true);
            }}
            className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-ink-soft transition-colors hover:bg-accent-soft/40 hover:text-accent-ink"
          >
            <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
            {sub ? "Pro plan" : billing?.enabled ? "Upgrade to Pro" : "Redeem promo code"}
          </button>

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
      <UpgradeModal open={planOpen} onClose={() => setPlanOpen(false)} onToast={onToast} />
    </div>
  );
}
