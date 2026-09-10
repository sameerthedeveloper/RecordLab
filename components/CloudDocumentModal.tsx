"use client";

import { X } from "lucide-react";
import type { CloudDocument } from "@/lib/firestoreService";

interface CloudDocumentModalProps {
  document: CloudDocument | null;
  onClose: () => void;
  onLoad: () => void;
}

export function CloudDocumentModal({ document, onClose, onLoad }: CloudDocumentModalProps) {
  if (!document) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-3 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex w-full max-w-xl max-h-[85vh] flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-line p-4">
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">
              Cloud Document
            </p>
            <h2 className="truncate font-serif text-lg font-bold text-ink">{document.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex items-center justify-center rounded-xl border border-line bg-white p-2 text-ink-soft transition-colors hover:border-accent/40 hover:text-accent"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <pre className="whitespace-pre-wrap break-words rounded-xl border border-line bg-[#fdfcf8] p-3 font-mono text-xs leading-relaxed text-ink-soft">
            {JSON.stringify(document.data, null, 2)}
          </pre>
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-line p-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-line bg-white px-4 py-2 text-xs font-semibold text-ink-soft transition-colors hover:border-accent/40 hover:text-accent"
          >
            Close
          </button>
          <button
            type="button"
            onClick={onLoad}
            className="rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-accent-hover"
          >
            Load into Editor
          </button>
        </div>
      </div>
    </div>
  );
}
