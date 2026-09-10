"use client";

import { useEffect, useState } from "react";
import { Link as LinkIcon } from "lucide-react";
import type { User } from "firebase/auth";
import { getPuterIdentity, linkPuterAccount } from "@/lib/puter";
import { getPuterLink, savePuterLink } from "@/lib/userProfile";
import { track } from "@/lib/analytics";

interface PuterLinkButtonProps {
  user: User;
  onLinked?: (username: string) => void;
  onError?: (message: string) => void;
}

/**
 * Puter.js sign-in always needs a real popup click (browsers block popups
 * that aren't triggered by a user gesture, so it can never fire silently on
 * load) — but a *previously* linked account can at least be remembered per
 * Firebase user (lib/userProfile.ts), so returning users get a pre-filled
 * one-click "Continue with Puter" instead of a cold link flow. If Puter.js
 * already has a live session in this browser, that's used with no click at all.
 */
export function PuterLinkButton({ user, onLinked, onError }: PuterLinkButtonProps) {
  const [liveUsername, setLiveUsername] = useState<string | null>(null);
  const [rememberedUsername, setRememberedUsername] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    getPuterIdentity().then((identity) => setLiveUsername(identity?.username ?? null));
    getPuterLink(user.uid).then((link) => setRememberedUsername(link?.puterUsername ?? null));
  }, [user.uid]);

  async function handleClick() {
    setLinking(true);
    try {
      const identity = await linkPuterAccount();
      if (!identity) {
        onError?.("Unable to link Puter account.");
        return;
      }
      setLiveUsername(identity.username);
      await savePuterLink(user.uid, { puterUserId: identity.uuid, puterUsername: identity.username });
      track("link_puter_account");
      onLinked?.(identity.username);
    } catch (err) {
      console.error("Puter link failed:", err);
      onError?.("Unable to link Puter account.");
    } finally {
      setLinking(false);
    }
  }

  const label = liveUsername
    ? `Linked as @${liveUsername}`
    : linking
      ? "Connecting…"
      : rememberedUsername
        ? `Continue with Puter (@${rememberedUsername})`
        : "Link Puter account";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={linking || !!liveUsername}
      className="flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2 text-xs font-semibold text-ink-soft shadow-sm transition-colors hover:border-accent/40 hover:text-accent disabled:cursor-default disabled:hover:border-line disabled:hover:text-ink-soft"
    >
      <LinkIcon className="h-3.5 w-3.5" strokeWidth={2} />
      {label}
    </button>
  );
}
