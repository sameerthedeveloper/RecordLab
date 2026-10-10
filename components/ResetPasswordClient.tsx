"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, ArrowLeft, Check, Eye, EyeOff, Loader2, Lock, Mail, MailCheck } from "lucide-react";
import { authErrorMessage, confirmReset, resetPassword, verifyResetCode } from "@/lib/authService";

type Phase = "checking" | "form" | "invalid" | "done" | "request" | "sent";

const fieldClass =
  "w-full rounded-xl border border-line bg-white/80 py-3 pl-10 pr-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-soft/50 focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/20";

const RULES: { label: string; test: (p: string) => boolean }[] = [
  { label: "6+ characters", test: (p) => p.length >= 6 },
  { label: "Upper & lower case", test: (p) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
  { label: "A number", test: (p) => /\d/.test(p) },
  { label: "A symbol or 12+ characters", test: (p) => /[^A-Za-z0-9]/.test(p) || p.length >= 12 },
];
const STRENGTH = ["Too short", "Weak", "Okay", "Good", "Strong"];

export function ResetPasswordClient() {
  const params = useSearchParams();
  const mode = params.get("mode");
  const oobCode = params.get("oobCode");

  const [phase, setPhase] = useState<Phase>("checking");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!oobCode) {
      // No code: visitor came here directly, so offer to request a link.
      setPhase(mode ? "invalid" : "request");
      return;
    }
    if (mode && mode !== "resetPassword") {
      setPhase("invalid");
      return;
    }
    let cancelled = false;
    verifyResetCode(oobCode)
      .then((addr) => {
        if (cancelled) return;
        setEmail(addr);
        setPhase("form");
      })
      .catch((err) => {
        console.error("Reset code check failed:", err);
        if (!cancelled) setPhase("invalid");
      });
    return () => {
      cancelled = true;
    };
  }, [oobCode, mode]);

  const score = RULES.filter((r) => r.test(password)).length;
  const mismatch = confirm.length > 0 && confirm !== password;
  const canSubmit = password.length >= 6 && password === confirm && !busy;

  async function submitNew(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !oobCode) return;
    setBusy(true);
    setError("");
    try {
      await confirmReset(oobCode, password);
      setPhase("done");
    } catch (err) {
      console.error("Password reset failed:", err);
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function submitRequest(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await resetPassword(email);
      setPhase("sent");
    } catch (err) {
      console.error("Reset email failed:", err);
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-paper px-4 py-10">
      {/* backdrop: soft ink wash + oversized serif mark */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full bg-accent-soft blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-24 h-[460px] w-[460px] rounded-full bg-[#dfe9e6] blur-3xl"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-[-6rem] right-[-1rem] select-none font-serif text-[22rem] font-bold leading-none text-ink/[0.035] max-sm:hidden"
      >
        RL
      </span>

      <div className="rp-card relative z-10 w-full max-w-md">
        <Link
          href="/"
          className="mb-5 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-soft transition-colors hover:text-accent"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.25} />
          Back to Record Lab
        </Link>

        <div className="rp-ruled relative overflow-hidden rounded-2xl border border-line bg-white py-8 pl-[62px] pr-6 shadow-[0_24px_60px_-24px_rgba(28,43,51,0.35)] max-sm:pl-[58px] max-sm:pr-5">
          {/* punched holes */}
          <span aria-hidden className="absolute left-3.5 top-8 h-3 w-3 rounded-full border border-line bg-paper" />
          <span aria-hidden className="absolute left-3.5 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border border-line bg-paper" />
          <span aria-hidden className="absolute bottom-8 left-3.5 h-3 w-3 rounded-full border border-line bg-paper" />

          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-accent">
            Record Lab · Account
          </p>

          {phase === "checking" && (
            <div className="flex flex-col items-start gap-3 py-12" role="status">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
              <p className="font-serif text-xl font-bold text-ink">Checking your link…</p>
            </div>
          )}

          {phase === "form" && (
            <form onSubmit={submitNew} className="mt-1 space-y-4">
              <h1 className="font-serif text-3xl font-bold leading-tight text-ink">Set a new password</h1>
              <p className="text-sm text-ink-soft">
                For <span className="break-all font-mono text-[13px] font-medium text-ink">{email}</span>
              </p>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-ink-soft">New password</span>
                <span className="relative block">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft/50" />
                  <input
                    type={show ? "text" : "password"}
                    required
                    minLength={6}
                    autoFocus
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className={`${fieldClass} pr-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    aria-label={show ? "Hide password" : "Show password"}
                    className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-ink-soft/60 hover:bg-ink/5 hover:text-ink"
                  >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </span>
              </label>

              {/* ink-fill strength meter */}
              <div aria-live="polite">
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4].map((i) => (
                    <span
                      key={i}
                      className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                        password && i <= score
                          ? score <= 1
                            ? "bg-red-500"
                            : score === 2
                              ? "bg-amber-500"
                              : "bg-emerald-600"
                          : "bg-ink/10"
                      }`}
                    />
                  ))}
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-ink-soft">{password ? STRENGTH[score] : "Pick something memorable"}</span>
                </div>
                <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
                  {RULES.map((r) => {
                    const ok = r.test(password);
                    return (
                      <li
                        key={r.label}
                        className={`flex items-center gap-1.5 text-[11px] transition-colors ${ok ? "text-emerald-700" : "text-ink-soft/70"}`}
                      >
                        <Check className={`h-3 w-3 shrink-0 ${ok ? "opacity-100" : "opacity-30"}`} strokeWidth={3} />
                        {r.label}
                      </li>
                    );
                  })}
                </ul>
              </div>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-ink-soft">Confirm password</span>
                <span className="relative block">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft/50" />
                  <input
                    type={show ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Type it once more"
                    aria-invalid={mismatch}
                    className={`${fieldClass} ${mismatch ? "!border-red-400 !ring-red-200" : ""}`}
                  />
                </span>
                {mismatch && <span className="mt-1 block text-[11px] font-medium text-red-600">Passwords do not match.</span>}
              </label>

              {error && (
                <p role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                  <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={!canSubmit}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-accent-hover active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                Save new password
              </button>
            </form>
          )}

          {phase === "done" && (
            <div className="relative mt-1 space-y-4 py-2">
              <span
                aria-hidden
                className="rp-stamp absolute -top-2 right-0 flex h-20 w-20 items-center justify-center rounded-full border-[3px] border-emerald-600/80 font-mono text-[10px] font-semibold uppercase leading-tight tracking-wider text-emerald-700/90"
              >
                <span className="text-center">
                  Pass<br />word<br />Saved
                </span>
              </span>
              <h1 className="max-w-[12ch] font-serif text-3xl font-bold leading-tight text-ink">All set.</h1>
              <p className="text-sm text-ink-soft">Your password is updated. Sign in with it anywhere.</p>
              <Link
                href="/editor"
                className="flex w-full items-center justify-center rounded-xl bg-accent py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-hover"
              >
                Continue to Record Lab
              </Link>
            </div>
          )}

          {phase === "invalid" && (
            <div className="mt-1 space-y-4 py-2">
              <h1 className="font-serif text-3xl font-bold leading-tight text-ink">Link no longer works</h1>
              <p className="text-sm text-ink-soft">
                Reset links expire after a while and work once. Request a fresh one below.
              </p>
              <button
                type="button"
                onClick={() => setPhase("request")}
                className="flex w-full items-center justify-center rounded-xl bg-accent py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-hover"
              >
                Get a new link
              </button>
            </div>
          )}

          {phase === "request" && (
            <form onSubmit={submitRequest} className="mt-1 space-y-4">
              <h1 className="font-serif text-3xl font-bold leading-tight text-ink">Forgot your password?</h1>
              <p className="text-sm text-ink-soft">Enter your email. We send a link to choose a new one.</p>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-ink-soft">Email</span>
                <span className="relative block">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft/50" />
                  <input
                    type="email"
                    required
                    autoFocus
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@college.edu"
                    className={fieldClass}
                  />
                </span>
              </label>
              {error && (
                <p role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                  <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-hover disabled:opacity-60"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                Send reset link
              </button>
            </form>
          )}

          {phase === "sent" && (
            <div className="mt-1 space-y-4 py-2">
              <MailCheck className="h-9 w-9 text-accent" strokeWidth={1.75} />
              <h1 className="font-serif text-3xl font-bold leading-tight text-ink">Check your inbox</h1>
              <p className="text-sm text-ink-soft">
                If <span className="break-all font-mono text-[13px] font-medium text-ink">{email}</span> has an
                account, a reset link is on its way. Check spam too.
              </p>
              <button
                type="button"
                onClick={() => setPhase("request")}
                className="text-xs font-semibold text-accent hover:underline"
              >
                Use a different email
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
