"use client";

import { useState } from "react";
import { AlertCircle, Check, KeyRound, Loader2, LogIn, LogOut, Mail, User as UserIcon } from "lucide-react";
import {
  authErrorMessage,
  changePassword,
  hasPasswordSignIn,
  resetPassword,
  signOutUser,
  updateDisplayName,
  useAuthUser,
} from "@/lib/authService";
import { AuthModal } from "./AuthModal";
import { PuterLinkButton } from "./PuterLinkButton";

interface AccountSettingsProps {
  onToast: (message: string) => void;
}

const field =
  "w-full rounded-xl border border-line bg-white p-2.5 text-sm text-ink outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/15";
const label = "mb-1 block text-xs font-semibold text-ink-soft";
const heading = "mb-3 font-serif text-sm font-bold text-ink";
const secondary =
  "rounded-xl border border-line bg-white px-4 py-2 text-xs font-semibold text-ink-soft transition-colors hover:border-accent/40 hover:text-accent disabled:opacity-50";
const primary =
  "rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-accent-hover disabled:opacity-50";

/** The Account tab of Settings: profile, display name, password, Puter link and sign out. */
export function AccountSettings({ onToast }: AccountSettingsProps) {
  const user = useAuthUser();
  const [authOpen, setAuthOpen] = useState(false);
  const [name, setName] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);
  const [, bump] = useState(0);

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState("");
  const [resetBusy, setResetBusy] = useState(false);

  if (!user) {
    return (
      <section className="flex flex-col items-center gap-3 py-10 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent-ink">
          <UserIcon className="h-6 w-6" strokeWidth={1.75} />
        </span>
        <p className="font-serif text-lg font-bold text-ink">You&apos;re not signed in</p>
        <p className="max-w-xs text-sm text-ink-soft/80">
          Sign in to save records to the cloud, keep them in subject folders and carry your settings to every device.
        </p>
        <button type="button" onClick={() => setAuthOpen(true)} className={`${primary} mt-1 flex items-center gap-1.5 px-5 py-2.5`}>
          <LogIn className="h-3.5 w-3.5" strokeWidth={2.5} />
          Sign in or create account
        </button>
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onToast={onToast} />
      </section>
    );
  }

  const displayName = user.displayName ?? "";
  const nameValue = name ?? displayName;
  const nameChanged = nameValue.trim() !== displayName.trim();
  const canUsePassword = hasPasswordSignIn(user);
  const providers = user.providerData.map((p) => (p.providerId === "google.com" ? "Google" : p.providerId === "password" ? "Email & password" : p.providerId));
  const since = user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : null;
  const initial = (displayName || user.email || "?").charAt(0).toUpperCase();

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    if (!nameChanged || savingName) return;
    setSavingName(true);
    try {
      await updateDisplayName(nameValue);
      setName(null);
      bump((n) => n + 1);
      onToast("Name updated.");
    } catch (err) {
      console.error("Name update failed:", err);
      onToast(authErrorMessage(err) || "Unable to update your name.");
    } finally {
      setSavingName(false);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pwBusy) return;
    setPwError("");
    if (next !== confirm) return setPwError("The new passwords don't match.");
    setPwBusy(true);
    try {
      await changePassword(current, next);
      setCurrent("");
      setNext("");
      setConfirm("");
      onToast("Password changed.");
    } catch (err) {
      console.error("Password change failed:", err);
      const code = (err as { code?: string })?.code;
      setPwError(
        code === "auth/invalid-credential" || code === "auth/wrong-password" ? "Your current password is wrong." : authErrorMessage(err)
      );
    } finally {
      setPwBusy(false);
    }
  }

  async function emailLink() {
    if (!user?.email || resetBusy) return;
    setResetBusy(true);
    try {
      await resetPassword(user.email);
      onToast(`Link sent to ${user.email}.`);
    } catch (err) {
      onToast(authErrorMessage(err) || "Unable to send the link.");
    } finally {
      setResetBusy(false);
    }
  }

  async function handleSignOut() {
    try {
      await signOutUser();
      onToast("Signed out.");
    } catch {
      onToast("Unable to sign out.");
    }
  }

  return (
    <div className="space-y-6 [&>section+section]:border-t [&>section+section]:border-line [&>section+section]:pt-6">
      <section className="flex items-center gap-4">
        {user.photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="h-14 w-14 rounded-full" />
        ) : (
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent-soft font-serif text-xl font-bold text-accent-ink">{initial}</span>
        )}
        <div className="min-w-0">
          <p className="truncate font-serif text-lg font-bold text-ink">{displayName || "Your account"}</p>
          <p className="truncate text-sm text-ink-soft">{user.email}</p>
          <p className="mt-1 text-[11px] text-ink-soft/70">
            {providers.join(" · ")}
            {since ? ` · member since ${since}` : ""}
          </p>
        </div>
      </section>

      <section>
        <h3 className={heading}>Display name</h3>
        <form onSubmit={saveName} className="flex gap-2">
          <label className="min-w-0 flex-1">
            <span className="sr-only">Display name</span>
            <input value={nameValue} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Your name" className={field} />
          </label>
          <button type="submit" disabled={!nameChanged || savingName} className={`${primary} flex items-center gap-1.5`}>
            {savingName ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" strokeWidth={2.5} />}
            Save
          </button>
        </form>
      </section>

      <section>
        <h3 className={heading}>Password</h3>
        {canUsePassword ? (
          <form onSubmit={savePassword} className="space-y-3">
            <label className="block">
              <span className={label}>Current password</span>
              <input type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} className={field} />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className={label}>New password</span>
                <input type="password" autoComplete="new-password" required minLength={6} value={next} onChange={(e) => setNext(e.target.value)} placeholder="At least 6 characters" className={field} />
              </label>
              <label className="block">
                <span className={label}>Confirm new password</span>
                <input type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} className={field} />
              </label>
            </div>
            {pwError && (
              <p role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
                {pwError}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <button type="submit" disabled={pwBusy || !current || next.length < 6} className={`${primary} flex items-center gap-1.5`}>
                {pwBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" strokeWidth={2.25} />}
                Change password
              </button>
              <button type="button" onClick={emailLink} disabled={resetBusy} className={`${secondary} flex items-center gap-1.5`}>
                <Mail className="h-3.5 w-3.5" strokeWidth={2.25} />
                Email me a reset link
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-2.5">
            <p className="text-sm text-ink-soft">
              You sign in with Google. Want to also sign in with an email and password? We&apos;ll email you a link to set one.
            </p>
            <button type="button" onClick={emailLink} disabled={resetBusy} className={`${secondary} flex items-center gap-1.5`}>
              <Mail className="h-3.5 w-3.5" strokeWidth={2.25} />
              Email me a link to set a password
            </button>
          </div>
        )}
      </section>

      <section>
        <h3 className={heading}>Puter account</h3>
        <p className="mb-2.5 text-sm text-ink-soft">Used for the Direct LLM option in the AI assistant.</p>
        <PuterLinkButton user={user} onLinked={(username) => onToast(`Linked Puter account @${username}.`)} onError={onToast} />
      </section>

      <section>
        <button type="button" onClick={handleSignOut} className={`${secondary} flex items-center gap-1.5 hover:!border-red-200 hover:!bg-red-50 hover:!text-red-600`}>
          <LogOut className="h-3.5 w-3.5" strokeWidth={2.25} />
          Sign out
        </button>
      </section>
    </div>
  );
}
