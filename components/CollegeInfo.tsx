"use client";

import { useEffect, useState } from "react";
import { GraduationCap, Loader2 } from "lucide-react";
import { useAuthUser } from "@/lib/authService";
import { emailDomain, findCollege, isEducationalDomain, isPersonalDomain, saveCollege, type College } from "@/lib/college";

/** Account tab: the college behind the signed-in email's domain (e.g. name@psgtech.ac.in). */
export function CollegeInfo() {
  const user = useAuthUser();
  const email = user?.email ?? null;
  const [college, setCollege] = useState<College | null>(null);
  const [loading, setLoading] = useState(false);
  const [typed, setTyped] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const domain = emailDomain(email);
  const personal = domain ? isPersonalDomain(domain) : false;
  const notCollege = domain ? !isEducationalDomain(domain) : false;

  useEffect(() => {
    setCollege(null);
    if (!email || personal) return;
    let live = true;
    setLoading(true);
    findCollege(email)
      .then((c) => live && setCollege(c))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [email, personal]);

  if (!user || !domain) return null;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !user || saving) return;
    setSaving(true);
    setError("");
    try {
      setCollege(await saveCollege(email, user.uid, typed));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save the college.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <h3 className="mb-3 font-serif text-sm font-bold text-ink">College</h3>
      <div className="flex items-start gap-3.5 rounded-2xl border border-line bg-white p-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-ink">
          <GraduationCap className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          {loading ? (
            <p className="flex items-center gap-2 text-sm text-ink-soft">
              <Loader2 className="h-4 w-4 animate-spin text-accent" /> Finding your college…
            </p>
          ) : (personal || (notCollege && !college)) ? (
            <>
              <p className="text-sm font-semibold text-ink">No college email</p>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-soft/80">
                <span className="font-mono">@{domain}</span> isn&apos;t a college email. Sign in with your college address (like name@college.edu or name@college.ac.in) to see or add your college.
              </p>
            </>
          ) : college ? (
            <>
              <p className="text-sm font-semibold text-ink">{college.name}</p>
              <p className="mt-0.5 text-xs text-ink-soft/80">
                <span className="font-mono">@{college.domain}</span>
                {college.country ? ` · ${college.country}` : ""}
              </p>
              {college.source === "community" && <p className="mt-1 text-[11px] text-ink-soft/60">Added by a student from your college.</p>}
            </>
          ) : (
            <form onSubmit={save}>
              <p className="text-sm font-semibold text-ink">We don&apos;t know this college yet</p>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-soft/80">
                Enter its name once. Every student who signs in with <span className="font-mono">@{domain}</span> will see it.
              </p>
              <div className="mt-2.5 flex gap-2">
                <input
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  maxLength={120}
                  aria-label="College name"
                  placeholder="e.g. PSG College of Technology"
                  className="min-w-0 flex-1 rounded-xl border border-line bg-white p-2.5 text-sm text-ink outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/15"
                />
                <button type="submit" disabled={saving || typed.trim().length < 3} className="shrink-0 rounded-xl bg-accent px-4 text-xs font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50">
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
              {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
