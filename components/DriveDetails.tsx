"use client";

import { useMemo } from "react";
import { BadgeCheck, CloudUpload, FileDown, FolderOpen, Hourglass, Pencil, Trash2, Undo2, X, type LucideIcon } from "lucide-react";
import { useMySubmissions } from "@/lib/facultyService";
import { fmtDate } from "@/lib/adminFormat";
import type { CloudDocument } from "@/lib/firestoreService";
import { FileThumb, stripHtml } from "./CloudFileViews";

function fullDate(ts: CloudDocument["updatedAt"]): string {
  if (!ts) return "Just now";
  return ts.toDate().toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

interface DriveDetailsProps {
  document: CloudDocument;
  onClose: () => void;
  onOpen: () => void;
  onRename: () => void;
  onDownload: () => void;
  onDelete: () => void;
  /** Present only while Google Drive is linked. */
  onSaveToDrive?: () => void;
  driveBusy?: boolean;
}

export function DriveDetails({ document, onClose, onOpen, onRename, onDownload, onDelete, onSaveToDrive, driveBusy }: DriveDetailsProps) {
  const record = document.data?.record;
  const rows: [string, string][] = [
    ["Exercise", record?.exercise_number || "—"],
    ["Register no.", record?.rrn || "—"],
    ["Record date", record?.date || "—"],
    ["Last edited", fullDate(document.updatedAt)],
    ["Created", fullDate(document.createdAt)],
  ];
  const aim = stripHtml(record?.aim);

  // Where this record stands with the faculty: the verdict on its subject (verified wins over waiting, then newest).
  const subs = useMySubmissions();
  const review = useMemo(() => {
    if (!document.folderId) return null;
    const mine = subs.filter((s) => s.folderId === document.folderId);
    return mine.find((s) => s.status === "approved") ?? mine.sort((a, b) => (b.submittedAt?.getTime() ?? 0) - (a.submittedAt?.getTime() ?? 0))[0] ?? null;
  }, [subs, document.folderId]);
  const tone: Record<string, { icon: LucideIcon; box: string; label: string }> = {
    approved: { icon: BadgeCheck, box: "border-emerald-200 bg-emerald-50 text-emerald-800", label: "Verified" },
    changes: { icon: Undo2, box: "border-red-200 bg-red-50 text-red-800", label: "Needs changes" },
    pending: { icon: Hourglass, box: "border-amber-200 bg-amber-50 text-amber-900", label: "Waiting for review" },
  };

  return (
    <aside
      aria-label="File details"
      className="flex min-h-0 w-full shrink-0 flex-col overflow-y-auto border-line bg-white lg:w-72 lg:border-l"
    >
      <div className="flex items-start justify-between gap-2 p-4 pb-3">
        <h3 className="font-serif text-base font-bold leading-snug text-ink">{document.title}</h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close details"
          className="rounded-full p-1 text-ink-soft transition-colors hover:bg-ink/10"
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>

      <div className="mx-4 h-48 overflow-hidden rounded-xl border border-line">
        <FileThumb document={document} />
      </div>

      <div className="flex gap-1.5 p-4">
        <button
          type="button"
          onClick={onOpen}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-accent px-3 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-accent-hover"
        >
          <FolderOpen className="h-3.5 w-3.5" strokeWidth={2.25} />
          Open in editor
        </button>
        <button
          type="button"
          onClick={onDownload}
          aria-label="Download PDF"
          title="Download PDF"
          className="rounded-xl border border-line p-2 text-ink-soft transition-colors hover:border-accent/40 hover:text-accent"
        >
          <FileDown className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={onRename}
          aria-label="Rename"
          title="Rename"
          className="rounded-xl border border-line p-2 text-ink-soft transition-colors hover:border-accent/40 hover:text-accent"
        >
          <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label="Delete"
          title="Delete"
          className="rounded-xl border border-line p-2 text-ink-soft transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>

      {onSaveToDrive && (
        <div className="px-4 pb-4">
          <button
            type="button"
            onClick={onSaveToDrive}
            disabled={driveBusy}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-line px-3 py-2 text-xs font-semibold text-ink-soft transition-colors hover:border-accent/40 hover:text-accent disabled:cursor-default disabled:opacity-60"
          >
            <CloudUpload className="h-3.5 w-3.5" strokeWidth={2} />
            {driveBusy ? "Saving to Drive…" : "Save to Google Drive"}
          </button>
        </div>
      )}

      <div className="border-t border-line p-4">
        <p className="mb-2 text-xs text-ink-soft/70">Faculty review</p>
        {review ? (
          (() => {
            const t = tone[review.status];
            return (
              <div className={`rounded-xl border p-3 text-xs ${t.box}`}>
                <p className="flex items-center gap-1.5 text-[13px] font-bold">
                  <t.icon className="h-4 w-4 shrink-0" strokeWidth={2.2} />
                  {t.label}
                </p>
                <p className="mt-1 opacity-90">
                  {review.status === "approved" ? `Verified by ${review.facultyName || "your faculty"}` : review.facultyName || "Your faculty"}
                  {review.status === "approved" && review.reviewedAt ? `, ${fmtDate(review.reviewedAt)}` : ""}
                  {review.status !== "approved" && review.submittedAt ? `, handed in ${fmtDate(review.submittedAt)}` : ""}
                </p>
                {review.comment && <p className="mt-2 whitespace-pre-wrap rounded-lg bg-white/70 px-2.5 py-2 text-ink">{review.comment}</p>}
              </div>
            );
          })()
        ) : (
          <p className="text-xs text-ink-soft">{document.folderId ? "Not handed in yet. Open its subject and choose Hand in to faculty." : "Move this file into a subject to hand it in."}</p>
        )}
      </div>

      <dl className="space-y-2.5 border-t border-line p-4 text-xs">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3">
            <dt className="text-ink-soft/70">{label}</dt>
            <dd className="text-right font-medium text-ink">{value}</dd>
          </div>
        ))}
      </dl>

      {aim && (
        <div className="border-t border-line p-4">
          <p className="mb-1 text-xs text-ink-soft/70">Aim</p>
          <p className="line-clamp-6 text-xs leading-relaxed text-ink">{aim}</p>
        </div>
      )}
    </aside>
  );
}
