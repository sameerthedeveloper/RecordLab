"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Cloud } from "lucide-react";
import { CloudDocumentCard } from "@/components/CloudDocumentCard";
import { CloudDocumentModal } from "@/components/CloudDocumentModal";
import { AccountMenu } from "@/components/AccountMenu";
import { ToastViewport, useToast } from "@/components/Toast";
import { deleteDocument, watchUserDocuments } from "@/lib/firestoreService";
import type { CloudDocument } from "@/lib/firestoreService";
import { stashCloudLoad } from "@/lib/cloudBridge";
import { track } from "@/lib/analytics";

export default function DashboardPage() {
  const router = useRouter();
  const { toast, showToast } = useToast();

  const [documents, setDocuments] = useState<CloudDocument[] | null>(null);
  const [openDocument, setOpenDocument] = useState<CloudDocument | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    watchUserDocuments(
      (docs) => setDocuments(docs),
      (err) => {
        console.error("Failed to load documents:", err);
        showToast("Unable to load your documents. Please refresh.");
        setDocuments([]);
      }
    ).then((unsub) => {
      unsubscribe = unsub;
    });
    return () => unsubscribe?.();
  }, [showToast]);

  function handleLoad(document: CloudDocument) {
    stashCloudLoad(document.data);
    router.push("/");
  }

  async function handleDelete(document: CloudDocument) {
    if (!window.confirm(`Delete "${document.title}"? This can't be undone.`)) return;
    try {
      await deleteDocument(document.id);
      showToast("Document deleted.");
      track("delete_cloud_document");
    } catch (err) {
      console.error("Delete failed:", err);
      showToast("Unable to delete this document.");
    }
  }

  return (
    <main className="fixed inset-0 overflow-y-auto bg-paper text-ink">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 md:px-5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/")}
              aria-label="Back to editor"
              className="flex items-center justify-center rounded-xl border border-line bg-white p-2 text-ink-soft shadow-sm transition-colors hover:border-accent/40 hover:text-accent"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={2} />
            </button>
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">
                Lab Notebook
              </p>
              <h1 className="font-serif text-xl font-bold leading-tight tracking-tight text-ink">
                My Documents
              </h1>
            </div>
          </div>

          <AccountMenu onToast={showToast} />
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-6 md:px-5">
        {documents === null && (
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-[104px] animate-pulse rounded-2xl border border-line bg-white shadow-sm"
              />
            ))}
          </div>
        )}

        {documents !== null && documents.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line bg-white py-16 text-center">
            <Cloud className="h-8 w-8 text-ink-soft/40" strokeWidth={1.5} />
            <p className="text-sm font-semibold text-ink">No documents yet</p>
            <p className="max-w-xs text-xs text-ink-soft/70">
              Use &ldquo;Save to Cloud&rdquo; in the editor to save a record here.
            </p>
          </div>
        )}

        {documents !== null && documents.length > 0 && (
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

      <CloudDocumentModal
        document={openDocument}
        onClose={() => setOpenDocument(null)}
        onLoad={() => {
          if (openDocument) handleLoad(openDocument);
        }}
      />

      <ToastViewport toast={toast} />
    </main>
  );
}
