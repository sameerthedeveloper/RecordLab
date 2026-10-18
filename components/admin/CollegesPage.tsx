"use client";

import { fmtDate } from "@/lib/adminFormat";
import { Card, Empty } from "./ui";
import { WhenLoaded } from "./LoadState";

export function CollegesPage() {
  return (
    <WhenLoaded>
      {({ view, data }) => (
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
    </WhenLoaded>
  );
}
