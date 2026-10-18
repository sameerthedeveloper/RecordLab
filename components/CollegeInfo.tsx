"use client";

import { useEffect, useState } from "react";
import { GraduationCap, Loader2 } from "lucide-react";
import { useAuthUser } from "@/lib/authService";
import { emailDomain, findCollege, isPersonalDomain, type College } from "@/lib/college";

/** Account tab: the college behind the signed-in email's domain (e.g. name@psgtech.ac.in). */
export function CollegeInfo() {
  const user = useAuthUser();
  const email = user?.email ?? null;
  const [college, setCollege] = useState<College | null>(null);
  const [loading, setLoading] = useState(false);
  const domain = emailDomain(email);
  const personal = domain ? isPersonalDomain(domain) : false;

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
          ) : personal ? (
            <>
              <p className="text-sm font-semibold text-ink">No college email</p>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-soft/80">
                You signed in with a personal address (<span className="font-mono">@{domain}</span>). Sign in with your college email to see your college here.
              </p>
            </>
          ) : college ? (
            <>
              <p className="text-sm font-semibold text-ink">{college.name}</p>
              <p className="mt-0.5 text-xs text-ink-soft/80">
                <span className="font-mono">@{college.domain}</span>
                {college.country ? ` · ${college.country}` : ""}
              </p>
              {!college.verified && <p className="mt-1 text-[11px] text-ink-soft/60">Guessed from your email domain; this college isn&apos;t in the public list.</p>}
            </>
          ) : (
            <p className="text-xs text-ink-soft/80">Couldn&apos;t look up your college right now.</p>
          )}
        </div>
      </div>
    </section>
  );
}
