"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownAZ,
  Clock,
  Cloud,
  FilePlus2,
  FileText,
  LayoutGrid,
  List,
  LogIn,
  Maximize2,
  Search,
} from "lucide-react";
import Link from "next/link";
import { Modal, modalButton } from "./Modal";
import { FileCard, FileRow, FileThumb, relativeTime } from "./CloudFileViews";
import { DriveDetails } from "./DriveDetails";
import { deleteDocument, renameDocument, watchUserDocuments } from "@/lib/firestoreService";
import type { CloudDocument, RlabPayload } from "@/lib/firestoreService";
import { signInWithGoogle, useAuthUser } from "@/lib/authService";
import { track } from "@/lib/analytics";

interface DashboardModalProps {
  open: boolean;
  onClose: () => void;
  onLoad: (payload: RlabPayload) => void;
  onToast: (message: string) => void;
  /** Render inline as the /dashboard page body instead of a dialog. */
  embedded?: boolean;
  /** Fires with the live file list, so a host page can summarise it. */
  onDocuments?: (documents: CloudDocument[] | null) => void;
}

type View = "grid" | "list";
type Sort = "modified" | "name";
type Section = "all" | "recent";

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
  const [signingIn, setSigningIn] = useState(false);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<View>("grid");
  const [sort, setSort] = useState<Sort>("modified");
  const [section, setSection] = useState<Section>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<CloudDocument | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleting, setDeleting] = useState<CloudDocument | null>(null);

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
      if (!q) return true;
      const r = d.data?.record;
      return [d.title, r?.exercise_number, r?.rrn, r?.aim].some((v) => (v ?? "").toLowerCase().includes(q));
    });
    return [...list].sort((a, b) =>
      sort === "name" ? a.title.localeCompare(b.title, undefined, { numeric: true }) : time(b) - time(a),
    );
  }, [documents, query, section, sort]);

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

  async function handleSignIn() {
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error("Google sign-in failed:", err);
      onToast("Unable to sign in with Google.");
    } finally {
      setSigningIn(false);
    }
  }

  function handleLoad(doc: CloudDocument) {
    onLoad(doc.data);
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
            <p className="mt-auto hidden px-3.5 pt-4 text-xs text-ink-soft/70 md:block">
              {total} {total === 1 ? "file" : "files"} in the cloud
            </p>
          )}
        </nav>

        {/* Main */}
        <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-white">
          {user && (
            <div className="flex shrink-0 items-center justify-between gap-2 px-4 py-2.5 sm:px-5">
              <p className="font-serif text-[15px] font-bold text-ink">
                {section === "recent" ? "Recent" : "All files"}
              </p>
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
                  onClick={handleSignIn}
                  disabled={signingIn}
                  className="mt-1 flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-accent-hover disabled:opacity-60"
                >
                  <LogIn className="h-3.5 w-3.5" strokeWidth={2.5} />
                  {signingIn ? "Signing in…" : "Sign in with Google"}
                </button>
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
                  {query ? `Nothing matches "${query}"` : "Nothing edited this week"}
                </p>
                <p className="text-sm text-ink-soft/80">
                  {query
                    ? "Check the spelling or try the exercise number."
                    : "Switch to All files to see older records."}
                </p>
              </div>
            )}

            {user && latest && !query && section === "all" && (
              <div className="mb-5 mt-1 flex items-center gap-4 overflow-hidden rounded-2xl border border-line bg-paper pr-4">
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
                      <div className="overflow-hidden rounded-2xl border border-line">
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
        <div className="relative flex h-full w-full min-h-0 flex-col overflow-hidden rounded-2xl border border-line bg-paper">
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
