"use client";

import { useState } from "react";
import { Check, Copy, Loader2, Share2 } from "lucide-react";
import { Modal, modalButton } from "./Modal";
import { createFolderShare } from "@/lib/folderShare";
import type { CloudDocument } from "@/lib/firestoreService";
import type { Folder } from "@/lib/folderService";
import { track } from "@/lib/analytics";

interface ShareFolderModalProps {
  folder: Folder;
  documents: CloudDocument[];
  onClose: () => void;
  onToast: (message: string) => void;
}

/** Makes one link for a whole subject folder. Nothing is published until "Create link" is pressed. */
export function ShareFolderModal({ folder, documents, onClose, onToast }: ShareFolderModalProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [done, setDone] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const count = documents.length;
  const records = `${count} ${count === 1 ? "record" : "records"}`;
  const busy = done !== null && !url;

  async function create() {
    setError("");
    setDone(0);
    try {
      setUrl(await createFolderShare(folder, documents, setDone));
      track("share_record", { kind: "folder" });
    } catch (err) {
      console.error("Folder share failed:", err);
      setDone(null);
      setError("Couldn't create the link. Check your connection and try again.");
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url!);
      setCopied(true);
      onToast("Link copied.");
    } catch {
      onToast("Unable to copy. Select the link and copy it.");
    }
  }

  async function send() {
    try {
      await navigator.share({ title: folder.name, url: url! });
    } catch (err) {
      if ((err as { name?: string })?.name !== "AbortError") await copy();
    }
  }

  const canSend = typeof navigator !== "undefined" && typeof navigator.share === "function";

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      icon={Share2}
      title="Share folder"
      description={`${folder.name}, ${records}`}
      footer={
        url ? (
          <>
            {canSend && (
              <button type="button" onClick={send} className={modalButton.secondary}>
                Send link
              </button>
            )}
            <button type="button" onClick={copy} className={`${modalButton.primary} flex items-center gap-1.5`}>
              {copied ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : <Copy className="h-3.5 w-3.5" strokeWidth={2.5} />}
              {copied ? "Copied" : "Copy link"}
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={onClose} className={modalButton.secondary}>
              Cancel
            </button>
            <button type="button" onClick={create} disabled={busy || count === 0} className={`${modalButton.primary} flex items-center gap-1.5`}>
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {busy ? `Adding ${done} of ${count}` : "Create link"}
            </button>
          </>
        )
      }
    >
      {url ? (
        <>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-ink-soft">Folder link</span>
            <input
              readOnly
              value={url}
              onFocus={(e) => e.currentTarget.select()}
              className="w-full rounded-xl border border-line bg-paper p-2.5 font-mono text-xs text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
            />
          </label>
          <p className="mt-3 text-sm text-ink-soft">To stop sharing, remove the link in Settings, under Account.</p>
        </>
      ) : count === 0 ? (
        <p className="text-sm text-ink-soft">This folder is empty. Add a record to it, then share.</p>
      ) : (
        <div className="space-y-2.5 text-sm leading-relaxed text-ink-soft">
          <p>
            Anyone with the link can read the {records} in this folder, including any name and register number written in them,
            and save their own copies. Your files can&rsquo;t be changed.
          </p>
          <p>The link shows the folder as it is now. After you edit a record, make a new link.</p>
          {error && (
            <p role="alert" className="font-semibold text-red-600">
              {error}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
