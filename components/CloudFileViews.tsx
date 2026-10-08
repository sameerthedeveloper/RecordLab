"use client";

import { FileText, MoreVertical, Pencil, Trash2, FolderOpen } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { CloudDocument } from "@/lib/firestoreService";

export function stripHtml(html: string | undefined): string {
  return (html ?? "")
    .replace(/<\/(p|div|li|h\d)>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function relativeTime(ts: CloudDocument["updatedAt"]): string {
  if (!ts) return "Just now";
  const date = ts.toDate();
  const diff = Date.now() - date.getTime();
  const minute = 60_000;
  if (diff < minute) return "Just now";
  if (diff < 60 * minute) return `${Math.floor(diff / minute)} min ago`;
  if (diff < 24 * 60 * minute) return `${Math.floor(diff / (60 * minute))} h ago`;
  if (diff < 7 * 24 * 60 * minute) return date.toLocaleDateString(undefined, { weekday: "long" });
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/** A miniature of the record's first page, so a file is recognisable at a glance. */
export function FileThumb({ document }: { document: CloudDocument }) {
  const record = document.data?.record;
  const aim = stripHtml(record?.aim).slice(0, 140);
  const code = (record?.source_code ?? "").split("\n").slice(0, 5);

  return (
    <div className="drive-thumb flex h-full w-full items-center justify-center overflow-hidden p-3">
      <div
        aria-hidden
        className="flex aspect-[210/297] h-full max-h-full flex-col gap-1 overflow-hidden border border-line bg-white p-2.5 shadow-[0_1px_2px_rgba(28,43,51,0.08),0_6px_14px_-6px_rgba(28,43,51,0.18)]"
      >
        <div className="flex items-baseline justify-between border-b border-ink/70 pb-1">
          <span className="font-serif text-[7px] font-bold text-ink">Ex. {record?.exercise_number || "—"}</span>
          <span className="font-mono text-[5px] text-ink-soft">{record?.date || ""}</span>
        </div>
        <p className="line-clamp-2 font-serif text-[8px] font-bold leading-tight text-ink">
          {record?.title || document.title}
        </p>
        {aim ? (
          <p className="line-clamp-4 text-[5.5px] leading-[1.45] text-ink-soft">{aim}</p>
        ) : (
          <div className="space-y-[3px] pt-0.5">
            <div className="h-[2px] w-full bg-line" />
            <div className="h-[2px] w-4/5 bg-line" />
          </div>
        )}
        {code.some((l) => l.trim()) && (
          <pre className="mt-0.5 overflow-hidden rounded-[2px] bg-paper p-1 font-mono text-[4.5px] leading-[1.4] text-ink-soft">
            {code.join("\n")}
          </pre>
        )}
      </div>
    </div>
  );
}

interface ItemActions {
  onSelect: () => void;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
}

function RowMenu({ onOpen, onRename, onDelete }: Pick<ItemActions, "onOpen" | "onRename" | "onDelete">) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function away(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [open]);

  const item =
    "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-ink-soft transition-colors hover:bg-accent-soft/50 hover:text-accent-ink";

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        aria-label="More actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-7 w-7 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-ink/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
      >
        <MoreVertical className="h-4 w-4" strokeWidth={2} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-8 z-20 w-40 rounded-xl border border-line bg-white p-1 shadow-lg"
        >
          <button role="menuitem" type="button" className={item} onClick={() => { setOpen(false); onOpen(); }}>
            <FolderOpen className="h-3.5 w-3.5" strokeWidth={2} /> Open in editor
          </button>
          <button role="menuitem" type="button" className={item} onClick={() => { setOpen(false); onRename(); }}>
            <Pencil className="h-3.5 w-3.5" strokeWidth={2} /> Rename
          </button>
          <button
            role="menuitem"
            type="button"
            className={`${item} hover:!bg-red-50 hover:!text-red-600`}
            onClick={() => { setOpen(false); onDelete(); }}
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={2} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

export function FileCard({
  document,
  selected,
  ...actions
}: { document: CloudDocument; selected: boolean } & ItemActions) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={actions.onSelect}
      onDoubleClick={actions.onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter") actions.onOpen();
        else if (e.key === " ") {
          e.preventDefault();
          actions.onSelect();
        }
      }}
      className={`group flex cursor-pointer flex-col overflow-hidden rounded-2xl border bg-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
        selected ? "border-accent bg-accent-soft/40 ring-1 ring-accent" : "border-line hover:border-accent/40"
      }`}
    >
      <div className="h-40 border-b border-line">
        <FileThumb document={document} />
      </div>
      <div className="flex items-center gap-2 py-2 pl-3 pr-1.5">
        <FileText className="h-4 w-4 shrink-0 text-accent" strokeWidth={2} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-ink">{document.title}</p>
          <p className="truncate text-[11px] text-ink-soft/70">Edited {relativeTime(document.updatedAt)}</p>
        </div>
        <RowMenu onOpen={actions.onOpen} onRename={actions.onRename} onDelete={actions.onDelete} />
      </div>
    </div>
  );
}

export function FileRow({
  document,
  selected,
  ...actions
}: { document: CloudDocument; selected: boolean } & ItemActions) {
  const record = document.data?.record;
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={actions.onSelect}
      onDoubleClick={actions.onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter") actions.onOpen();
        else if (e.key === " ") {
          e.preventDefault();
          actions.onSelect();
        }
      }}
      className={`grid cursor-pointer grid-cols-[1fr_auto] items-center gap-3 border-b border-line px-3 py-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent sm:grid-cols-[minmax(0,1fr)_90px_150px_auto] ${
        selected ? "bg-accent-soft/50" : "hover:bg-paper"
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <FileText className="h-4 w-4 shrink-0 text-accent" strokeWidth={2} />
        <p className="truncate text-[13px] font-semibold text-ink">{document.title}</p>
      </div>
      <p className="hidden truncate text-xs text-ink-soft sm:block">
        {record?.exercise_number ? `Ex. ${record.exercise_number}` : "—"}
      </p>
      <p className="hidden text-xs text-ink-soft sm:block">{relativeTime(document.updatedAt)}</p>
      <RowMenu onOpen={actions.onOpen} onRename={actions.onRename} onDelete={actions.onDelete} />
    </div>
  );
}
