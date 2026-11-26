"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Download, FileText, Loader2 } from "lucide-react";
import { AccountMenu } from "./AccountMenu";
import { AuthModal } from "./AuthModal";
import { FileThumb } from "./CloudFileViews";
import { ToastViewport, useToast } from "./Toast";
import { useAuthUser } from "@/lib/authService";
import { saveDocument, type RlabPayload } from "@/lib/firestoreService";
import { createFolder, setFolderLayout } from "@/lib/folderService";
import { loadFolderShare, type SharedFolder } from "@/lib/folderShare";
import { loadSharedRecord } from "@/lib/shareLink";
import { track } from "@/lib/analytics";

/** What someone sees when they open a folder link: the folder, looking like a subject in "My records". */
export function SharedFolderClient({ id }: { id: string }) {
  const user = useAuthUser();
  const [folder, setFolder] = useState<SharedFolder | null | undefined>(undefined);
  const [failed, setFailed] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [saving, setSaving] = useState<number | null>(null);
  const [savedAs, setSavedAs] = useState<string | null>(null);
  const { toast, showToast } = useToast();

  const load = useCallback(() => {
    setFailed(false);
    setFolder(undefined);
    loadFolderShare(id)
      .then(setFolder)
      .catch((err) => {
        console.error("Failed to open shared folder:", err);
        setFailed(true);
      });
  }, [id]);
  useEffect(load, [load]);

  // The cards show at once from the link's index; each page preview fills in as its record arrives.
  const [payloads, setPayloads] = useState<Record<string, RlabPayload>>({});
  useEffect(() => {
    let live = true;
    folder?.items.forEach((item) => {
      loadSharedRecord(item.id)
        .then((p) => live && p && setPayloads((all) => ({ ...all, [item.id]: p })))
        .catch(() => {}); // the card keeps its plain preview
    });
    return () => {
      live = false;
    };
  }, [folder]);

  async function saveAll() {
    if (!user) return setAuthOpen(true);
    if (!folder || saving !== null) return;
    setSaving(0);
    let created: { id: string; name: string } | null = null;
    let count = 0;
    try {
      // The person may already have a subject with this name: number the copy instead of failing.
      for (let n = 1; !created; n++) {
        try {
          created = await createFolder(user.uid, n === 1 ? folder.name : `${folder.name.slice(0, 54)} (${n})`, folder.template);
        } catch (err) {
          if (n >= 20 || !(err instanceof Error) || !err.message.includes("already exists")) throw err;
        }
      }
      if (folder.layoutMode === "programming") await setFolderLayout(user.uid, created.id, { mode: "programming" });
      for (const item of folder.items) {
        const payload = payloads[item.id] ?? (await loadSharedRecord(item.id));
        if (!payload) continue;
        await saveDocument(payload, item.title, created.id);
        setSaving(++count);
      }
      setSavedAs(created.name);
      track("save_cloud");
    } catch (err) {
      console.error("Saving shared folder failed:", err);
      showToast(
        created
          ? `Saved ${count} of ${folder.items.length} to "${created.name}", then stopped. Check your connection.`
          : "Couldn't save the folder. Check your connection and try again."
      );
    } finally {
      setSaving(null);
    }
  }

  const total = folder?.items.length ?? 0;

  return (
    <main className="app-canvas flex h-full w-full flex-col gap-3.5 p-3.5 pt-[calc(env(safe-area-inset-top,0px)+14px)] md:p-4">
      <header className="ui-panel relative z-30 flex shrink-0 items-center justify-between gap-x-3 px-4 py-3 sm:items-end sm:px-5 sm:py-4">
        <div className="min-w-0">
          <Link
            href="/editor"
            className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-soft transition-colors hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent sm:mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.25} />
            Open Record Lab
          </Link>
          <h1 className="line-clamp-2 break-words font-serif text-xl font-bold leading-tight tracking-tight text-ink sm:text-2xl">
            {folder ? folder.name : "Shared folder"}
          </h1>
          <p className="mt-0.5 truncate text-xs text-ink-soft sm:text-sm">
            {folder ? `${total} ${total === 1 ? "record" : "records"} shared with you.` : failed ? "Not loaded." : folder === null ? "Link not found." : "Opening folder…"}
          </p>
        </div>
        <div className="shrink-0">
          <AccountMenu onToast={showToast} menuAlign="start" />
        </div>
      </header>

      <div className="ui-panel flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col bg-white">
          {folder && total > 0 && (
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-2.5 px-4 py-3 sm:px-5">
              <p className="text-xs text-ink-soft">
                {savedAs ? (
                  <span role="status">
                    Saved to your files as <strong className="text-ink">{savedAs}</strong>.
                  </span>
                ) : (
                  "Open a record to get your own editable copy."
                )}
              </p>
              {savedAs ? (
                <Link href="/dashboard" className="ui-btn ui-btn-primary flex items-center justify-center max-sm:min-h-11 max-sm:w-full">
                  Open your files
                </Link>
              ) : (
                <button type="button" onClick={saveAll} disabled={saving !== null} className="ui-btn ui-btn-primary flex items-center justify-center gap-2 max-sm:min-h-11 max-sm:w-full">
                  {saving !== null ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" strokeWidth={2.25} />}
                  {saving !== null ? `Saving ${saving} of ${total}` : user ? "Save folder to my files" : "Sign in to save this folder"}
                </button>
              )}
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] sm:px-5">
            {folder === undefined && !failed && (
              <div className="grid grid-cols-2 gap-3.5 pt-4 md:grid-cols-3 xl:grid-cols-5" aria-hidden>
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-52 animate-pulse rounded-2xl border border-line bg-paper" />
                ))}
              </div>
            )}

            {failed && (
              <div className="py-16 text-center">
                <p className="text-sm text-ink-soft">Couldn&rsquo;t open the folder. Check your connection.</p>
                <button type="button" onClick={load} className="ui-btn ui-btn-primary mt-4">
                  Try again
                </button>
              </div>
            )}

            {folder === null && (
              <div className="py-16 text-center">
                <h2 className="font-serif text-lg font-bold text-ink">This link doesn&rsquo;t open anything</h2>
                <p className="mt-1.5 text-sm text-ink-soft">The owner may have stopped sharing it. Ask them for a new link.</p>
                <Link href="/editor" className="ui-btn ui-btn-primary mt-5 inline-flex">
                  Make your own record
                </Link>
              </div>
            )}

            {folder && total === 0 && <p className="py-16 text-center text-sm text-ink-soft">This folder has no records.</p>}

            {folder && total > 0 && (
              <ul className="grid grid-cols-2 gap-3.5 pt-1 md:grid-cols-3 xl:grid-cols-5">
                {folder.items.map((item) => (
                  <li key={item.id} className="min-w-0">
                    <a
                      href={`/editor?share=${item.id}`}
                      className="flex flex-col overflow-hidden rounded-2xl border border-line bg-white transition-colors hover:border-accent/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                    >
                      <span className="block h-40 border-b border-line">
                        <FileThumb
                          document={{
                            title: item.title,
                            data: payloads[item.id] ?? ({ record: { exercise_number: item.exercise, date: item.date, title: item.title } } as RlabPayload),
                          }}
                        />
                      </span>
                      <span className="flex items-center gap-2 px-3 py-2">
                        <FileText className="h-4 w-4 shrink-0 text-accent" strokeWidth={2} />
                        <span className="min-w-0">
                          <span className="block truncate text-[13px] font-semibold text-ink">{item.title}</span>
                          <span className="block truncate text-[11px] text-ink-soft/70">{item.exercise ? `Ex. ${item.exercise}` : "No exercise number"}</span>
                        </span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onToast={showToast} />
      <ToastViewport toast={toast} />
    </main>
  );
}
