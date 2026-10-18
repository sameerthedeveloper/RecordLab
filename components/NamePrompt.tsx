"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { UserRound } from "lucide-react";
import { authErrorMessage, updateDisplayName, useAuthUser } from "@/lib/authService";
import { Modal, modalButton } from "./Modal";

const SKIP_KEY = "recordlab.name-prompt-skipped";
/** Pages where a signed-in person is not asked: the marketing page and the password reset. */
const QUIET = new Set(["/", "/reset-password"]);

/**
 * Asks anyone who is signed in but has no name for one, so they are a named person (in their account and in
 * the admin dashboard) rather than a bare email address. "Not now" hides it for the rest of the session.
 */
export function NamePrompt() {
  const user = useAuthUser();
  const pathname = usePathname().replace(/\/+$/, "") || "/";
  const [name, setName] = useState("");
  const [skipped, setSkipped] = useState(true);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      setSkipped(!!user && sessionStorage.getItem(SKIP_KEY) === user.uid);
    } catch {
      setSkipped(false);
    }
  }, [user]);

  const needsName = !!user && !user.displayName?.trim() && !saved;
  const open = needsName && !skipped && !QUIET.has(pathname) && !pathname.startsWith("/admin");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const value = name.trim().replace(/\s+/g, " ");
    if (value.length < 2) return setError("Enter your name (at least 2 letters).");
    setBusy(true);
    setError("");
    try {
      await updateDisplayName(value);
      setSaved(true);
    } catch (err) {
      setError(authErrorMessage(err) || "Couldn't save your name. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function later() {
    try {
      if (user) sessionStorage.setItem(SKIP_KEY, user.uid);
    } catch {}
    setSkipped(true);
  }

  return (
    <Modal
      open={open}
      onClose={later}
      title="What should we call you?"
      description={user?.email ? `You're signed in as ${user.email}.` : "Add your name to your account."}
      icon={UserRound}
      size="sm"
      footer={
        <>
          <button type="button" onClick={later} className={modalButton.secondary}>
            Not now
          </button>
          <button type="submit" form="name-prompt-form" disabled={busy || name.trim().length < 2} className={`${modalButton.primary} disabled:opacity-50`}>
            {busy ? "Saving…" : "Save name"}
          </button>
        </>
      }
    >
      <form id="name-prompt-form" onSubmit={save} className="space-y-2">
        <label htmlFor="namePromptInput" className="block text-xs font-semibold text-ink-soft">
          Your full name
        </label>
        <input
          id="namePromptInput"
          autoFocus
          autoComplete="name"
          maxLength={60}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError("");
          }}
          placeholder="e.g. Asha Raman"
          className="w-full rounded-xl border border-line bg-white p-3 text-sm text-ink outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/15"
        />
        {error ? <p role="alert" className="text-xs font-medium text-red-700">{error}</p> : <p className="text-xs text-ink-soft/80">Shown on your account and in messages from Record Lab. You can change it later in Settings.</p>}
      </form>
    </Modal>
  );
}
