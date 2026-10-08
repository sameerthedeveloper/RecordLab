"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Eye, EyeOff, KeyRound, Loader2, Lock, Mail, User as UserIcon } from "lucide-react";
import { Modal, modalButton } from "./Modal";
import {
  authErrorMessage,
  resetPassword,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from "@/lib/authService";

type Mode = "signin" | "signup" | "reset";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onToast: (message: string) => void;
}

const COPY: Record<Mode, { title: string; description: string; cta: string }> = {
  signin: { title: "Welcome back", description: "Sign in to sync your records.", cta: "Sign in" },
  signup: { title: "Create account", description: "Save records to the cloud, free.", cta: "Create account" },
  reset: { title: "Reset password", description: "We email you a reset link.", cta: "Send reset link" },
};

const fieldClass =
  "w-full rounded-xl border border-line bg-paper py-2.5 pl-9 pr-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-soft/50 focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/20";

export function AuthModal({ open, onClose, onToast }: AuthModalProps) {
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Fresh form every time the dialog opens.
  useEffect(() => {
    if (open) {
      setMode("signin");
      setName("");
      setEmail("");
      setPassword("");
      setShowPassword(false);
      setError("");
      setBusy(false);
    }
  }, [open]);

  function switchMode(next: Mode) {
    setMode(next);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      if (mode === "signin") {
        await signInWithEmail(email, password);
        onToast("Signed in.");
        onClose();
      } else if (mode === "signup") {
        await signUpWithEmail(email, password, name);
        onToast("Account created. Welcome!");
        onClose();
      } else {
        await resetPassword(email);
        onToast("Reset link sent. Check your inbox.");
        switchMode("signin");
      }
    } catch (err) {
      console.error("Email auth failed:", err);
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      await signInWithGoogle();
      onToast("Signed in with Google.");
      onClose();
    } catch (err) {
      console.error("Google sign-in failed:", err);
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const copy = COPY[mode];

  return (
    <Modal open={open} onClose={onClose} title={copy.title} description={copy.description} icon={KeyRound} size="sm">
      <form onSubmit={handleSubmit} className="space-y-3" noValidate={false}>
        {mode === "signup" && (
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-ink-soft">Name</span>
            <span className="relative block">
              <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft/50" />
              <input
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className={fieldClass}
              />
            </span>
          </label>
        )}

        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ink-soft">Email</span>
          <span className="relative block">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft/50" />
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

        {mode !== "reset" && (
          <label className="block">
            <span className="mb-1 flex items-center justify-between text-xs font-semibold text-ink-soft">
              Password
              {mode === "signin" && (
                <button
                  type="button"
                  onClick={() => switchMode("reset")}
                  className="font-semibold text-accent hover:text-accent-hover hover:underline"
                >
                  Forgot?
                </button>
              )}
            </span>
            <span className="relative block">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft/50" />
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
                className={`${fieldClass} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-ink-soft/60 hover:bg-ink/5 hover:text-ink"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </span>
          </label>
        )}

        {error && (
          <p role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
            <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
            {error}
          </p>
        )}

        <button type="submit" disabled={busy} className={`${modalButton.primary} flex w-full items-center justify-center gap-2 py-2.5 text-sm`}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {copy.cta}
        </button>

        {mode !== "reset" && (
          <>
            <div className="flex items-center gap-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-ink-soft/50">
              <span className="h-px flex-1 bg-line" />
              or
              <span className="h-px flex-1 bg-line" />
            </div>
            <button
              type="button"
              onClick={handleGoogle}
              disabled={busy}
              className={`${modalButton.secondary} flex w-full items-center justify-center gap-2 py-2.5 text-sm disabled:opacity-60`}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                <path fill="#4285F4" d="M22.5 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.33z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.24 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
              </svg>
              Continue with Google
            </button>
          </>
        )}

        <p className="pt-1 text-center text-xs text-ink-soft">
          {mode === "signin" && (
            <>
              New here?{" "}
              <button type="button" onClick={() => switchMode("signup")} className="font-semibold text-accent hover:underline">
                Create account
              </button>
            </>
          )}
          {mode === "signup" && (
            <>
              Have an account?{" "}
              <button type="button" onClick={() => switchMode("signin")} className="font-semibold text-accent hover:underline">
                Sign in
              </button>
            </>
          )}
          {mode === "reset" && (
            <button type="button" onClick={() => switchMode("signin")} className="font-semibold text-accent hover:underline">
              Back to sign in
            </button>
          )}
        </p>
      </form>
    </Modal>
  );
}
