"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Activity, FileText, GraduationCap, LayoutDashboard, Loader2, Mail, RefreshCw, Search, ShieldAlert, UserPlus, Users } from "lucide-react";
import { loadAdminData, useAdminAccess, type AdminData } from "@/lib/adminService";
import { ago, DAY, domainCandidates, emailDomainOf, fmtDate } from "@/lib/adminFormat";
import { getFirebaseAuth } from "@/lib/firebaseConfig";
import { dayKey } from "@/lib/usageStats";
import { AdminMail } from "./AdminMail";
import { AdminRecords } from "./AdminRecords";
import { AuthModal } from "./AuthModal";
import { Avatar, BarChart, Card, Empty, Kpi } from "./admin/ui";

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
  run_code_used: "Ran code",
  save_settings: "Saved settings",
  create_subject: "Created subject folder",
  move_to_subject: "Moved file to subject",
  link_puter_account: "Linked Puter",
};

const RANGES = [7, 30, 90] as const;
type Range = (typeof RANGES)[number];

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "users", label: "Users", icon: Users },
  { id: "records", label: "Records", icon: FileText },
  { id: "colleges", label: "Colleges", icon: GraduationCap },
  { id: "mail", label: "Send mail", icon: Mail },
] as const;
type Tab = (typeof TABS)[number]["id"];

export function AdminClient() {
  const access = useAdminAccess();
  const [tab, setTab] = useState<Tab>("overview");
  const [range, setRange] = useState<Range>(30);
  const [data, setData] = useState<AdminData | null>(null);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [q, setQ] = useState("");
  const [shown, setShown] = useState(25);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await loadAdminData(range));
      setLoadedAt(new Date());
    } catch (e) {
      console.error("Admin load failed:", e);
      setError("Couldn't load the dashboard. Check that the latest firestore.rules are deployed and your admin document exists.");
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    if (access.status === "admin") void refresh();
  }, [access.status, refresh]);

  // Open the tab named in the URL hash (#records), and keep the hash in step.
  useEffect(() => {
    const h = window.location.hash.slice(1) as Tab;
    if (TABS.some((t) => t.id === h)) setTab(h);
  }, []);
  const pick = (t: Tab) => {
    setTab(t);
    setQ("");
    setShown(25);
    history.replaceState(null, "", `#${t}`);
  };

  const view = useMemo(() => {
    if (!data) return null;
    const now = Date.now();
    const { usage, records, colleges } = data;
    const profiles = usage.profiles;
    const within = (d: Date | null, from: number, to: number) => d !== null && now - d.getTime() <= from * DAY && now - d.getTime() > to * DAY;
    const inRange = (d: Date | null) => within(d, range, 0);
    const inPrev = (d: Date | null) => within(d, range * 2, range);

    // Fill every day of both periods so quiet days show as empty bars.
    const byDay = new Map(usage.days.map((d) => [d.day, d]));
    const keys = Array.from({ length: range * 2 }, (_, i) => dayKey(new Date(now - (range * 2 - 1 - i) * DAY)));
    const actionsAll = keys.map((day) => ({ day, value: byDay.get(day)?.total ?? 0 }));
    const actions = actionsAll.slice(range);
    const actionsNow = actions.reduce((n, s) => n + s.value, 0);
    const actionsPrev = actionsAll.slice(0, range).reduce((n, s) => n + s.value, 0);

    const signupDays = new Map<string, number>();
    for (const p of profiles) if (p.createdAt) signupDays.set(dayKey(p.createdAt), (signupDays.get(dayKey(p.createdAt)) ?? 0) + 1);
    const signups = keys.slice(range).map((day) => ({ day, value: signupDays.get(day) ?? 0 }));

    const features: Record<string, number> = {};
    const currentKeys = new Set(keys.slice(range));
    for (const d of usage.days) if (currentKeys.has(d.day)) for (const [k, n] of Object.entries(d.events)) features[k] = (features[k] ?? 0) + n;
    const featureRows = Object.entries(features).sort((a, b) => b[1] - a[1]);
    const featureTotal = featureRows.reduce((n, [, v]) => n + v, 0);

    const collegeByDomain = new Map((colleges ?? []).map((c) => [c.domain, c.name]));
    const collegeOf = (email: string | null) => {
      const d = emailDomainOf(email);
      if (!d) return null;
      for (const c of domainCandidates(d)) if (collegeByDomain.has(c)) return collegeByDomain.get(c)!;
      return null;
    };

    const recordsByUser = new Map<string, number>();
    for (const r of records ?? []) recordsByUser.set(r.userId, (recordsByUser.get(r.userId) ?? 0) + 1);
    const nameOf = new Map(profiles.map((p) => [p.uid, p.displayName || p.email || p.uid.slice(0, 8)]));
    const ownerName = (uid: string) => nameOf.get(uid) ?? uid.slice(0, 8);

    const topUsers = [...recordsByUser.entries()]
      .map(([uid, n]) => ({ uid, n, name: ownerName(uid), college: collegeOf(profiles.find((p) => p.uid === uid)?.email ?? null) }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 5);

    // Students per college domain (a domain with no saved name shows as "Not named yet").
    const perDomain = new Map<string, number>();
    for (const p of profiles) {
      const d = emailDomainOf(p.email);
      if (d) perDomain.set(d, (perDomain.get(d) ?? 0) + 1);
    }
    const domainRows = [...perDomain.entries()].map(([domain, n]) => ({ domain, n, name: collegeOf(`x@${domain}`) })).sort((a, b) => b.n - a.n);

    return {
      users: profiles.length,
      newNow: profiles.filter((p) => inRange(p.createdAt)).length,
      newPrev: profiles.filter((p) => inPrev(p.createdAt)).length,
      active7: profiles.filter((p) => within(p.lastSeenAt, 7, 0)).length,
      activePrevWeek: profiles.filter((p) => within(p.lastSeenAt, 14, 7)).length,
      records: records?.length ?? null,
      recordsNow: records?.filter((r) => inRange(r.createdAt)).length ?? 0,
      recordsPrev: records?.filter((r) => inPrev(r.createdAt)).length ?? 0,
      actions,
      actionsNow,
      actionsPrev,
      signups,
      featureRows,
      featureTotal,
      topUsers,
      domainRows,
      collegesNamed: colleges?.length ?? 0,
      recent: (records ?? []).slice(0, 6),
      collegeOf,
      ownerName,
      recordsByUser,
      lifetime: usage.lifetime?.total ?? null,
    };
  }, [data, range]);

  const filteredUsers = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLowerCase();
    return data.usage.profiles.filter((p) => !needle || [p.email, p.displayName, p.uid].some((v) => (v ?? "").toLowerCase().includes(needle)));
  }, [data, q]);

  const admin = access.status === "admin";

  return (
    <div className="app-canvas fixed inset-0 overflow-y-auto">
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-4 sm:px-6">
        <header className="ui-panel flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-3">
            <Link href="/" aria-label="Back to home" className="ui-icon-btn flex items-center justify-center">
              <ArrowLeft className="h-4 w-4" strokeWidth={2.25} />
            </Link>
            <div>
              <h1 className="font-serif text-xl font-bold leading-tight tracking-tight text-ink">Record Lab admin</h1>
              <p className="text-xs text-ink-soft">{loadedAt ? `Updated ${ago(loadedAt)}` : "Admins only"}</p>
            </div>
          </div>
          {admin && (
            <div className="flex items-center gap-2">
              <div className="flex rounded-full bg-black/[0.05] p-1" role="group" aria-label="Date range">
                {RANGES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    aria-pressed={range === r}
                    onClick={() => setRange(r)}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${range === r ? "bg-accent text-white shadow-sm" : "text-ink-soft hover:bg-ink/5"}`}
                  >
                    {r} days
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
            <p className="text-sm text-ink-soft">The admin dashboard is for Record Lab admins.</p>
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

        {admin && (
          <div className="mt-4 grid gap-4 lg:grid-cols-[200px_minmax(0,1fr)]">
            {/* section navigation: a column on desktop, a scrolling row on phones */}
            <nav aria-label="Dashboard sections" className="flex gap-1 overflow-x-auto lg:sticky lg:top-0 lg:flex-col lg:self-start lg:overflow-visible">
              {TABS.map((t) => {
                const active = tab === t.id;
                const count = t.id === "users" ? view?.users : t.id === "records" ? view?.records : t.id === "colleges" ? view?.collegesNamed : null;
                return (
                  <button
                    key={t.id}
                    type="button"
                    aria-current={active ? "page" : undefined}
                    onClick={() => pick(t.id)}
                    className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-[13px] font-semibold transition-colors ${active ? "bg-accent-soft text-accent-ink" : "text-ink-soft hover:bg-ink/5"}`}
                  >
                    <t.icon className="h-4 w-4" strokeWidth={2} />
                    <span className="flex-1">{t.label}</span>
                    {count !== null && count !== undefined && <span className="font-mono text-[11px] font-medium opacity-70">{count}</span>}
                  </button>
                );
              })}
            </nav>

            <main className="min-w-0 space-y-4">
              {error && (
                <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {error}
                </p>
              )}
              {!view && !error && (
                <div className="flex justify-center py-24" role="status">
                  <Loader2 className="h-6 w-6 animate-spin text-accent" />
                </div>
              )}

              {view && data && tab === "overview" && (
                <>
                  <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                    <Kpi label="Users" icon={Users} value={view.users} current={view.newNow} previous={view.newPrev} note={`${view.newNow} joined in ${range} days`} />
                    <Kpi label="Active this week" icon={Activity} value={view.active7} current={view.active7} previous={view.activePrevWeek} note={`${view.users ? Math.round((view.active7 / view.users) * 100) : 0}% of users`} />
                    <Kpi label="Saved records" icon={FileText} value={view.records ?? "—"} current={view.records === null ? undefined : view.recordsNow} previous={view.records === null ? undefined : view.recordsPrev} note={view.records === null ? "Deploy rules to see" : `${view.recordsNow} new in ${range} days`} />
                    <Kpi label="Actions" icon={UserPlus} value={view.actionsNow} current={view.actionsNow} previous={view.actionsPrev} note={view.lifetime !== null ? `${view.lifetime} all time` : `last ${range} days`} />
                  </div>

                  <div className="grid gap-4 xl:grid-cols-2">
                    <Card title="Activity" aside={`Actions per day, last ${range} days`}>
                      <BarChart series={view.actions} label="Actions per day" />
                    </Card>
                    <Card title="New users" aside={`Sign-ups per day, last ${range} days`}>
                      <BarChart series={view.signups} label="Sign-ups per day" tone="ink" />
                    </Card>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-2">
                    <Card title="What people use" aside={`${view.featureTotal} actions`}>
                      {view.featureRows.length === 0 ? (
                        <Empty>No actions recorded in this range yet.</Empty>
                      ) : (
                        <ul className="space-y-3 px-5 pb-5 pt-4 sm:px-6">
                          {view.featureRows.slice(0, 8).map(([key, n]) => (
                            <li key={key}>
                              <div className="mb-1 flex justify-between text-[13px]">
                                <span className="font-medium text-ink">{LABELS[key] ?? key}</span>
                                <span className="text-ink-soft">
                                  <span className="font-mono text-ink">{n}</span> · {Math.round((n / view.featureTotal) * 100)}%
                                </span>
                              </div>
                              <div className="h-2 overflow-hidden rounded-full bg-black/[0.06]">
                                <div className="h-full rounded-full bg-accent" style={{ width: `${(n / view.featureRows[0][1]) * 100}%` }} />
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </Card>

                    <Card title="Most records" aside="Top 5 students">
                      {view.topUsers.length === 0 ? (
                        <Empty>{view.records === null ? "Deploy the latest firestore.rules to see records." : "No saved records yet."}</Empty>
                      ) : (
                        <ol className="divide-y divide-line/70 px-2 pb-3 pt-2">
                          {view.topUsers.map((u, i) => (
                            <li key={u.uid} className="flex items-center gap-3 px-3 py-2.5">
                              <span className="w-4 text-center font-mono text-[11px] text-ink-soft/60">{i + 1}</span>
                              <Avatar name={u.name} />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[13px] font-semibold text-ink">{u.name}</p>
                                {u.college && <p className="truncate text-xs text-ink-soft">{u.college}</p>}
                              </div>
                              <span className="font-mono text-sm font-semibold text-ink">{u.n}</span>
                            </li>
                          ))}
                        </ol>
                      )}
                    </Card>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-2">
                    <Card title="Latest records" aside={<button type="button" onClick={() => pick("records")} className="font-semibold text-accent hover:underline">View all</button>}>
                      {view.recent.length === 0 ? (
                        <Empty>{view.records === null ? "Deploy the latest firestore.rules to see records." : "No saved records yet."}</Empty>
                      ) : (
                        <ul className="divide-y divide-line/70 px-2 pb-3 pt-2">
                          {view.recent.map((r) => (
                            <li key={r.id} className="flex items-center gap-3 px-3 py-2.5">
                              <Avatar name={view.ownerName(r.userId)} />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[13px] font-semibold text-ink">{r.title}</p>
                                <p className="truncate text-xs text-ink-soft">{view.ownerName(r.userId)}</p>
                              </div>
                              <span className="shrink-0 text-xs text-ink-soft">{ago(r.updatedAt)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </Card>

                    <Card title="Colleges" aside={`${view.domainRows.length} email domains`}>
                      {view.domainRows.length === 0 ? (
                        <Empty>No users yet.</Empty>
                      ) : (
                        <ul className="divide-y divide-line/70 px-2 pb-3 pt-2">
                          {view.domainRows.slice(0, 6).map((d) => (
                            <li key={d.domain} className="flex items-center gap-3 px-3 py-2.5">
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[13px] font-semibold text-ink">{d.name ?? <span className="font-medium text-ink-soft">Not named yet</span>}</p>
                                <p className="truncate font-mono text-[11px] text-ink-soft">@{d.domain}</p>
                              </div>
                              <span className="shrink-0 text-xs text-ink-soft">
                                <span className="font-mono text-sm font-semibold text-ink">{d.n}</span> {d.n === 1 ? "student" : "students"}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </Card>
                  </div>
                </>
              )}

              {view && data && tab === "users" && (
                <Card
                  title="Users"
                  aside={
                    <label className="relative block">
                      <span className="sr-only">Search users</span>
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft/50" />
                      <input
                        value={q}
                        onChange={(e) => {
                          setQ(e.target.value);
                          setShown(25);
                        }}
                        placeholder="Search name or email"
                        className="ui-input w-64 max-w-full py-2 pl-9 pr-3"
                      />
                    </label>
                  }
                >
                  <p className="px-5 pt-1 text-xs text-ink-soft sm:px-6">
                    {filteredUsers.length} of {view.users} users
                  </p>
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-[44rem] text-left text-[13px]">
                      <thead className="border-y border-line bg-black/[0.02] text-xs text-ink-soft/80">
                        <tr>
                          <th className="px-5 py-2.5 font-semibold sm:px-6">User</th>
                          <th className="px-3 py-2.5 font-semibold">College</th>
                          <th className="px-3 py-2.5 text-right font-semibold">Records</th>
                          <th className="px-3 py-2.5 font-semibold">Joined</th>
                          <th className="px-3 py-2.5 font-semibold">Last seen</th>
                          <th className="px-5 py-2.5 font-semibold sm:px-6">Sign-in</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line/70">
                        {filteredUsers.slice(0, shown).map((p) => (
                          <tr key={p.uid} className="hover:bg-black/[0.02]">
                            <td className="px-5 py-3 sm:px-6">
                              <span className="flex items-center gap-2.5">
                                <Avatar name={p.displayName || p.email || "?"} />
                                <span className="min-w-0">
                                  <span className="block truncate font-semibold text-ink">{p.displayName || p.email || "Unnamed"}</span>
                                  {p.displayName && p.email && <span className="block truncate text-xs text-ink-soft">{p.email}</span>}
                                </span>
                              </span>
                            </td>
                            <td className="px-3 py-3 text-ink-soft">{view.collegeOf(p.email) ?? <span className="text-ink-soft/50">—</span>}</td>
                            <td className="px-3 py-3 text-right font-mono text-ink">{view.records === null ? "—" : view.recordsByUser.get(p.uid) ?? 0}</td>
                            <td className="px-3 py-3 text-ink-soft">{fmtDate(p.createdAt)}</td>
                            <td className="px-3 py-3 text-ink-soft">{ago(p.lastSeenAt)}</td>
                            <td className="px-5 py-3 text-xs text-ink-soft sm:px-6">{p.providers.map((x) => (x === "google.com" ? "Google" : x === "password" ? "Email" : x)).join(", ") || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {filteredUsers.length === 0 && <Empty>{view.users === 0 ? "No users yet. They appear after they next sign in." : "No user matches that search."}</Empty>}
                  </div>
                  {filteredUsers.length > shown && (
                    <div className="border-t border-line p-4 text-center">
                      <button type="button" onClick={() => setShown((n) => n + 25)} className="ui-btn ui-btn-secondary">
                        Show more
                      </button>
                    </div>
                  )}
                </Card>
              )}

              {view && data && tab === "records" && <AdminRecords rows={data.records} error={data.recordsError} ownerName={view.ownerName} />}

              {view && data && tab === "mail" && access.status === "admin" && <AdminMail profiles={data.usage.profiles} adminEmail={getFirebaseAuth().currentUser?.email ?? null} collegeOf={view.collegeOf} />}

              {view && data && tab === "colleges" && (
                <Card title="Colleges" aside={`${view.collegesNamed} named · ${view.domainRows.filter((d) => !d.name).length} waiting for a name`}>
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-[36rem] text-left text-[13px]">
                      <thead className="border-y border-line bg-black/[0.02] text-xs text-ink-soft/80">
                        <tr>
                          <th className="px-5 py-2.5 font-semibold sm:px-6">College</th>
                          <th className="px-3 py-2.5 font-semibold">Email domain</th>
                          <th className="px-3 py-2.5 text-right font-semibold">Students</th>
                          <th className="px-5 py-2.5 font-semibold sm:px-6">Named by</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line/70">
                        {view.domainRows.map((d) => {
                          const named = (data.colleges ?? []).find((c) => c.domain === d.domain);
                          return (
                            <tr key={d.domain} className="hover:bg-black/[0.02]">
                              <td className="px-5 py-3 font-semibold text-ink sm:px-6">{d.name ?? <span className="font-medium text-ink-soft/70">Not named yet</span>}</td>
                              <td className="px-3 py-3 font-mono text-xs text-ink-soft">@{d.domain}</td>
                              <td className="px-3 py-3 text-right font-mono text-ink">{d.n}</td>
                              <td className="px-5 py-3 text-xs text-ink-soft sm:px-6">{named ? `${named.createdBy ? view.ownerName(named.createdBy) : "A student"} · ${fmtDate(named.createdAt)}` : "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {view.domainRows.length === 0 && <Empty>No users yet.</Empty>}
                  </div>
                  <p className="border-t border-line px-5 py-3 text-xs text-ink-soft sm:px-6">
                    The first student from a college email names it, and the name is fixed for everyone. Fix a wrong one in the Firebase console under <span className="font-mono">colleges/&lt;domain&gt;</span>.
                  </p>
                </Card>
              )}
            </main>
          </div>
        )}
      </div>
    </div>
  );
}
