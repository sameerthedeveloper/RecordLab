"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AccountMenu } from "./AccountMenu";
import { DashboardModal } from "./DashboardModal";
import { ToastViewport, useToast } from "./Toast";
import type { CloudDocument, RlabPayload } from "@/lib/firestoreService";

const WEEK = 7 * 24 * 60 * 60 * 1000;
const WEEKS = 12;

function weeklyActivity(docs: CloudDocument[]): number[] {
  const now = Date.now();
  const buckets = new Array(WEEKS).fill(0);
  for (const d of docs) {
    const t = (d.updatedAt ?? d.createdAt)?.toMillis() ?? now;
    const idx = WEEKS - 1 - Math.floor((now - t) / WEEK);
    if (idx >= 0 && idx < WEEKS) buckets[idx] += 1;
  }
  return buckets;
}

export function DashboardPageClient() {
  const router = useRouter();
  const { toast, showToast } = useToast();
  const [documents, setDocuments] = useState<CloudDocument[] | null>(null);

  const handleLoad = useCallback(
    (payload: RlabPayload) => {
      try {
        sessionStorage.setItem("recordlab.pendingLoad", JSON.stringify(payload));
      } catch {
        showToast("Unable to open this record. Free up browser storage and try again.");
        return;
      }
      router.push("/");
    },
    [router, showToast]
  );

  const goToEditor = useCallback(() => router.push("/"), [router]);

  const activity = useMemo(() => weeklyActivity(documents ?? []), [documents]);
  const peak = Math.max(1, ...activity);
  const total = documents?.length ?? 0;
  const thisWeek = activity[WEEKS - 1];

  return (
    <div className="flex h-full w-full flex-col gap-3.5 bg-gray-100 p-3.5 md:p-4">
      <header className="flex shrink-0 flex-wrap items-end justify-between gap-x-6 gap-y-3 rounded-2xl border border-line bg-white px-5 py-4">
        <div className="min-w-0">
          <Link
            href="/"
            className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-soft transition-colors hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.25} />
            Back to editor
          </Link>
          <h1 className="font-serif text-2xl font-bold leading-tight tracking-tight text-ink">My records</h1>
          <p className="mt-0.5 text-sm text-ink-soft">
            {documents === null
              ? "Loading your records…"
              : total === 0
                ? "Nothing saved yet."
                : `${total} saved ${total === 1 ? "record" : "records"}, ${thisWeek} edited this week.`}
          </p>
        </div>

        <div className="flex items-end gap-5">
          {total > 0 && (
            <figure
              className="hidden sm:block"
              aria-label={`Records edited per week over the last ${WEEKS} weeks: ${activity.join(", ")}`}
            >
              <div className="flex h-12 items-end gap-1" aria-hidden>
                {activity.map((n, i) => (
                  <div
                    key={i}
                    title={`${n} ${n === 1 ? "record" : "records"} edited${i === WEEKS - 1 ? " this week" : ""}`}
                    style={{ height: `${Math.max(8, (n / peak) * 100)}%` }}
                    className={`w-2.5 rounded-sm ${n === 0 ? "bg-line" : i === WEEKS - 1 ? "bg-accent" : "bg-accent/45"}`}
                  />
                ))}
              </div>
              <figcaption className="mt-1 text-[11px] text-ink-soft/70">Records edited, last {WEEKS} weeks</figcaption>
            </figure>
          )}
          <AccountMenu onToast={showToast} />
        </div>
      </header>

      <div className="min-h-0 flex-1">
        <DashboardModal
          open
          embedded
          onClose={goToEditor}
          onLoad={handleLoad}
          onToast={showToast}
          onDocuments={setDocuments}
        />
      </div>

      <ToastViewport toast={toast} />
    </div>
  );
}
