"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { ago, fmtDate } from "@/lib/adminFormat";
import { Avatar, Card, Empty } from "./ui";
import { WhenLoaded } from "./LoadState";

export function UsersPage() {
  const [q, setQ] = useState("");
  const [shown, setShown] = useState(25);
  return (
    <WhenLoaded>
      {({ view, data }) => <UsersTable view={view} profiles={data.usage.profiles} q={q} setQ={setQ} shown={shown} setShown={setShown} />}
    </WhenLoaded>
  );
}

function UsersTable({ view, profiles, q, setQ, shown, setShown }: { view: import("@/lib/adminView").AdminView; profiles: import("@/lib/adminService").ProfileRow[]; q: string; setQ: (s: string) => void; shown: number; setShown: (f: (n: number) => number | number) => void }) {
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return profiles.filter((p) => !needle || [p.email, p.displayName, p.uid].some((v) => (v ?? "").toLowerCase().includes(needle)));
  }, [profiles, q]);
  const unnamed = profiles.filter((p) => !p.displayName?.trim()).length;

  return (
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
              setShown(() => 25);
            }}
            placeholder="Search name or email"
            className="ui-input w-64 max-w-full py-2 pl-9 pr-3"
          />
        </label>
      }
    >
      <p className="px-5 pt-1 text-xs text-ink-soft sm:px-6">
        {filtered.length} of {view.users} users{unnamed > 0 ? ` · ${unnamed} haven't given a name yet (they are asked when they next open the app)` : ""}
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
            {filtered.slice(0, shown).map((p) => (
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
        {filtered.length === 0 && <Empty>{view.users === 0 ? "No users yet. They appear after they next sign in." : "No user matches that search."}</Empty>}
      </div>
      {filtered.length > shown && (
        <div className="border-t border-line p-4 text-center">
          <button type="button" onClick={() => setShown((n) => n + 25)} className="ui-btn ui-btn-secondary">
            Show more
          </button>
        </div>
      )}
    </Card>
  );
}
