"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, UserCheck } from "lucide-react";

/** /join: type the class code your faculty gave you; it continues at /join/<code>. */
export function JoinCodeForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const clean = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

  return (
    <div className="app-canvas fixed inset-0 overflow-y-auto">
      <div className="mx-auto flex min-h-full max-w-md items-center px-4 py-10">
        <form
          className="ui-card w-full space-y-4 p-6 sm:p-8"
          onSubmit={(e) => {
            e.preventDefault();
            if (clean.length >= 4) router.push(`/join/${clean}`);
          }}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent-ink">
            <UserCheck className="h-5 w-5" strokeWidth={2} />
          </span>
          <div>
            <h1 className="font-serif text-2xl font-bold text-ink">Join a class</h1>
            <p className="mt-1 text-sm text-ink-soft">Enter the class code your faculty gave you to hand in a subject for checking.</p>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-ink-soft">Class code</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={10}
              autoFocus
              autoComplete="off"
              spellCheck={false}
              placeholder="K7M2QX"
              className="w-full rounded-xl border border-line bg-white px-3 py-2.5 font-mono text-base uppercase tracking-[0.2em] text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
            />
          </label>
          <div className="flex items-center justify-between gap-3">
            <button type="submit" disabled={clean.length < 4} className="ui-primary px-6 py-2.5 text-sm font-semibold disabled:opacity-50">
              Continue
            </button>
            <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-accent">
              <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.5} /> My files
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
