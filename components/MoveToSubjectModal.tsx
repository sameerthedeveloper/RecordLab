"use client";

import { useEffect, useState } from "react";
import { Check, Folder, FolderInput, FolderPlus, Inbox } from "lucide-react";
import { Modal } from "./Modal";
import type { Folder as SubjectFolder } from "@/lib/folderService";

interface MoveToSubjectModalProps {
  open: boolean;
  onClose: () => void;
  fileTitle: string;
  folders: SubjectFolder[];
  /** Folder the file is in now; null = none. */
  currentId: string | null;
  onMove: (folderId: string | null) => void;
  /** Creates a subject and resolves to its id, or null if it failed. */
  onCreate: (name: string) => Promise<string | null>;
}

const row =
  "flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left text-[13px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent";

export function MoveToSubjectModal({ open, onClose, fileTitle, folders, currentId, onMove, onCreate }: MoveToSubjectModalProps) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setName("");
  }, [open]);

  async function createAndMove(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    const id = await onCreate(name);
    setBusy(false);
    if (id) onMove(id);
  }

  const option = (id: string | null, label: string, Icon: typeof Folder) => {
    const active = currentId === id;
    return (
      <button
        key={id ?? "none"}
        type="button"
        onClick={() => onMove(id)}
        aria-pressed={active}
        className={`${row} ${active ? "border-accent bg-accent-soft/50 text-accent-ink" : "border-line bg-white text-ink hover:border-accent/40"}`}
      >
        <Icon className="h-4 w-4 shrink-0 text-accent" strokeWidth={2} />
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {active && <Check className="h-4 w-4 shrink-0" strokeWidth={2.5} />}
      </button>
    );
  };

  return (
    <Modal open={open} onClose={onClose} title="Move to subject" description={fileTitle} icon={FolderInput} size="sm">
      <div className="space-y-2">
        {option(null, "No subject (All files)", Inbox)}
        {folders.map((f) => option(f.id, f.name, Folder))}

        <form onSubmit={createAndMove} className="flex gap-2 pt-2">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">New subject name</span>
            <FolderPlus className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft/50" />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              placeholder="New subject, e.g. Data Structures"
              className="w-full rounded-xl border border-line bg-white py-2.5 pl-9 pr-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-soft/50 focus:border-accent focus:ring-2 focus:ring-accent/15"
            />
          </label>
          <button
            type="submit"
            disabled={!name.trim() || busy}
            className="rounded-xl bg-accent px-3.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            Create
          </button>
        </form>
      </div>
    </Modal>
  );
}
