"use client";

import { useEffect, useState } from "react";
import { Cloud, LogIn, X } from "lucide-react";
import { CloudDocumentCard } from "./CloudDocumentCard";
import { CloudDocumentModal } from "./CloudDocumentModal";
import { deleteDocument, watchUserDocuments } from "@/lib/firestoreService";
import type { CloudDocument, RlabPayload } from "@/lib/firestoreService";
import { signInWithGoogle, useAuthUser } from "@/lib/authService";
import { track } from "@/lib/analytics";

interface DashboardModalProps {
  open: boolean;
  onClose: () => void;
  onLoad: (payload: RlabPayload) => void;
  onToast: (message: string) => void;
}

export function DashboardModal({ open, onClose, onLoad, onToast }: DashboardModalProps) {
  const user = useAuthUser();
  const [documents, setDocuments] = useState<CloudDocument[] | null>(null);
  const [openDocument, setOpenDocument] = useState<CloudDocument | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    let unsubscribe: (() => void) | undefined;
    watchUserDocuments(
      (docs) => setDocuments(docs),
      (err) => {
        console.error("Failed to load documents:", err);
        onToast("Unable to load your documents. Please refresh.");
        setDocuments([]);
      }
    ).then((unsub) => {
      unsubscribe = unsub;
    });
    return () => unsubscribe?.();
  }, [open, user, onToast]);

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

  function handleLoad(document: CloudDocument) {
    onLoad(document.data);
    track("load_cloud");
    onClose();
  }

  async function handleDelete(document: CloudDocument) {
    if (!window.confirm(`Delete "${document.title}"? This can't be undone.`)) return;
    try {
      await deleteDocument(document.id);
      onToast("Document deleted.");
      track("delete_cloud_document");
    } catch (err) {
      console.error("Delete failed:", err);
      onToast("Unable to delete this document.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-3 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex w-full max-w-3xl max-h-[85vh] flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-line p-4">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">
              Lab Notebook
            </p>
            <h2 className="font-serif text-lg font-bold text-ink">My Documents</h2>
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
          {!user && (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line bg-white py-16 text-center">
              <Cloud className="h-8 w-8 text-ink-soft/40" strokeWidth={1.5} />
              <p className="text-sm font-semibold text-ink">Sign in to see your documents</p>
              <p className="max-w-xs text-xs text-ink-soft/70">
                Cloud documents are tied to your Google account.
              </p>
              <button
                type="button"
                onClick={handleSignIn}
                disabled={signingIn}
                className="flex items-center gap-1.5 rounded-xl bg-accent px-3 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-accent-hover disabled:opacity-60"
              >
                <LogIn className="h-3.5 w-3.5" strokeWidth={2.5} />
                {signingIn ? "Signing in…" : "Sign in with Google"}
              </button>
            </div>
          )}

          {user && documents === null && (
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-[104px] animate-pulse rounded-2xl border border-line bg-white shadow-sm"
                />
              ))}
            </div>
          )}

          {user && documents !== null && documents.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line bg-white py-16 text-center">
              <Cloud className="h-8 w-8 text-ink-soft/40" strokeWidth={1.5} />
              <p className="text-sm font-semibold text-ink">No documents yet</p>
              <p className="max-w-xs text-xs text-ink-soft/70">
                Use &ldquo;Save to Cloud&rdquo; in the editor to save a record here.
              </p>
            </div>
          )}

          {user && documents !== null && documents.length > 0 && (
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
              {documents.map((doc) => (
                <CloudDocumentCard
                  key={doc.id}
                  document={doc}
                  onOpen={() => setOpenDocument(doc)}
                  onLoad={() => handleLoad(doc)}
                  onDelete={() => handleDelete(doc)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <CloudDocumentModal
        document={openDocument}
        onClose={() => setOpenDocument(null)}
        onLoad={() => {
          if (openDocument) handleLoad(openDocument);
        }}
      />
    </div>
  );
}
