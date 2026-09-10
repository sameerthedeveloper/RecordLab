"use client";

import { Cloud, Trash2, Upload } from "lucide-react";
import type { CloudDocument } from "@/lib/firestoreService";

interface CloudDocumentCardProps {
  document: CloudDocument;
  onOpen: () => void;
  onLoad: () => void;
  onDelete: () => void;
}

function formatTimestamp(ts: CloudDocument["updatedAt"]): string {
  if (!ts) return "Just now";
  return ts.toDate().toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function CloudDocumentCard({ document, onOpen, onLoad, onDelete }: CloudDocumentCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4 shadow-sm transition-all hover:border-accent/40">
      <button type="button" onClick={onOpen} className="flex items-start gap-2.5 text-left">
        <Cloud className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={2} />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-ink">{document.title}</p>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-ink-soft/70">
            Updated {formatTimestamp(document.updatedAt)}
          </p>
        </div>
      </button>

      <div className="flex items-center gap-1.5 border-t border-line pt-3">
        <button
          type="button"
          onClick={onLoad}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-line bg-white px-2.5 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:border-accent/40 hover:text-accent active:bg-accent-soft"
        >
          <Upload className="h-3.5 w-3.5" strokeWidth={2} />
          Load
        </button>
        <button
          type="button"
          title="Delete"
          aria-label="Delete"
          onClick={onDelete}
          className="flex items-center justify-center rounded-xl border border-line bg-white p-1.5 text-ink-soft/70 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
