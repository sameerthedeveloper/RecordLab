"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, RotateCcw, ShieldCheck, Trash2 } from "lucide-react";
import type { User } from "firebase/auth";
import { authErrorMessage, hasPasswordSignIn } from "@/lib/authService";
import { deleteAccount, resetAccount, verifyOwner } from "@/lib/accountReset";

type Action = "reset" | "delete";

const COPY: Record<Action, { title: string; blurb: string; goes: string; word: string; button: string; done: string }> = {
  reset: {
    title: "Reset account",
    blurb: "Start over with an empty account. You stay signed in.",
    goes: "All your records, subjects, share links, hand-ins to faculty and saved settings are deleted, here and in the cloud.",
    word: "RESET",
    button: "Reset my account",
    done: "Account reset. Starting fresh.",
  },
  delete: {
    title: "Delete account",
    blurb: "Remove your account and everything in it for good.",
    goes: "Everything in a reset, plus your profile and your sign-in. You can't sign in again with this account, and nobody can bring it back.",
    word: "DELETE",
    button: "Delete my account forever",
    done: "Account deleted.",
  },
};

const field =
  "w-full rounded-xl border border-line bg-white p-2.5 text-sm text-ink outline-none transition-all focus:border-red-400 focus:ring-2 focus:ring-red-200";
const secondary =
  "rounded-xl border border-line bg-white px-4 py-2 text-xs font-semibold text-ink-soft transition-colors hover:border-accent/40 hover:text-accent disabled:opacity-50";

/**
 * Reset and delete, each behind two checks on this same screen: 1) prove it's you (password, or Google again),
 * 2) type the action's word. Nothing is touched until both are done.
 */
export function AccountDanger({ user, onToast }: { user: User; onToast: (message: string) => void }) {
  const [action, setAction] = useState<Action | null>(null);
  const [verified, setVerified] = useState(false);
  const [password, setPassword] = useState("");
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const usesPassword = hasPasswordSignIn(user);

  function open(a: Action) {
    setAction(a);
    setVerified(false);
    setPassword("");
    setTyped("");
    setError("");
  }

  async function verify() {
    setBusy(true);
    setError("");
    try {
      await verifyOwner(user, password); // no await before this: the Google popup must open inside the click
      setVerified(true);
    } catch (e) {
      const code = (e as { code?: string })?.code;
      setError(code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/missing-password" ? "That password is wrong." : authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function run() {
    if (!action) return;
    setBusy(true);
    setError("");
    try {
      if (action === "reset") await resetAccount(user);
      else await deleteAccount(user);
      onToast(COPY[action].done);
      window.setTimeout(() => window.location.assign(action === "delete" ? "/" : "/editor"), 600);
    } catch (e) {
      console.error(`${action} account failed:`, e);
      setError(/permission/i.test(String((e as Error)?.message)) ? "Firestore refused this. The latest firestore.rules aren't deployed yet." : "Something went wrong and your account may be partly cleared. Sign in again and retry.");
      setBusy(false);
    }
  }

  const c = action ? COPY[action] : null;
  const typedOk = !!c && typed.trim().toUpperCase() === c.word;

  return (
    <section>
      <h3 className="mb-3 font-serif text-sm font-bold text-red-700">Danger zone</h3>
      <div className="divide-y divide-red-100 overflow-hidden rounded-2xl border border-red-200 bg-white">
        {(["reset", "delete"] as Action[]).map((a) => (
          <div key={a} className="flex flex-wrap items-center gap-3 px-4 py-3.5">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">{COPY[a].title}</p>
              <p className="text-xs text-ink-soft">{COPY[a].blurb}</p>
            </div>
            <button
              type="button"
              onClick={() => (action === a ? setAction(null) : open(a))}
              aria-expanded={action === a}
              className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-4 py-2 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50"
            >
              {a === "reset" ? <RotateCcw className="h-3.5 w-3.5" strokeWidth={2.25} /> : <Trash2 className="h-3.5 w-3.5" strokeWidth={2.25} />}
              {action === a ? "Cancel" : COPY[a].title}
            </button>
          </div>
        ))}
      </div>

      {c && (
        <div role="alertdialog" aria-label={c.title} className="mt-3 space-y-4 rounded-2xl border border-red-200 bg-red-50/60 p-4">
          <p className="flex items-start gap-2 text-sm font-semibold text-red-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.2} />
            {c.goes}
          </p>

          <ol className="space-y-4">
            <li className={verified ? "opacity-60" : ""}>
              <p className="mb-2 flex items-center gap-2 text-xs font-bold text-ink">
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] text-white ${verified ? "bg-emerald-600" : "bg-ink"}`}>{verified ? <ShieldCheck className="h-3 w-3" /> : 1}</span>
                {verified ? "It's you" : "Check it's you"}
              </p>
              {!verified && (
                <div className="flex flex-wrap items-end gap-2 pl-7">
                  {usesPassword && (
                    <label className="min-w-0 flex-1">
                      <span className="mb-1 block text-xs font-semibold text-ink-soft">Your password</span>
                      <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && password && void verify()} className={field} />
                    </label>
                  )}
                  <button type="button" disabled={busy || (usesPassword && !password)} onClick={() => void verify()} className={`${secondary} flex min-h-10 items-center gap-1.5`}>
                    {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {usesPassword ? "Check password" : "Sign in with Google again"}
                  </button>
                </div>
              )}
            </li>

            <li className={verified ? "" : "pointer-events-none opacity-40"}>
              <p className="mb-2 flex items-center gap-2 text-xs font-bold text-ink">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ink text-[11px] text-white">2</span>
                Type {c.word} to confirm
              </p>
              <div className="flex flex-wrap items-end gap-2 pl-7">
                <label className="min-w-0 flex-1">
                  <span className="sr-only">Type {c.word}</span>
                  <input value={typed} onChange={(e) => setTyped(e.target.value)} disabled={!verified} autoComplete="off" spellCheck={false} placeholder={c.word} className={`${field} font-mono tracking-widest`} />
                </label>
                <button
                  type="button"
                  disabled={!verified || !typedOk || busy}
                  onClick={() => void run()}
                  className="flex min-h-10 items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-red-700 disabled:opacity-40"
                >
                  {busy && verified ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" strokeWidth={2.25} />}
                  {c.button}
                </button>
              </div>
            </li>
          </ol>

          {error && (
            <p role="alert" className="rounded-xl bg-white px-3 py-2 text-xs font-medium text-red-700">
              {error}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
