"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, BarChart3, Loader2, RefreshCw, Search, ShieldAlert, Users } from "lucide-react";
import { loadUsage, useAdminAccess, type UsageSnapshot } from "@/lib/adminService";
import { dayKey } from "@/lib/usageStats";
import { AuthModal } from "./AuthModal";

const LABELS: Record<string, string> = {
  save_cloud: "Saved to cloud",
  update_cloud: "Updated cloud file",
  load_cloud: "Opened cloud file",
  delete_cloud_document: "Deleted cloud file",
  export_pdf: "Exported PDF",
  export_docx: "Exported Word",
  print_record: "Printed",
  save_work_local: "Saved .rlab file",
  load_work_local: "Opened .rlab file",
  ai_assist_used: "Used AI assistant",
  save_settings: "Saved settings",
  create_subject: "Created subject folder",
  move_to_subject: "Moved file to subject",
  link_puter_account: "Linked Puter",
};

const RANGES = [7, 30, 90] as const;
const DAY = 24 * 60 * 60 * 1000;

const fmtDate = (d: Date | null) => (d ? d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—");
const ago = (d: Date | null) => {
  if (!d) return "—";
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < DAY) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 30 * DAY) return `${Math.floor(diff / DAY)}d ago`;
  return fmtDate(d);
};

function Kpi({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="ui-card p-5">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-soft/60">{label}</p>
      <p className="mt-2 font-serif text-4xl font-bold tracking-tight text-ink">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-soft/70">{hint}</p>}
    </div>
  );
}

export function AdminClient() {
  const access = useAdminAccess();
  const [range, setRange] = useState<(typeof RANGES)[number]>(30);
  const [data, setData] = useState<UsageSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [q, setQ] = useState("");
  const [shown, setShown] = useState(25);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await loadUsage(range));
    } catch (e) {
      console.error("Admin load failed:", e);
      setError("Couldn't load usage. Check that the latest firestore.rules are deployed and your admin document exists.");
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    if (access.status === "admin") void refresh();
  }, [access.status, refresh]);

  const stats = useMemo(() => {
    if (!data) return null;
    const now = Date.now();
    const profiles = data.profiles;
    const within = (d: Date | null, days: number) => d !== null && now - d.getTime() <= days * DAY;

    // Fill every day in the range, so quiet days show as empty bars.
    const byDay = new Map(data.days.map((d) => [d.day, d]));
    const series: { day: string; total: number }[] = [];
    for (let i = range - 1; i >= 0; i--) {
      const key = dayKey(new Date(now - i * DAY));
      series.push({ day: key, total: byDay.get(key)?.total ?? 0 });
    }
    const peak = Math.max(1, ...series.map((s) => s.total));

    const features: Record<string, number> = {};
    for (const d of data.days) for (const [k, n] of Object.entries(d.events)) features[k] = (features[k] ?? 0) + n;
    const featureRows = Object.entries(features).sort((a, b) => b[1] - a[1]);
    const featureMax = Math.max(1, ...featureRows.map(([, n]) => n));

    return {
      users: profiles.length,
      active7: profiles.filter((p) => within(p.lastSeenAt, 7)).length,
      active30: profiles.filter((p) => within(p.lastSeenAt, 30)).length,
      new7: profiles.filter((p) => within(p.createdAt, 7)).length,
      events: data.days.reduce((n, d) => n + d.total, 0),
      series,
      peak,
      featureRows,
      featureMax,
    };
  }, [data, range]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLowerCase();
    return data.profiles.filter((p) => !needle || [p.email, p.displayName, p.uid].some((v) => (v ?? "").toLowerCase().includes(needle)));
  }, [data, q]);

  return (
    <div className="app-canvas fixed inset-0 overflow-y-auto">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-5 sm:px-6">
        <header className="ui-panel flex flex-wrap items-end justify-between gap-4 px-5 py-4">
          <div>
            <Link href="/" className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-soft transition-colors hover:text-accent">
              <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.25} />
              Home
            </Link>
            <h1 className="font-serif text-2xl font-bold tracking-tight text-ink">Usage</h1>
            <p className="text-sm text-ink-soft">
              {data ? `Updated ${ago(data.loadedAt)}` : "Admin only"} · counts cover signed-in users
            </p>
          </div>
          {access.status === "admin" && (
            <div className="flex items-center gap-2">
              <div className="flex rounded-full bg-black/[0.05] p-1" role="group" aria-label="Range">
                {RANGES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    aria-pressed={range === r}
                    onClick={() => setRange(r)}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${range === r ? "bg-accent text-white shadow-sm" : "text-ink-soft hover:bg-ink/5"}`}
                  >
                    {r}d
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => void refresh()} disabled={loading} className="ui-icon-btn flex items-center justify-center" aria-label="Refresh" title="Refresh">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" strokeWidth={2} />}
              </button>
            </div>
          )}
        </header>

        {access.status === "loading" && (
          <div className="flex justify-center py-24" role="status">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
          </div>
        )}

        {access.status === "signed-out" && (
          <div className="ui-card mx-auto mt-10 flex max-w-md flex-col items-center gap-3 p-8 text-center">
            <ShieldAlert className="h-8 w-8 text-accent" strokeWidth={1.75} />
            <p className="font-serif text-lg font-bold text-ink">Sign in to continue</p>
            <p className="text-sm text-ink-soft">The usage panel is for Record Lab admins.</p>
            <button type="button" onClick={() => setAuthOpen(true)} className="ui-primary px-6 py-2.5 text-[13px] font-semibold">
              Sign in
            </button>
            <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onToast={() => {}} />
          </div>
        )}

        {access.status === "denied" && (
          <div className="ui-card mx-auto mt-10 max-w-lg p-8">
            <ShieldAlert className="h-8 w-8 text-red-600" strokeWidth={1.75} />
            <p className="mt-3 font-serif text-lg font-bold text-ink">No access</p>
            <p className="mt-1 text-sm text-ink-soft">
              {access.email ?? "This account"} isn&apos;t an admin. To grant access, create a document in Firestore at
              <code className="mx-1 rounded bg-black/5 px-1.5 py-0.5 font-mono text-[12px]">admins/{access.uid}</code>
              (any fields), then reload.
            </p>
          </div>
        )}

        {access.status === "admin" && (
          <div className="mt-5 space-y-5">
            {error && <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}

            {!stats && !error && (
              <div className="flex justify-center py-24" role="status">
                <Loader2 className="h-6 w-6 animate-spin text-accent" />
              </div>
            )}

            {stats && data && (
              <>
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  <Kpi label="Users" value={stats.users} hint="Signed in at least once" />
                  <Kpi label="Active · 7 days" value={stats.active7} hint={`${stats.active30} in 30 days`} />
                  <Kpi label="New · 7 days" value={stats.new7} />
                  <Kpi label={`Actions · ${range}d`} value={stats.events} hint={data.lifetime ? `${data.lifetime.total} all time` : undefined} />
                </div>

                <section className="ui-card p-5 sm:p-6">
                  <h2 className="flex items-center gap-2 font-serif text-lg font-bold text-ink">
                    <BarChart3 className="h-4 w-4 text-accent" strokeWidth={2.25} />
                    Actions per day
                  </h2>
                  <div className="mt-5 flex h-40 items-end gap-[3px]" role="img" aria-label={`Actions per day over the last ${range} days. Peak ${stats.peak}.`}>
                    {stats.series.map((s) => (
                      <div key={s.day} className="group relative flex h-full flex-1 items-end">
                        <div
                          className={`w-full rounded-t-[4px] transition-colors ${s.total ? "bg-accent/80 group-hover:bg-accent" : "bg-black/[0.06]"}`}
                          style={{ height: `${Math.max(3, (s.total / stats.peak) * 100)}%` }}
                          title={`${s.day}: ${s.total}`}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex justify-between font-mono text-[10px] text-ink-soft/60">
                    <span>{stats.series[0]?.day}</span>
                    <span>{stats.series[stats.series.length - 1]?.day}</span>
                  </div>
                </section>

                <section className="ui-card p-5 sm:p-6">
                  <h2 className="font-serif text-lg font-bold text-ink">What people use</h2>
                  {stats.featureRows.length === 0 ? (
                    <p className="mt-3 text-sm text-ink-soft">No actions recorded in this range yet.</p>
                  ) : (
                    <ul className="mt-4 space-y-3">
                      {stats.featureRows.map(([key, n]) => (
                        <li key={key}>
                          <div className="mb-1 flex justify-between text-[13px]">
                            <span className="font-medium text-ink">{LABELS[key] ?? key}</span>
                            <span className="font-mono text-ink-soft">{n}</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-black/[0.06]">
                            <div className="h-full rounded-full bg-accent" style={{ width: `${(n / stats.featureMax) * 100}%` }} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section className="ui-card overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-3 p-5 sm:p-6">
                    <h2 className="flex items-center gap-2 font-serif text-lg font-bold text-ink">
                      <Users className="h-4 w-4 text-accent" strokeWidth={2.25} />
                      Users <span className="font-mono text-xs font-medium text-ink-soft/60">{filtered.length}</span>
                    </h2>
                    <label className="relative w-full sm:w-64">
                      <span className="sr-only">Search users</span>
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft/50" />
                      <input
                        value={q}
                        onChange={(e) => {
                          setQ(e.target.value);
                          setShown(25);
                        }}
                        placeholder="Search name or email"
                        className="ui-input w-full py-2 pl-9 pr-3"
                      />
                    </label>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[34rem] text-left text-[13px]">
                      <thead className="border-y border-line bg-black/[0.02] font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft/70">
                        <tr>
                          <th className="px-5 py-2.5 font-semibold sm:px-6">User</th>
                          <th className="px-3 py-2.5 font-semibold">Joined</th>
                          <th className="px-3 py-2.5 font-semibold">Last seen</th>
                          <th className="px-5 py-2.5 font-semibold sm:px-6">Sign-in</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line/70">
                        {filtered.slice(0, shown).map((p) => (
                          <tr key={p.uid} className="hover:bg-black/[0.02]">
                            <td className="px-5 py-3 sm:px-6">
                              <p className="font-semibold text-ink">{p.displayName || p.email || "Unnamed"}</p>
                              {p.displayName && p.email && <p className="text-xs text-ink-soft">{p.email}</p>}
                            </td>
                            <td className="px-3 py-3 text-ink-soft">{fmtDate(p.createdAt)}</td>
                            <td className="px-3 py-3 text-ink-soft">{ago(p.lastSeenAt)}</td>
                            <td className="px-5 py-3 text-xs text-ink-soft sm:px-6">
                              {p.providers.map((x) => (x === "google.com" ? "Google" : x === "password" ? "Email" : x)).join(", ") || "—"}
                            </td>
                          </tr>
                        ))}
                        {filtered.length === 0 && (
                          <tr>
                            <td colSpan={4} className="px-6 py-8 text-center text-sm text-ink-soft">
                              No users yet. They appear after they next sign in.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  {filtered.length > shown && (
                    <div className="border-t border-line p-4 text-center">
                      <button type="button" onClick={() => setShown((n) => n + 25)} className="ui-btn ui-btn-secondary">
                        Show more
                      </button>
                    </div>
                  )}
                </section>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
