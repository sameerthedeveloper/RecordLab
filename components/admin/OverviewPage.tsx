"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Activity, AlertCircle, ChevronRight, FileText, UserPlus, Users } from "lucide-react";
import { ago } from "@/lib/adminFormat";
import { loadFacultyRequests } from "@/lib/facultyService";
import { Avatar, BarChart, Card, Empty, Kpi } from "./ui";
import { WhenLoaded } from "./LoadState";
import type { AdminData } from "@/lib/adminService";
import type { AdminView } from "@/lib/adminView";

/** Things an admin can act on right now, each linking to where it is fixed. */
function attention(view: AdminView, data: AdminData, facultyWaiting = 0): { text: string; href?: string }[] {
  const out: { text: string; href?: string }[] = [];
  if (facultyWaiting > 0) out.push({ text: `${facultyWaiting} faculty ${facultyWaiting === 1 ? "request is" : "requests are"} waiting for approval`, href: "/admin/faculty" });
  const unnamed = data.usage.profiles.filter((p) => !p.displayName?.trim()).length;
  if (unnamed > 0) out.push({ text: `${unnamed} ${unnamed === 1 ? "user hasn't" : "users haven't"} given a name yet`, href: "/admin/users?filter=noname" });
  const colleges = view.domainRows.filter((d) => !d.name).length;
  if (colleges > 0) out.push({ text: `${colleges} college email ${colleges === 1 ? "domain isn't" : "domains aren't"} named yet`, href: "/admin/colleges" });
  if (view.records === null) out.push({ text: "Saved records can't be read. Deploy the latest firestore.rules." });
  if (data.admins === null) out.push({ text: "The admin list can't be read. Deploy the latest firestore.rules.", href: "/admin/admins" });
  else if (view.adminCount === 1) out.push({ text: "You are the only admin. Add a second one so access is never lost.", href: "/admin/admins" });
  return out;
}

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
  // Optional: if the faculty rules are not deployed yet this stays at 0 and the rest of the page is unaffected.
  const [facultyWaiting, setFacultyWaiting] = useState(0);
  useEffect(() => {
    loadFacultyRequests().then((r) => setFacultyWaiting(r.length)).catch(() => {});
  }, []);
  return (
    <WhenLoaded>
      {({ view, range, data }) => (
        <>
          {attention(view, data, facultyWaiting).length > 0 && (
            <Card title="Needs attention" aside={`${attention(view, data, facultyWaiting).length} to look at`}>
              <ul className="divide-y divide-line/70 px-2 pb-3 pt-2">
                {attention(view, data, facultyWaiting).map((a) => {
                  const inner = (
                    <>
                      <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" strokeWidth={2.1} />
                      <span className="min-w-0 flex-1 text-[13px] font-medium text-ink">{a.text}</span>
                      {a.href && <ChevronRight className="h-4 w-4 shrink-0 text-ink-soft/50" strokeWidth={2.2} />}
                    </>
                  );
                  return (
                    <li key={a.text}>
                      {a.href ? (
                        <Link href={a.href} className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-black/[0.03]">
                          {inner}
                        </Link>
                      ) : (
                        <div className="flex items-center gap-3 px-3 py-2.5">{inner}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}

          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <Kpi href="/admin/users" label="Users" icon={Users} value={view.users} current={view.newNow} previous={view.newPrev} note={`${view.newNow} joined in ${range} days`} />
            <Kpi href="/admin/users?filter=active7" label="Active · 7 days" icon={Activity} value={view.active7} current={view.active7} previous={view.activePrevWeek} note={`${view.users ? Math.round((view.active7 / view.users) * 100) : 0}% of users`} />
            <Kpi href="/admin/records" label="Saved records" icon={FileText} value={view.records ?? "—"} current={view.records === null ? undefined : view.recordsNow} previous={view.records === null ? undefined : view.recordsPrev} note={view.records === null ? "Deploy rules to see" : `${view.recordsNow} new in ${range} days`} />
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

          <div className="grid items-start gap-4 xl:grid-cols-2">
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

          <div className="grid items-start gap-4 xl:grid-cols-2">
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

            <Card title="Colleges" aside={`${view.domainRows.length} ${view.domainRows.length === 1 ? "email domain" : "email domains"}`}>
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
