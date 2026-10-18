"use client";

import Link from "next/link";
import { Activity, FileText, UserPlus, Users } from "lucide-react";
import { ago } from "@/lib/adminFormat";
import { Avatar, BarChart, Card, Empty, Kpi } from "./ui";
import { WhenLoaded } from "./LoadState";

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

export function OverviewPage() {
  return (
    <WhenLoaded>
      {({ view, range }) => (
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
            <Card title="Latest records" aside={<Link href="/admin/records" className="font-semibold text-accent hover:underline">View all</Link>}>
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
    </WhenLoaded>
  );
}
