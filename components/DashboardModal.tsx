"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownAZ,
  Clock,
  Cloud,
  FilePlus2,
  FileText,
  Folder as FolderIcon,
  FolderPlus,
  LayoutGrid,
  List,
  LogIn,
  Maximize2,
  Pencil,
  Search,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { Modal, modalButton } from "./Modal";
import { FILE_DRAG_TYPE, FileCard, FileRow, FileThumb, relativeTime } from "./CloudFileViews";
import { MoveToSubjectModal } from "./MoveToSubjectModal";
import { DriveDetails } from "./DriveDetails";
import { deleteDocument, moveDocument, renameDocument, watchUserDocuments } from "@/lib/firestoreService";
import { createFolder, deleteFolder, renameFolder, useFolders, type Folder } from "@/lib/folderService";
import type { CloudDocument, RlabPayload } from "@/lib/firestoreService";
import { useAuthUser } from "@/lib/authService";
import { AuthModal } from "./AuthModal";
import { track } from "@/lib/analytics";

interface DashboardModalProps {
  open: boolean;
  onClose: () => void;
  /** `docId` lets the editor update this file on later saves instead of creating a copy. */
  onLoad: (payload: RlabPayload, docId: string, folderId: string | null) => void;
  onToast: (message: string) => void;
  /** Render inline as the /dashboard page body instead of a dialog. */
  embedded?: boolean;
  /** Fires with the live file list, so a host page can summarise it. */
  onDocuments?: (documents: CloudDocument[] | null) => void;
}

type View = "grid" | "list";
type Sort = "modified" | "name";
/** "all", "recent", or `f:<folderId>` for one subject. */
type Section = string;

const DAY = 24 * 60 * 60 * 1000;

function time(doc: CloudDocument): number {
  return (doc.updatedAt ?? doc.createdAt)?.toMillis() ?? Date.now();
}

function groupLabel(doc: CloudDocument): string {
  const age = Date.now() - time(doc);
  if (age < DAY) return "Today";
  if (age < 7 * DAY) return "Earlier this week";
  return "Older";
}

export function DashboardModal({
  open,
  onClose,
  onLoad,
  onToast,
  embedded = false,
  onDocuments,
}: DashboardModalProps) {
  const user = useAuthUser();
  const [documents, setDocuments] = useState<CloudDocument[] | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<View>("grid");
  const [sort, setSort] = useState<Sort>("modified");
  const [section, setSection] = useState<Section>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<CloudDocument | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleting, setDeleting] = useState<CloudDocument | null>(null);
  const folders = useFolders();
  const [moving, setMoving] = useState<CloudDocument | null>(null);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renamingFolder, setRenamingFolder] = useState<Folder | null>(null);
  const [folderRenameValue, setFolderRenameValue] = useState("");
  const [deletingFolder, setDeletingFolder] = useState<Folder | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const folderId = section.startsWith("f:") ? section.slice(2) : null;
  const activeFolder = folderId ? (folders ?? []).find((f) => f.id === folderId) ?? null : null;

  // The open subject was deleted (here or elsewhere): fall back to All files.
  useEffect(() => {
    if (folderId && folders && !activeFolder) setSection("all");
  }, [folderId, folders, activeFolder]);

  useEffect(() => {
    onDocuments?.(documents);
  }, [documents, onDocuments]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("recordlab.driveView");
      if (saved === "grid" || saved === "list") setView(saved);
    } catch {}
  }, []);

  function changeView(next: View) {
    setView(next);
    try {
      localStorage.setItem("recordlab.driveView", next);
    } catch {}
  }

  useEffect(() => {
    if (!open || !user) return;
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    watchUserDocuments(
      (docs) => setDocuments(docs),
      (err) => {
        console.error("Failed to load documents:", err);
        onToast("Unable to load your files. Refresh and try again.");
        setDocuments([]);
      },
    ).then((unsub) => {
      if (cancelled) unsub();
      else unsubscribe = unsub;
    });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [open, user, onToast]);

  const visible = useMemo(() => {
    if (!documents) return [];
    const q = query.trim().toLowerCase();
    const list = documents.filter((d) => {
      if (section === "recent" && Date.now() - time(d) > 7 * DAY) return false;
      if (folderId && d.folderId !== folderId) return false;
      if (!q) return true;
      const r = d.data?.record;
      return [d.title, r?.exercise_number, r?.rrn, r?.aim].some((v) => (v ?? "").toLowerCase().includes(q));
    });
    return [...list].sort((a, b) =>
      sort === "name" ? a.title.localeCompare(b.title, undefined, { numeric: true }) : time(b) - time(a),
    );
  }, [documents, query, section, folderId, sort]);

  const groups = useMemo(() => {
    if (sort === "name") return [{ label: "", docs: visible }];
    const map = new Map<string, CloudDocument[]>();
    for (const d of visible) {
      const label = groupLabel(d);
      map.set(label, [...(map.get(label) ?? []), d]);
    }
    return [...map.entries()].map(([label, docs]) => ({ label, docs }));
  }, [visible, sort]);

  const latest = useMemo(
    () => (documents && documents.length ? [...documents].sort((a, b) => time(b) - time(a))[0] : null),
    [documents],
  );
  const selected = documents?.find((d) => d.id === selectedId) ?? null;

  if (!open) return null;

  function handleLoad(doc: CloudDocument) {
    onLoad(doc.data, doc.id, doc.folderId);
    track("load_cloud");
    if (!embedded) onClose();
  }

  async function confirmDelete() {
    if (!deleting) return;
    const doc = deleting;
    setDeleting(null);
    try {
      await deleteDocument(doc.id);
      if (selectedId === doc.id) setSelectedId(null);
      onToast(`Deleted "${doc.title}".`);
      track("delete_cloud_document");
    } catch (err) {
      console.error("Delete failed:", err);
      onToast("Unable to delete this file.");
    }
  }

  async function confirmRename() {
    if (!renaming) return;
    const doc = renaming;
    setRenaming(null);
    if (renameValue.trim() === doc.title) return;
    try {
      await renameDocument(doc.id, renameValue);
      onToast(`Renamed to "${renameValue.trim() || "Untitled"}".`);
    } catch (err) {
      console.error("Rename failed:", err);
      onToast("Unable to rename this file.");
    }
  }

  function startRename(doc: CloudDocument) {
    setRenameValue(doc.title);
    setRenaming(doc);
  }

  const total = documents?.length ?? 0;
  const countIn = (id: string) => (documents ?? []).filter((d) => d.folderId === id).length;

  async function addFolder(name: string): Promise<string | null> {
    if (!user) return null;
    try {
      const f = await createFolder(user.uid, name);
      track("create_subject");
      onToast(`Created "${f.name}".`);
      return f.id;
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Unable to create the subject.");
      return null;
    }
  }

  async function moveTo(doc: CloudDocument, target: string | null) {
    if (doc.folderId === target) return;
    try {
      await moveDocument(doc.id, target);
      track("move_to_subject");
      const name = (folders ?? []).find((f) => f.id === target)?.name;
      onToast(target ? `Moved to ${name ?? "subject"}.` : "Moved to All files.");
    } catch (err) {
      console.error("Move failed:", err);
      onToast("Unable to move this file.");
    }
  }

  async function confirmRenameFolder() {
    if (!renamingFolder || !user) return;
    const f = renamingFolder;
    try {
      await renameFolder(user.uid, f.id, folderRenameValue);
      setRenamingFolder(null);
      onToast("Subject renamed.");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Unable to rename the subject.");
    }
  }

  async function confirmDeleteFolder() {
    if (!deletingFolder || !user) return;
    const f = deletingFolder;
    setDeletingFolder(null);
    try {
      await deleteFolder(user.uid, f.id);
      onToast(`Deleted "${f.name}". Its files are in All files.`);
    } catch (err) {
      console.error("Delete subject failed:", err);
      onToast("Unable to delete the subject.");
    }
  }

  /** Drop handlers so a file can be dragged onto a subject (null = back to All files). */
  function dropProps(target: string | null, key: string) {
    return {
      onDragOver: (e: React.DragEvent) => {
        if (!e.dataTransfer.types.includes(FILE_DRAG_TYPE)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDropTarget(key);
      },
      onDragLeave: () => setDropTarget((cur) => (cur === key ? null : cur)),
      onDrop: (e: React.DragEvent) => {
        const id = e.dataTransfer.getData(FILE_DRAG_TYPE);
        setDropTarget(null);
        const doc = (documents ?? []).find((d) => d.id === id);
        if (doc) {
          e.preventDefault();
          moveTo(doc, target);
        }
      },
    };
  }
  const navItem = (id: Section, label: string, Icon: typeof Cloud) => (
    <button
      type="button"
      onClick={() => setSection(id)}
      aria-current={section === id ? "page" : undefined}
      className={`flex shrink-0 items-center gap-2.5 rounded-full px-3.5 py-2 text-[13px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
        section === id ? "bg-accent-soft text-accent-ink" : "text-ink-soft hover:bg-ink/5"
      }`}
    >
      <Icon className="h-4 w-4" strokeWidth={2} />
      {label}
    </button>
  );

  const actions = (doc: CloudDocument) => ({
    onSelect: () => setSelectedId(doc.id),
    onOpen: () => handleLoad(doc),
    onRename: () => startRename(doc),
    onMove: () => setMoving(doc),
    onDelete: () => setDeleting(doc),
  });

  const browser = (
    <>
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {/* Sidebar */}
        <nav
          aria-label="File sections"
          className="flex shrink-0 gap-1 overflow-x-auto border-b border-line px-3 py-2 md:w-56 md:flex-col md:overflow-visible md:border-b-0 md:border-r md:p-3"
        >
          <button
            type="button"
            onClick={onClose}
            className="mb-1 hidden items-center gap-2.5 rounded-2xl border border-line bg-white px-4 py-3 text-[13px] font-semibold text-ink shadow-sm transition-colors hover:border-accent/40 hover:text-accent md:flex"
          >
            <FilePlus2 className="h-4 w-4 text-accent" strokeWidth={2} />
            New record
          </button>
          {navItem("all", "All files", FileText)}
          {navItem("recent", "Recent", Clock)}
          {user && (
            <>
              <div className="hidden items-center justify-between px-3.5 pb-1 pt-4 md:flex">
                <span className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-ink-soft/60">Subjects</span>
                <button
                  type="button"
                  aria-label="New subject"
                  title="New subject"
                  onClick={() => setNewFolderOpen(true)}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-ink/10 hover:text-accent"
                >
                  <FolderPlus className="h-3.5 w-3.5" strokeWidth={2.25} />
                </button>
              </div>
              {(folders ?? []).map((f) => (
                <div key={f.id} {...dropProps(f.id, `side:${f.id}`)} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => setSection(`f:${f.id}`)}
                    aria-current={section === `f:${f.id}` ? "page" : undefined}
                    className={`flex w-full shrink-0 items-center gap-2.5 rounded-full px-3.5 py-2 text-[13px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
                      section === `f:${f.id}` ? "bg-accent-soft text-accent-ink" : "text-ink-soft hover:bg-ink/5"
                    } ${dropTarget === `side:${f.id}` ? "bg-accent-soft ring-2 ring-accent" : ""}`}
                  >
                    <FolderIcon className="h-4 w-4 shrink-0" strokeWidth={2} />
                    <span className="min-w-0 flex-1 truncate text-left">{f.name}</span>
                    <span className="hidden font-mono text-[10px] font-medium opacity-60 md:inline">{countIn(f.id)}</span>
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setNewFolderOpen(true)}
                className="flex shrink-0 items-center gap-2 rounded-full border border-dashed border-line px-3.5 py-2 text-[13px] font-semibold text-ink-soft transition-colors hover:border-accent/50 hover:text-accent md:hidden"
              >
                <FolderPlus className="h-4 w-4" strokeWidth={2} />
                Subject
              </button>
            </>
          )}
          {user && (
            <p className="mt-auto hidden px-3.5 pt-4 text-xs text-ink-soft/70 md:block">
              {total} {total === 1 ? "file" : "files"} in the cloud
            </p>
          )}
        </nav>

        {/* Main */}
        <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-white">
          {user && (
            <div className="flex shrink-0 items-center justify-between gap-2 px-4 py-2.5 sm:px-5">
              <div className="flex min-w-0 items-center gap-2">
                {activeFolder && (
                  <button
                    type="button"
                    onClick={() => setSection("all")}
                    className="shrink-0 text-xs font-semibold text-ink-soft transition-colors hover:text-accent"
                  >
                    All files /
                  </button>
                )}
                <p className="truncate font-serif text-[15px] font-bold text-ink">
                  {activeFolder ? activeFolder.name : section === "recent" ? "Recent" : "All files"}
                </p>
                {activeFolder && (
                  <>
                    <button
                      type="button"
                      aria-label="Rename subject"
                      title="Rename subject"
                      onClick={() => {
                        setFolderRenameValue(activeFolder.name);
                        setRenamingFolder(activeFolder);
                      }}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-ink/10 hover:text-accent"
                    >
                      <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                    <button
                      type="button"
                      aria-label="Delete subject"
                      title="Delete subject"
                      onClick={() => setDeletingFolder(activeFolder)}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                  </>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSort(sort === "modified" ? "name" : "modified")}
                  className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:border-accent/40 hover:text-accent"
                >
                  {sort === "modified" ? (
                    <Clock className="h-3.5 w-3.5" strokeWidth={2} />
                  ) : (
                    <ArrowDownAZ className="h-3.5 w-3.5" strokeWidth={2} />
                  )}
                  {sort === "modified" ? "Last edited" : "Name"}
                </button>
                <div
                  className="flex overflow-hidden rounded-full border border-line"
                  role="group"
                  aria-label="View"
                >
                  {(["grid", "list"] as const).map((v) => {
                    const Icon = v === "grid" ? LayoutGrid : List;
                    return (
                      <button
                        key={v}
                        type="button"
                        aria-pressed={view === v}
                        aria-label={v === "grid" ? "Grid view" : "List view"}
                        onClick={() => changeView(v)}
                        className={`px-2.5 py-1.5 transition-colors ${
                          view === v ? "bg-accent-soft text-accent-ink" : "text-ink-soft hover:bg-ink/5"
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 sm:px-5">
            {!user && (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <Cloud className="h-10 w-10 text-accent/60" strokeWidth={1.5} />
                <p className="font-serif text-lg font-bold text-ink">Sign in to see your files</p>
                <p className="max-w-xs text-sm text-ink-soft/80">
                  Records you save to the cloud live here, on every device you sign in from.
                </p>
                <button
                  type="button"
                  onClick={() => setAuthOpen(true)}
                  className="mt-1 flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-accent-hover"
                >
                  <LogIn className="h-3.5 w-3.5" strokeWidth={2.5} />
                  Sign in
                </button>
                <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onToast={onToast} />
              </div>
            )}

            {user && documents === null && (
              <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 xl:grid-cols-4">
                {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <div key={i} className="h-[212px] animate-pulse rounded-2xl border border-line bg-paper" />
                ))}
              </div>
            )}

            {user && documents !== null && total === 0 && (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                <FileText className="h-10 w-10 text-accent/60" strokeWidth={1.5} />
                <p className="font-serif text-lg font-bold text-ink">No files yet</p>
                <p className="max-w-xs text-sm text-ink-soft/80">
                  Choose Save to Cloud in the editor and your record shows up here.
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-1 rounded-xl border border-line px-4 py-2 text-xs font-semibold text-ink-soft transition-colors hover:border-accent/40 hover:text-accent"
                >
                  Back to editor
                </button>
              </div>
            )}

            {user && total > 0 && visible.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
                <Search className="h-8 w-8 text-ink-soft/40" strokeWidth={1.5} />
                <p className="font-serif text-base font-bold text-ink">
                  {query ? `Nothing matches "${query}"` : activeFolder ? "No files in this subject yet" : "Nothing edited this week"}
                </p>
                <p className="text-sm text-ink-soft/80">
                  {query
                    ? "Check the spelling or try the exercise number."
                    : activeFolder
                      ? "Drag a file here, or use ⋮ → Move to subject."
                      : "Switch to All files to see older records."}
                </p>
              </div>
            )}

            {user && latest && !query && section === "all" && (
              <div className="ui-card mb-5 mt-1 flex items-center gap-4 overflow-hidden pr-4">
                <div className="h-32 w-28 shrink-0 border-r border-line sm:w-36">
                  <FileThumb document={latest} />
                </div>
                <div className="min-w-0 flex-1 py-3">
                  <p className="text-xs text-ink-soft/70">Pick up where you left off</p>
                  <p className="mt-0.5 truncate font-serif text-lg font-bold text-ink">{latest.title}</p>
                  <p className="text-xs text-ink-soft/80">
                    {latest.data?.record?.exercise_number
                      ? `Exercise ${latest.data.record.exercise_number}, `
                      : ""}
                    edited {relativeTime(latest.updatedAt)}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleLoad(latest)}
                    className="mt-2.5 rounded-xl bg-accent px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    Continue editing
                  </button>
                </div>
              </div>
            )}

            {user && section === "all" && !query && (folders?.length ?? 0) > 0 && (
              <section aria-label="Subjects" className="mb-5">
                <h3 className="mb-2 text-xs font-semibold text-ink-soft/80">Subjects</h3>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                  {(folders ?? []).map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setSection(`f:${f.id}`)}
                      {...dropProps(f.id, `card:${f.id}`)}
                      className={`group flex items-center gap-3 rounded-2xl border bg-paper px-3.5 py-3 text-left transition-colors hover:border-accent/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
                        dropTarget === `card:${f.id}` ? "border-accent bg-accent-soft/60 ring-2 ring-accent" : "border-line"
                      }`}
                    >
                      <FolderIcon className="h-7 w-7 shrink-0 fill-accent-soft text-accent" strokeWidth={1.75} />
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-semibold text-ink">{f.name}</span>
                        <span className="block text-[11px] text-ink-soft/70">
                          {countIn(f.id)} {countIn(f.id) === 1 ? "file" : "files"}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {user && visible.length > 0 && (
              <div className="space-y-5 pt-1">
                {groups.map((g) => (
                  <section key={g.label || "all"} aria-label={g.label || undefined}>
                    {g.label && <h3 className="mb-2 text-xs font-semibold text-ink-soft/80">{g.label}</h3>}
                    {view === "grid" ? (
                      <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 xl:grid-cols-4">
                        {g.docs.map((d) => (
                          <FileCard key={d.id} document={d} selected={d.id === selectedId} {...actions(d)} />
                        ))}
                      </div>
                    ) : (
                      <div className="ui-card overflow-hidden">
                        {g.docs.map((d) => (
                          <FileRow key={d.id} document={d} selected={d.id === selectedId} {...actions(d)} />
                        ))}
                      </div>
                    )}
                  </section>
                ))}
              </div>
            )}
          </div>
        </main>

        {selected && (
          <div className="hidden lg:flex">
            <DriveDetails
              document={selected}
              onClose={() => setSelectedId(null)}
              onOpen={() => handleLoad(selected)}
              onRename={() => startRename(selected)}
              onDelete={() => setDeleting(selected)}
            />
          </div>
        )}
      </div>

      {/* Small screens: action bar for the selected file (no side panel) */}
      {selected && (
        <div className="flex shrink-0 items-center gap-2 border-t border-line bg-paper px-4 py-2.5 lg:hidden">
          <p className="min-w-0 flex-1 truncate text-xs font-semibold text-ink">{selected.title}</p>
          <button
            type="button"
            onClick={() => handleLoad(selected)}
            className="rounded-xl bg-accent px-3 py-2 text-xs font-semibold text-white"
          >
            Open
          </button>
          <button
            type="button"
            onClick={() => startRename(selected)}
            className="rounded-xl border border-line bg-white px-3 py-2 text-xs font-semibold text-ink-soft"
          >
            Rename
          </button>
          <button
            type="button"
            onClick={() => setDeleting(selected)}
            className="rounded-xl border border-line bg-white px-3 py-2 text-xs font-semibold text-red-600"
          >
            Delete
          </button>
        </div>
      )}
    </>
  );

  const dialogs = (
    <>
      <Modal
        open={newFolderOpen}
        onClose={() => setNewFolderOpen(false)}
        title="New subject"
        description="A folder for one subject's records."
        icon={FolderPlus}
        size="sm"
        footer={
          <>
            <button type="button" onClick={() => setNewFolderOpen(false)} className={modalButton.secondary}>
              Cancel
            </button>
            <button type="submit" form="new-subject-form" className={modalButton.primary}>
              Create
            </button>
          </>
        }
      >
        <form
          id="new-subject-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const id = await addFolder(newFolderName);
            if (id) {
              setNewFolderName("");
              setNewFolderOpen(false);
              setSection(`f:${id}`);
            }
          }}
        >
          <label htmlFor="new-subject-input" className="mb-1 block text-xs font-semibold text-ink-soft">
            Subject name
          </label>
          <input
            id="new-subject-input"
            autoFocus
            maxLength={60}
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Data Structures"
            className="w-full rounded-xl border border-line bg-white p-2.5 text-sm text-ink outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/15"
          />
        </form>
      </Modal>

      <Modal
        open={renamingFolder !== null}
        onClose={() => setRenamingFolder(null)}
        title="Rename subject"
        size="sm"
        footer={
          <>
            <button type="button" onClick={() => setRenamingFolder(null)} className={modalButton.secondary}>
              Cancel
            </button>
            <button type="submit" form="rename-subject-form" className={modalButton.primary}>
              Rename
            </button>
          </>
        }
      >
        <form
          id="rename-subject-form"
          onSubmit={(e) => {
            e.preventDefault();
            confirmRenameFolder();
          }}
        >
          <label htmlFor="rename-subject-input" className="mb-1 block text-xs font-semibold text-ink-soft">
            Subject name
          </label>
          <input
            id="rename-subject-input"
            autoFocus
            maxLength={60}
            value={folderRenameValue}
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => setFolderRenameValue(e.target.value)}
            className="w-full rounded-xl border border-line bg-white p-2.5 text-sm text-ink outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/15"
          />
        </form>
      </Modal>

      <Modal
        open={deletingFolder !== null}
        onClose={() => setDeletingFolder(null)}
        role="alertdialog"
        title="Delete this subject?"
        size="sm"
        footer={
          <>
            <button type="button" autoFocus onClick={() => setDeletingFolder(null)} className={modalButton.secondary}>
              Cancel
            </button>
            <button type="button" onClick={confirmDeleteFolder} className={modalButton.danger}>
              Delete subject
            </button>
          </>
        }
      >
        <p className="text-sm text-ink">
          &ldquo;{deletingFolder?.name}&rdquo; will be removed. Its files are <strong>not</strong> deleted; they move back
          to All files.
        </p>
      </Modal>

      <MoveToSubjectModal
        open={moving !== null}
        onClose={() => setMoving(null)}
        fileTitle={moving?.title ?? ""}
        folders={folders ?? []}
        currentId={moving?.folderId ?? null}
        onCreate={addFolder}
        onMove={(target) => {
          if (moving) moveTo(moving, target);
          setMoving(null);
        }}
      />

      <Modal
        open={renaming !== null}
        onClose={() => setRenaming(null)}
        title="Rename file"
        size="sm"
        footer={
          <>
            <button type="button" onClick={() => setRenaming(null)} className={modalButton.secondary}>
              Cancel
            </button>
            <button type="submit" form="rename-form" className={modalButton.primary}>
              Rename
            </button>
          </>
        }
      >
        <form
          id="rename-form"
          onSubmit={(e) => {
            e.preventDefault();
            confirmRename();
          }}
        >
          <label htmlFor="rename-input" className="mb-1 block text-xs font-semibold text-ink-soft">
            File name
          </label>
          <input
            id="rename-input"
            autoFocus
            value={renameValue}
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => setRenameValue(e.target.value)}
            className="w-full rounded-xl border border-line bg-white p-2.5 text-sm text-ink outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/15"
          />
        </form>
      </Modal>

      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        role="alertdialog"
        title="Delete this file?"
        size="sm"
        footer={
          <>
            <button
              type="button"
              autoFocus
              onClick={() => setDeleting(null)}
              className={modalButton.secondary}
            >
              Cancel
            </button>
            <button type="button" onClick={confirmDelete} className={modalButton.danger}>
              Delete
            </button>
          </>
        }
      >
        <p className="text-sm text-ink">
          &ldquo;{deleting?.title}&rdquo; will be removed from the cloud for good. You can&rsquo;t undo this.
        </p>
      </Modal>
    </>
  );

  if (embedded) {
    return (
      <>
        <div className="ui-panel relative flex h-full w-full min-h-0 flex-col overflow-hidden">
          <header className="flex shrink-0 items-center border-b border-line px-4 py-3 sm:px-5">
            <label className="relative flex w-full max-w-xl items-center">
              <Search
                className="pointer-events-none absolute left-3.5 h-4 w-4 text-ink-soft/60"
                strokeWidth={2}
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by title, exercise or aim"
                disabled={!user}
                className="w-full rounded-full border border-transparent bg-ink/[0.05] py-2 pl-10 pr-4 text-sm text-ink outline-none transition-colors placeholder:text-ink-soft/60 focus:border-accent/50 focus:bg-white disabled:opacity-50"
              />
            </label>
          </header>
          {browser}
        </div>
        {dialogs}
      </>
    );
  }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="My files"
        icon={Cloud}
        size="xl"
        fullHeight
        headerContent={
          <label className="relative flex w-full max-w-xl items-center">
            <Search
              className="pointer-events-none absolute left-3.5 h-4 w-4 text-ink-soft/60"
              strokeWidth={2}
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title, exercise or aim"
              disabled={!user}
              className="w-full rounded-full border border-transparent bg-ink/[0.05] py-2 pl-10 pr-4 text-sm text-ink outline-none transition-colors placeholder:text-ink-soft/60 focus:border-accent/50 focus:bg-white disabled:opacity-50"
            />
          </label>
        }
        headerActions={
          <Link
            href="/dashboard"
            aria-label="Open the full dashboard"
            title="Open the full dashboard"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-ink/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          >
            <Maximize2 className="h-4 w-4" strokeWidth={2} />
          </Link>
        }
        bodyClassName="flex flex-col bg-paper p-0"
      >
        {browser}
      </Modal>
      {dialogs}
    </>
  );
}
