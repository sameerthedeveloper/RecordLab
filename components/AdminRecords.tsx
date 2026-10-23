"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, FileText, Search } from "lucide-react";
import type { AdminRecord } from "@/lib/adminService";
import { ago, fmtDateTime } from "@/lib/adminFormat";
import { resolveSections } from "@/lib/sections";
import { Modal } from "./Modal";
import { Avatar, Card, Empty } from "./admin/ui";

interface AdminRecordsProps {
  rows: AdminRecord[] | null;
  error: string;
  ownerName: (uid: string) => string;
}

/** Every saved record with its owner, openable read-only. */
export function AdminRecords({ rows, error, ownerName }: AdminRecordsProps) {
  const [q, setQ] = useState("");
  const [owner, setOwner] = useState(useSearchParams().get("user") ?? "");
  const [shown, setShown] = useState(20);
  const [open, setOpen] = useState<AdminRecord | null>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (rows ?? []).filter((r) => (!owner || r.userId === owner) && (!needle || [r.title, r.record?.rrn, r.record?.aim, ownerName(r.userId)].some((v) => (v ?? "").toLowerCase().includes(needle))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, q, owner]);

  const owners = useMemo(() => {
    const ids = [...new Set((rows ?? []).map((r) => r.userId))];
    return ids.map((id) => ({ id, name: ownerName(id) })).sort((a, b) => a.name.localeCompare(b.name));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  const at = open ? filtered.findIndex((r) => r.id === open.id) : -1;

  const sections = open?.record ? resolveSections(open.record) : [];

  return (
    <>
      <Card
        title="Records"
        aside={
          <label className="relative block">
            <span className="sr-only">Search records</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft/50" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setShown(20);
              }}
              placeholder="Search title, owner, register no."
              className="ui-input w-64 max-w-full py-2 pl-9 pr-3"
            />
          </label>
        }
      >
        <div className="flex flex-wrap items-center gap-2 px-5 pt-2 sm:px-6">
          <label className="flex items-center gap-2 text-xs font-semibold text-ink-soft">
            Owner
            <select value={owner} onChange={(e) => { setOwner(e.target.value); setShown(20); }} className="rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink outline-none focus:border-accent">
              <option value="">Everyone</option>
              {owners.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
          <p className="text-xs text-ink-soft" aria-live="polite">{rows ? `${filtered.length} of ${rows.length} most recent saved records. Read-only.` : ""}</p>
        </div>
        {error && <p role="alert" className="mx-5 mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 sm:mx-6">{error}</p>}
        {rows && (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-[13px]">
              <thead className="border-y border-line bg-black/[0.02] text-xs text-ink-soft/80">
                <tr>
                  <th className="px-5 py-2.5 font-semibold sm:px-6">Record</th>
                  <th className="px-3 py-2.5 font-semibold">Owner</th>
                  <th className="px-3 py-2.5 font-semibold">Updated</th>
                  <th className="px-5 py-2.5 sm:px-6"><span className="sr-only">Open</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/70">
                {filtered.slice(0, shown).map((r) => (
                  <tr key={r.id} className="cursor-pointer hover:bg-black/[0.02]" onClick={() => setOpen(r)}>
                    <td className="px-5 py-3 sm:px-6">
                      <p className="font-semibold text-ink">{r.title}</p>
                      <p className="text-xs text-ink-soft">{[r.record?.rrn, r.record?.sections ? "Custom layout" : "Programming lab"].filter(Boolean).join(" · ")}</p>
                    </td>
                    <td className="px-3 py-3">
                      <span className="flex items-center gap-2 text-ink">
                        <Avatar name={ownerName(r.userId)} />
                        <span className="truncate">{ownerName(r.userId)}</span>
                      </span>
                    </td>
                    <td className="px-3 py-3 text-ink-soft">{ago(r.updatedAt)}</td>
                    <td className="px-5 py-3 text-right sm:px-6">
                      <button type="button" onClick={(e) => { e.stopPropagation(); setOpen(r); }} className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:border-accent/40 hover:text-accent">
                        Open
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <Empty>{rows.length === 0 ? "No one has saved a record to the cloud yet." : "No record matches that search."}</Empty>}
            {filtered.length > shown && (
              <div className="border-t border-line p-4 text-center">
                <button type="button" onClick={() => setShown((n) => n + 20)} className="ui-btn ui-btn-secondary">
                  Show more
                </button>
              </div>
            )}
          </div>
        )}
      </Card>

      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.title ?? ""} description={open ? `${ownerName(open.userId)} · updated ${fmtDateTime(open.updatedAt)}` : ""} icon={FileText}
        size="big"
        bodyClassName="p-5 sm:p-6"
        footer={
          <>
            <span className="mr-auto text-xs text-ink-soft">{at >= 0 ? `${at + 1} of ${filtered.length}` : ""}</span>
            <button type="button" disabled={at <= 0} onClick={() => setOpen(filtered[at - 1])} className="ui-btn ui-btn-secondary flex min-h-10 items-center gap-1 px-3 text-xs font-semibold disabled:opacity-50">
              <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2.4} /> Newer
            </button>
            <button type="button" disabled={at < 0 || at >= filtered.length - 1} onClick={() => setOpen(filtered[at + 1])} className="ui-btn ui-btn-secondary flex min-h-10 items-center gap-1 px-3 text-xs font-semibold disabled:opacity-50">
              Older <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.4} />
            </button>
          </>
        }
      >
        {open?.record ? (
          <div className="space-y-5">
            <dl className="grid grid-cols-2 gap-3 rounded-xl border border-line bg-paper/60 p-3 text-xs sm:grid-cols-4">
              {[
                ["Register no.", open.record.rrn],
                ["Exercise", open.record.exercise_number],
                ["Date", open.record.date],
                ["Created", fmtDateTime(open.createdAt)],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="font-semibold text-ink-soft">{k}</dt>
                  <dd className="text-ink">{v || "—"}</dd>
                </div>
              ))}
            </dl>
            {sections.map((s) => (
              <div key={s.id}>
                {s.heading && <h3 className="mb-1.5 font-serif text-sm font-bold text-ink">{s.heading.replace(/:$/, "")}</h3>}
                {s.kind === "lines" ? (
                  <p className="text-xs text-ink-soft">{s.lines} blank lines for hand-written working.</p>
                ) : s.value.trim() ? (
                  <pre className={`max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border border-line p-3 text-[13px] leading-relaxed text-ink ${s.kind === "code" || s.kind === "output" ? "bg-paper/70 font-mono text-xs" : "bg-white"}`}>{s.value}</pre>
                ) : (
                  <p className="text-xs text-ink-soft/70">Empty</p>
                )}
                {s.images.length > 0 && (
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {s.images.map((img) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={img.id} src={img.src} alt={img.name} className="w-full rounded-lg border border-line bg-white" />
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div>
              <h3 className="mb-1.5 font-serif text-sm font-bold text-ink">{open.record.result_title || "Result"}</h3>
              {open.record.result?.trim() ? <pre className="whitespace-pre-wrap rounded-lg border border-line bg-white p-3 text-[13px] text-ink">{open.record.result}</pre> : <p className="text-xs text-ink-soft/70">Empty</p>}
            </div>
          </div>
        ) : (
          <p className="text-sm text-ink-soft">This file has no readable record.</p>
        )}
      </Modal>
    </>
  );
}
