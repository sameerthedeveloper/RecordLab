"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ChevronRight, Loader2 } from "lucide-react";
import { AuthModal } from "./AuthModal";
import { ToastViewport, useToast } from "./Toast";
import { useAuthUser } from "@/lib/authService";
import { saveDocument } from "@/lib/firestoreService";
import { createFolder, setFolderLayout } from "@/lib/folderService";
import { loadFolderShare, type SharedFolder } from "@/lib/folderShare";
import { loadSharedRecord } from "@/lib/shareLink";
import { track } from "@/lib/analytics";

/** What someone sees when they open a folder link: the folder laid out like a record book's index page. */
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
        const payload = await loadSharedRecord(item.id);
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
    // The app locks body scrolling, so this page scrolls inside itself.
    <main className="h-full overflow-y-auto bg-paper px-4 pb-16 pt-[calc(env(safe-area-inset-top,0px)+20px)]">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="font-serif text-sm font-bold text-ink-soft hover:text-accent">
          Record Lab
        </Link>

        {folder === undefined && !failed && (
          <p role="status" className="mt-16 flex items-center justify-center gap-2 text-sm text-ink-soft">
            <Loader2 className="h-4 w-4 animate-spin" /> Opening folder
          </p>
        )}

        {failed && (
          <div className="mt-16 text-center">
            <p className="text-sm text-ink-soft">Couldn&rsquo;t open the folder. Check your connection.</p>
            <button type="button" onClick={load} className="ui-btn ui-btn-primary mt-4">
              Try again
            </button>
          </div>
        )}

        {folder === null && (
          <div className="mt-16 text-center">
            <h1 className="font-serif text-xl font-bold text-ink">This link doesn&rsquo;t open anything</h1>
            <p className="mt-2 text-sm text-ink-soft">The owner may have stopped sharing it. Ask them for a new link.</p>
            <Link href="/editor" className="ui-btn ui-btn-primary mt-5 inline-flex">
              Make your own record
            </Link>
          </div>
        )}

        {folder && (
          <article className="mt-5 rounded-lg border border-line bg-white px-4 py-6 shadow-sm sm:px-8 sm:py-9">
            <header className="border-b-2 border-ink pb-4">
              <h1 className="break-words font-serif text-3xl font-bold leading-tight tracking-tight text-ink">{folder.name}</h1>
              <p className="mt-1.5 text-sm text-ink-soft">
                {total} {total === 1 ? "record" : "records"}, shared with you. Open one to get your own editable copy.
              </p>
            </header>

            <table className="w-full table-fixed text-left">
              <thead>
                <tr className="border-b border-line text-xs text-ink-soft">
                  <th scope="col" className="w-14 py-2 font-semibold">Ex. no</th>
                  <th scope="col" className="py-2 font-semibold">Title</th>
                  <th scope="col" className="w-24 py-2 font-semibold max-sm:hidden">Date</th>
                  <th scope="col" className="w-6 py-2"><span className="sr-only">Open</span></th>
                </tr>
              </thead>
              <tbody>
                {folder.items.map((item) => (
                  <tr key={item.id} className="group relative border-b border-line text-sm text-ink hover:bg-accent-soft/40">
                    <td className="py-3 align-top font-mono text-xs leading-5 text-ink-soft">{item.exercise}</td>
                    <td className="break-words py-3 pr-2 align-top font-semibold">
                      {/* The link stretches over the whole row. */}
                      <a
                        href={`/editor?share=${item.id}`}
                        className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:outline-accent"
                      >
                        {item.title}
                      </a>
                    </td>
                    <td className="py-3 align-top text-xs leading-5 text-ink-soft max-sm:hidden">{item.date}</td>
                    <td className="py-3 align-top">
                      <ChevronRight aria-hidden className="h-5 w-4 text-ink-soft/50 group-hover:text-accent" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-6">
              {savedAs ? (
                <p role="status" className="text-sm text-ink">
                  Saved to your files as <strong>{savedAs}</strong>.{" "}
                  <Link href="/dashboard" className="font-semibold text-accent underline underline-offset-2">
                    Open your files
                  </Link>
                </p>
              ) : (
                <button type="button" onClick={saveAll} disabled={saving !== null || total === 0} className="ui-btn ui-btn-primary flex w-full items-center justify-center gap-2 max-sm:min-h-11 sm:w-auto">
                  {saving !== null && <Loader2 className="h-4 w-4 animate-spin" />}
                  {saving !== null ? `Saving ${saving} of ${total}` : user ? "Save folder to my files" : "Sign in to save this folder"}
                </button>
              )}
            </div>
          </article>
        )}
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onToast={showToast} />
      <ToastViewport toast={toast} />
    </main>
  );
}
