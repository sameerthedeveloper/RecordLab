"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BarChart3, Building2, FileText, ShieldCheck, ShieldPlus, Users, type LucideIcon } from "lucide-react";
import { collection, getCountFromServer, query, Timestamp, where } from "firebase/firestore";
import { getDb } from "@/lib/firebaseConfig";
import { useAuthUser } from "@/lib/authService";
import { QuickMail } from "./QuickMail";

interface Counts {
  users: number;
  records: number;
  active: number;
}

/** Three cheap server-side counts (no documents are downloaded). A failure just hides the strip. */
async function loadCounts(): Promise<Counts> {
  const db = getDb();
  const week = Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const [users, records, active] = await Promise.all([
    getCountFromServer(collection(db, "profiles")),
    getCountFromServer(collection(db, "documents")),
    getCountFromServer(query(collection(db, "profiles"), where("lastSeenAt", ">=", week))),
  ]);
  return { users: users.data().count, records: records.data().count, active: active.data().count };
}

const LINKS: { href: string; label: string; hint: string; icon: LucideIcon }[] = [
  { href: "/admin/users", label: "Users", hint: "Who signed up and was seen lately", icon: Users },
  { href: "/admin/records", label: "Records", hint: "Read what people made", icon: FileText },
  { href: "/admin/colleges", label: "Colleges", hint: "Names students entered", icon: Building2 },
  { href: "/admin/admins", label: "Admins", hint: "Add or hand over access", icon: ShieldPlus },
];

/** Settings → Admin: only admins ever see this tab. The real protection is the Firestore rules. */
export function AdminSettings({ onNavigate }: { onNavigate: () => void }) {
  const [counts, setCounts] = useState<Counts | null>(null);
  const email = useAuthUser()?.email ?? null;

  useEffect(() => {
    let live = true;
    loadCounts().then((c) => live && setCounts(c), () => {});
    return () => {
      live = false;
    };
  }, []);

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 rounded-2xl bg-accent-soft p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-accent-ink">
            <ShieldCheck className="h-5 w-5" strokeWidth={2} />
          </span>
          <div>
            <h3 className="font-serif text-base font-bold text-ink">You are an admin</h3>
            <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">See how Record Lab is used, read records, and email students from one place.</p>
          </div>
        </div>
        <Link
          href="/admin"
          onClick={onNavigate}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <BarChart3 className="h-4 w-4" strokeWidth={2.25} />
          Open admin panel
        </Link>
      </section>

      {counts && (
        <dl className="grid grid-cols-3 divide-x divide-line rounded-2xl border border-line text-center">
          {[
            ["Users", counts.users],
            ["Active this week", counts.active],
            ["Records", counts.records],
          ].map(([label, n]) => (
            <div key={label} className="px-2 py-3">
              <dd className="font-serif text-xl font-bold tabular-nums text-ink">{Number(n).toLocaleString()}</dd>
              <dt className="mt-0.5 text-[11px] text-ink-soft">{label}</dt>
            </div>
          ))}
        </dl>
      )}

      <QuickMail adminEmail={email} onNavigate={onNavigate} />

      <section>
        <h3 className="mb-3 font-serif text-sm font-bold text-ink">Jump to</h3>
        <ul className="grid gap-2 sm:grid-cols-2">
          {LINKS.map(({ href, label, hint, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                onClick={onNavigate}
                className="flex items-center gap-3 rounded-xl border border-line p-3 transition-colors hover:border-accent/50 hover:bg-accent-soft/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
              >
                <Icon className="h-4 w-4 shrink-0 text-accent" strokeWidth={2} />
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold text-ink">{label}</span>
                  <span className="block truncate text-xs text-ink-soft">{hint}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
