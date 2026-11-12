"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp, ChevronsUpDown, Download, FileText, Mail, Pencil, Search, UserRound } from "lucide-react";
import { saveProfileEdits, type ProfileRow } from "@/lib/adminService";
import type { AdminView } from "@/lib/adminView";
import { ago, DAY, fmtDate, fmtDateTime } from "@/lib/adminFormat";
import { Modal } from "../Modal";
import { WhenLoaded } from "./LoadState";
import { Avatar, Card, Empty } from "./ui";

type Filter = "all" | "active7" | "new7" | "noname" | "nocollege";
type SortKey = "name" | "records" | "joined" | "seen";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Everyone" },
  { id: "active7", label: "Active this week" },
  { id: "new7", label: "New this week" },
  { id: "noname", label: "No name yet" },
  { id: "nocollege", label: "College not named" },
];

const csvCell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

export function UsersPage() {
  return <WhenLoaded>{({ view, data, refresh }) => <Users view={view} profiles={data.usage.profiles} refresh={refresh} />}</WhenLoaded>;
}

function Users({ view, profiles, refresh }: { view: AdminView; profiles: ProfileRow[]; refresh: () => Promise<void> | void }) {
  // An admin-typed college wins over the one found from the email domain.
  const collegeOf = useCallback((p: ProfileRow) => p.college || view.collegeOf(p.email), [view]);
  const params = useSearchParams();
  const initial = (FILTERS.find((f) => f.id === params.get("filter"))?.id ?? "all") as Filter;
  const [filter, setFilter] = useState<Filter>(initial);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "seen", dir: -1 });
  const [shown, setShown] = useState(25);
  const [open, setOpen] = useState<ProfileRow | null>(null);
  const search = useRef<HTMLInputElement>(null);

  // "/" jumps to the search box, like most dashboards.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && !/^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        search.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const rows = useMemo(() => {
    const now = Date.now();
    const needle = q.trim().toLowerCase();
    const named = (p: ProfileRow) => !!p.displayName?.trim();
    const keep = profiles.filter((p) => {
      if (needle && ![p.email, p.displayName, p.uid].some((v) => (v ?? "").toLowerCase().includes(needle))) return false;
      if (filter === "active7") return p.lastSeenAt !== null && now - p.lastSeenAt.getTime() <= 7 * DAY;
      if (filter === "new7") return p.createdAt !== null && now - p.createdAt.getTime() <= 7 * DAY;
      if (filter === "noname") return !named(p);
      if (filter === "nocollege") return !collegeOf(p);
      return true;
    });
    const val = (p: ProfileRow): string | number => {
      if (sort.key === "name") return (p.displayName || p.email || "").toLowerCase();
      if (sort.key === "records") return view.recordsByUser.get(p.uid) ?? 0;
      if (sort.key === "joined") return p.createdAt?.getTime() ?? 0;
      return p.lastSeenAt?.getTime() ?? 0;
    };
    return [...keep].sort((a, b) => (val(a) < val(b) ? -1 : val(a) > val(b) ? 1 : 0) * sort.dir);
  }, [profiles, q, filter, sort, view, collegeOf]);

  const counts = useMemo(() => {
    const now = Date.now();
    return {
      all: profiles.length,
      active7: profiles.filter((p) => p.lastSeenAt && now - p.lastSeenAt.getTime() <= 7 * DAY).length,
      new7: profiles.filter((p) => p.createdAt && now - p.createdAt.getTime() <= 7 * DAY).length,
      noname: profiles.filter((p) => !p.displayName?.trim()).length,
      nocollege: profiles.filter((p) => !collegeOf(p)).length,
    } satisfies Record<Filter, number>;
  }, [profiles, collegeOf]);

  function exportCsv() {
    const head = ["Name", "Email", "College", "Records", "Joined", "Last seen", "Sign-in"];
    const lines = rows.map((p) =>
      [p.displayName ?? "", p.email ?? "", collegeOf(p) ?? "", view.records === null ? "" : view.recordsByUser.get(p.uid) ?? 0, p.createdAt?.toISOString().slice(0, 10) ?? "", p.lastSeenAt?.toISOString().slice(0, 10) ?? "", p.providers.join(" ")].map(csvCell).join(","),
    );
    const url = URL.createObjectURL(new Blob([[head.map(csvCell).join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `record-lab-users-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const th = (key: SortKey, label: string, cls = "") => {
    const active = sort.key === key;
    const Icon = !active ? ChevronsUpDown : sort.dir === 1 ? ArrowUp : ArrowDown;
    return (
      <th scope="col" aria-sort={active ? (sort.dir === 1 ? "ascending" : "descending") : "none"} className={`whitespace-nowrap px-3 py-2.5 font-semibold ${cls}`}>
        <button type="button" onClick={() => setSort({ key, dir: active ? (sort.dir === 1 ? -1 : 1) : key === "name" ? 1 : -1 })} className={`inline-flex items-center gap-1 rounded transition-colors hover:text-ink ${active ? "text-ink" : ""}`}>
          {label}
          <Icon className={`h-3 w-3 ${active ? "" : "opacity-40"}`} strokeWidth={2.4} />
        </button>
      </th>
    );
  };

  return (
    <>
      <Card
        title="Users"
        aside={
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative block">
              <span className="sr-only">Search users</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft/50" />
              <input
                ref={search}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setShown(25);
                }}
                placeholder="Search name or email  ( / )"
                className="ui-input w-64 max-w-full py-2 pl-9 pr-3"
              />
            </label>
            <button type="button" onClick={exportCsv} disabled={rows.length === 0} className="ui-btn ui-btn-secondary flex min-h-10 items-center gap-1.5 px-3 text-xs font-semibold disabled:opacity-50" title="Download the users shown as a CSV file">
              <Download className="h-3.5 w-3.5" strokeWidth={2.2} /> Export
            </button>
          </div>
        }
      >
        <div className="flex flex-wrap gap-1.5 px-5 pt-3 sm:px-6" role="group" aria-label="Filter users">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => {
                setFilter(f.id);
                setShown(25);
              }}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${filter === f.id ? "border-accent bg-accent-soft text-accent-ink" : "border-line bg-white text-ink-soft hover:border-accent/40"}`}
            >
              {f.label} <span className="font-mono opacity-70">{counts[f.id]}</span>
            </button>
          ))}
        </div>
        <p className="px-5 pt-3 text-xs text-ink-soft sm:px-6" aria-live="polite">
          Showing {Math.min(shown, rows.length)} of {rows.length}. Click a user for details.
        </p>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[46rem] text-left text-[13px]">
            <thead className="border-y border-line bg-black/[0.02] text-xs text-ink-soft/80">
              <tr>
                {th("name", "User", "px-5 sm:px-6")}
                <th scope="col" className="whitespace-nowrap px-3 py-2.5 font-semibold">College</th>
                {th("records", "Records", "text-right")}
                {th("joined", "Joined")}
                {th("seen", "Last seen")}
                <th scope="col" className="whitespace-nowrap px-5 py-2.5 font-semibold sm:px-6">Sign-in</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/70">
              {rows.slice(0, shown).map((p) => (
                <tr key={p.uid} onClick={() => setOpen(p)} className="cursor-pointer hover:bg-black/[0.02]">
                  <td className="px-5 py-3 sm:px-6">
                    <button type="button" onClick={(e) => { e.stopPropagation(); setOpen(p); }} className="flex w-full items-center gap-2.5 text-left">
                      <Avatar name={p.displayName || p.email || "?"} />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-ink">{p.displayName || p.email || "Unnamed"}</span>
                        {p.displayName && p.email && <span className="block truncate text-xs text-ink-soft">{p.email}</span>}
                        {!p.displayName?.trim() && <span className="mt-0.5 inline-block rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">No name yet</span>}
                      </span>
                    </button>
                  </td>
                  <td className="px-3 py-3 text-ink-soft">{collegeOf(p) ?? <span className="text-ink-soft/50">—</span>}</td>
                  <td className="px-3 py-3 text-right font-mono text-ink">{view.records === null ? "—" : view.recordsByUser.get(p.uid) ?? 0}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-ink-soft">{fmtDate(p.createdAt)}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-ink-soft">{ago(p.lastSeenAt)}</td>
                  <td className="px-5 py-3 text-xs text-ink-soft sm:px-6">{p.providers.map((x) => (x === "google.com" ? "Google" : x === "password" ? "Email" : x)).join(", ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <Empty>
              {profiles.length === 0 ? "No users yet. They appear after they next sign in." : "No user matches."}{" "}
              {(q || filter !== "all") && (
                <button type="button" onClick={() => { setQ(""); setFilter("all"); }} className="font-semibold text-accent hover:underline">
                  Clear filters
                </button>
              )}
            </Empty>
          )}
        </div>
        {rows.length > shown && (
          <div className="border-t border-line p-4 text-center">
            <button type="button" onClick={() => setShown((n) => n + 25)} className="ui-btn ui-btn-secondary">
              Show more
            </button>
          </div>
        )}
      </Card>

      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.displayName || open?.email || "User"} description={open?.displayName ? open.email ?? undefined : undefined} icon={UserRound} size="md" bodyClassName="p-5 sm:p-6">
        {open && <UserDetail key={open.uid} p={open} view={view} college={collegeOf(open)} onSaved={async () => { await refresh(); setOpen(null); }} />}
      </Modal>
    </>
  );
}

function UserDetail({ p, view, college, onSaved }: { p: ProfileRow; view: AdminView; college: string | null; onSaved: () => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const count = view.records === null ? null : view.recordsByUser.get(p.uid) ?? 0;
  const items: [string, string][] = [
    ["College", college ?? "Not named yet"],
    ["Joined", fmtDateTime(p.createdAt)],
    ["Last seen", `${ago(p.lastSeenAt)}${p.lastSeenAt ? ` · ${fmtDateTime(p.lastSeenAt)}` : ""}`],
    ["Sign-in", p.providers.map((x) => (x === "google.com" ? "Google" : x === "password" ? "Email and password" : x)).join(", ") || "—"],
    ["Saved records", count === null ? "Deploy rules to see" : String(count)],
  ];
  if (editing) return <EditUser p={p} college={college} onCancel={() => setEditing(false)} onSaved={onSaved} />;
  return (
    <div className="space-y-5">
      {p.edited && <p className="rounded-xl bg-accent-soft px-4 py-2.5 text-xs font-medium text-accent-ink">An admin edited these details. The person&apos;s own account is unchanged.</p>}
      <dl className="divide-y divide-line/70 rounded-xl border border-line bg-white">
        {items.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-4 px-4 py-2.5 text-[13px]">
            <dt className="shrink-0 font-semibold text-ink-soft">{k}</dt>
            <dd className="min-w-0 text-right text-ink">{v}</dd>
          </div>
        ))}
      </dl>
      {!p.displayName?.trim() && <p className="rounded-xl bg-amber-50 px-4 py-3 text-xs font-medium text-amber-900">This person hasn&apos;t given a name. They are asked the next time they open the app.</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setEditing(true)} className="ui-btn ui-btn-secondary flex min-h-10 items-center gap-2 px-4 text-xs font-semibold">
          <Pencil className="h-3.5 w-3.5" strokeWidth={2.2} /> Edit details
        </button>
        {p.email && (
          <Link href={`/admin/mail?to=${encodeURIComponent(p.uid)}`} className="ui-primary flex min-h-10 items-center gap-2 px-4 py-2 text-xs font-semibold">
            <Mail className="h-3.5 w-3.5" strokeWidth={2.3} /> Email this user
          </Link>
        )}
        <Link href={`/admin/records?user=${encodeURIComponent(p.uid)}`} className="ui-btn ui-btn-secondary flex min-h-10 items-center gap-2 px-4 text-xs font-semibold">
          <FileText className="h-3.5 w-3.5" strokeWidth={2.2} /> View their records
        </Link>
      </div>
    </div>
  );
}

function EditUser({ p, college, onCancel, onSaved }: { p: ProfileRow; college: string | null; onCancel: () => void; onSaved: () => Promise<void> }) {
  const [name, setName] = useState(p.displayName ?? "");
  const [email, setEmail] = useState(p.email ?? "");
  const [col, setCol] = useState(college ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const emailBad = email.trim() !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (emailBad) return;
    setBusy(true);
    setError("");
    try {
      await saveProfileEdits(p.uid, { name, email, college: col });
      await onSaved();
    } catch {
      setError("Could not save. Deploy the latest firestore.rules, then try again.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      {[
        { id: "euName", label: "Name", value: name, set: setName, type: "text", max: 80, ph: "Full name" },
        { id: "euEmail", label: "Email", value: email, set: setEmail, type: "email", max: 120, ph: "name@college.edu" },
        { id: "euCollege", label: "College", value: col, set: setCol, type: "text", max: 120, ph: "College name" },
      ].map((f) => (
        <div key={f.id}>
          <label htmlFor={f.id} className="mb-1 block text-xs font-semibold text-ink-soft">{f.label}</label>
          <input id={f.id} type={f.type} maxLength={f.max} value={f.value} placeholder={f.ph} onChange={(e) => f.set(e.target.value)} className="ui-input w-full px-3 py-2.5" />
        </div>
      ))}
      {emailBad && <p className="text-xs font-medium text-red-700">Enter a valid email.</p>}
      <p className="text-xs text-ink-soft">
        Changes what this panel and the mailer show. The person&apos;s sign-in email does not change. Leave a field empty to go back to what their account gives.
      </p>
      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-2.5 text-xs font-medium text-red-700">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={busy || emailBad} className="ui-primary min-h-10 px-5 py-2 text-xs font-semibold disabled:opacity-50">{busy ? "Saving…" : "Save"}</button>
        <button type="button" onClick={onCancel} disabled={busy} className="ui-btn ui-btn-secondary min-h-10 px-4 text-xs font-semibold">Cancel</button>
      </div>
    </form>
  );
}
