"use client";

import { FolderOpen, Pencil, Trash2, X } from "lucide-react";
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
  onDelete: () => void;
}

export function DriveDetails({ document, onClose, onOpen, onRename, onDelete }: DriveDetailsProps) {
  const record = document.data?.record;
  const rows: [string, string][] = [
    ["Exercise", record?.exercise_number || "—"],
    ["RRN", record?.rrn || "—"],
    ["Record date", record?.date || "—"],
    ["Last edited", fullDate(document.updatedAt)],
    ["Created", fullDate(document.createdAt)],
  ];
  const aim = stripHtml(record?.aim);

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
