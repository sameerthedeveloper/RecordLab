"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Link2, Loader2, Trash2 } from "lucide-react";
import { listMyShareLinks, revokeShareLink, type ShareLinkInfo } from "@/lib/shareLink";

/** Settings → Account: every share link the user made, with copy and revoke. */
export function SharedLinks({ onToast }: { onToast: (message: string) => void }) {
  const [links, setLinks] = useState<ShareLinkInfo[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    listMyShareLinks()
      .then(setLinks)
      .catch(() => {
        setLinks([]);
        onToast("Unable to load your share links.");
      });
  }, [onToast]);

  useEffect(refresh, [refresh]);

  async function revoke(id: string) {
    setBusyId(id);
    try {
      await revokeShareLink(id);
      setLinks((prev) => prev?.filter((l) => l.id !== id) ?? null);
      onToast("Link revoked. It no longer opens.");
    } catch {
      onToast("Unable to revoke the link.");
    } finally {
      setBusyId(null);
    }
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      onToast("Link copied.");
    } catch {
      onToast("Unable to copy the link.");
    }
  }

  return (
    <section>
      <h3 className="mb-3 font-serif text-sm font-bold text-ink">Share links</h3>
      {links === null ? (
        <Loader2 className="h-4 w-4 animate-spin text-ink-soft" />
      ) : links.length === 0 ? (
        <p className="text-sm text-ink-soft">No links yet. Use the share button in the editor to make one.</p>
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line">
          {links.map((l) => (
            <li key={l.id} className="flex items-center gap-2 px-3 py-2">
              <Link2 className="h-3.5 w-3.5 shrink-0 text-accent" strokeWidth={2} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-ink">{l.title}</p>
                <p className="text-[11px] text-ink-soft/70">{l.createdAt ? l.createdAt.toLocaleDateString() : "Just now"}</p>
              </div>
              <button type="button" aria-label="Copy link" onClick={() => copy(l.url)} className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft hover:bg-ink/10">
                <Copy className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
              <button
                type="button"
                aria-label="Revoke link"
                disabled={busyId === l.id}
                onClick={() => revoke(l.id)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
              >
                {busyId === l.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
