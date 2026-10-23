"use client";

import { createContext, useContext, useState } from "react";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { authErrorMessage, resetPassword, signInWithEmail, signInWithGoogle, signOutUser, signUpWithEmail, useAuthUser } from "@/lib/authService";
import { requestFacultyAccess, useFacultyAccess } from "@/lib/facultyService";
import { Stamp } from "./Stamp";

export interface FacultyContextValue {
  uid: string;
  name: string;
  email: string | null;
}

const Ctx = createContext<FacultyContextValue | null>(null);

export function useFaculty(): FacultyContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useFaculty must be used inside the faculty layout.");
  return v;
}

const field = "ui-input w-full";
const primary =
  "ui-primary flex min-h-11 w-full items-center justify-center gap-2 px-4 text-sm font-semibold disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

/** Two-column screen: what the desk is for on the left, the form on the right. */
function Door({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return (
    <div className="app-canvas fixed inset-0 overflow-y-auto">
      <div className="mx-auto grid min-h-full max-w-5xl items-center gap-10 px-6 py-12 md:grid-cols-[1.1fr_1fr] md:gap-16">
        <div>
          <p className="font-serif text-sm font-semibold text-accent-ink">Record Lab for faculty</p>
          <h1 className="mt-3 max-w-md font-serif text-4xl font-bold leading-[1.1] tracking-tight text-ink sm:text-5xl">{title}</h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-ink-soft">{intro}</p>
          <div className="mt-8 hidden md:block" aria-hidden>
            <Stamp status="approved" date="Sem 5 · Data Structures" />
          </div>
        </div>
        <div className="ui-card p-6 sm:p-8">{children}</div>
      </div>
    </div>
  );
}

function SignIn() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    setNote("");
    try {
      await fn();
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Door title="Check your students' records, then sign them off." intro="Students hand in a subject with your class code. You read each record and verify the subject, or send it back with a note on what to fix.">
      <h2 className="font-serif text-xl font-bold text-ink">{mode === "in" ? "Sign in" : "Create a faculty account"}</h2>
      <form
        className="mt-5 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void run(() => (mode === "in" ? signInWithEmail(email, password) : signUpWithEmail(email, password, name)));
        }}
      >
        {mode === "up" && (
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-ink-soft">Full name</span>
            <input className={field} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
          </label>
        )}
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ink-soft">College email</span>
          <input className={field} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ink-soft">Password</span>
          <input className={field} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "in" ? "current-password" : "new-password"} minLength={6} required />
        </label>
        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {error}
          </p>
        )}
        {note && (
          <p role="status" className="rounded-xl bg-accent-soft px-3 py-2 text-sm font-medium text-accent-ink">
            {note}
          </p>
        )}
        <button type="submit" disabled={busy} className={primary}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === "in" ? "Sign in" : "Create account"}
        </button>
      </form>
      <button
        type="button"
        disabled={busy}
        // No await before the popup opens: browsers only allow it inside the click.
        onClick={() => void run(() => signInWithGoogle())}
        className="ui-btn ui-btn-secondary mt-3 flex min-h-11 w-full items-center justify-center px-4 text-sm font-semibold disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        Continue with Google
      </button>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-sm">
        <button type="button" className="font-semibold text-accent hover:underline" onClick={() => { setMode(mode === "in" ? "up" : "in"); setError(""); }}>
          {mode === "in" ? "New here? Create an account" : "Have an account? Sign in"}
        </button>
        {mode === "in" && (
          <button
            type="button"
            className="text-ink-soft hover:text-accent hover:underline"
            onClick={() => {
              if (!email.trim()) return setError("Enter your email first, then choose Forgot password.");
              void run(async () => {
                await resetPassword(email);
                setNote("Check your inbox for the reset link.");
              });
            }}
          >
            Forgot password
          </button>
        )}
      </div>
      <p className="mt-6 border-t border-line pt-4 text-xs text-ink-soft">
        Student? <Link href="/editor" className="font-semibold text-accent hover:underline">Go to Record Lab</Link>
      </p>
    </Door>
  );
}

function RequestAccess({ uid, email, defaultName, pending, onSent }: { uid: string; email: string | null; defaultName: string; pending: boolean; onSent: () => void }) {
  const [name, setName] = useState(defaultName);
  const [department, setDepartment] = useState("");
  const [college, setCollege] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (pending) {
    return (
      <Door title="Your request is with an admin." intro="You can close this page. Once an admin approves you, sign in here again and your desk will be ready.">
        <p className="font-serif text-lg font-bold text-ink">Waiting for approval</p>
        <p className="mt-2 text-sm text-ink-soft">Signed in as {email}.</p>
        <button type="button" onClick={onSent} className="ui-btn ui-btn-secondary mt-5 min-h-11 w-full px-4 text-sm font-semibold">
          Check again
        </button>
        <button type="button" onClick={() => void signOutUser()} className="mt-3 w-full text-sm text-ink-soft hover:text-accent hover:underline">
          Sign out
        </button>
      </Door>
    );
  }

  return (
    <Door title="One step left: ask for faculty access." intro="Admins approve faculty so students only hand their records to real staff. Tell us where you teach.">
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await requestFacultyAccess(uid, { name, email: email ?? "", department, college });
            onSent();
          } catch (err) {
            setError(err instanceof Error && err.message.length < 60 ? err.message : "Couldn't send the request. Try again.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ink-soft">Full name</span>
          <input className={field} value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ink-soft">Department</span>
          <input className={field} value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Computer Science" required />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ink-soft">College</span>
          <input className={field} value={college} onChange={(e) => setCollege(e.target.value)} required />
        </label>
        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy} className={primary}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Request access
        </button>
      </form>
      <button type="button" onClick={() => void signOutUser()} className="mt-4 text-sm text-ink-soft hover:text-accent hover:underline">
        Sign out ({email})
      </button>
    </Door>
  );
}

/** The one door to /faculty: signed-out people get the sign-in, signed-in non-faculty get the request form. */
export function FacultyProvider({ children }: { children: React.ReactNode }) {
  const { access, recheck } = useFacultyAccess();
  const user = useAuthUser();

  if (access.status === "loading") {
    return (
      <div className="app-canvas fixed inset-0 flex items-center justify-center" role="status">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
        <span className="sr-only">Opening your desk</span>
      </div>
    );
  }
  if (access.status === "signed-out") return <SignIn />;
  if (access.status === "no-access") {
    return <RequestAccess uid={access.uid} email={access.email} defaultName={user?.displayName ?? ""} pending={!!access.request} onSent={recheck} />;
  }
  return <Ctx.Provider value={{ uid: access.uid, name: access.name, email: user?.email ?? null }}>{children}</Ctx.Provider>;
}
