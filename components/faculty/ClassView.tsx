"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Check, Link2, Loader2, Sparkles, Trash2 } from "lucide-react";
import {
  deleteClass,
  loadSubmittedRecords,
  reviewSubmission,
  watchClassSubmissions,
  watchMyClasses,
  type ClassRow,
  type Submission,
  type Verdict,
} from "@/lib/facultyService";
import type { CloudDocument } from "@/lib/firestoreService";
import type { RecordState } from "@/lib/types";
import { fmtDate } from "@/lib/adminFormat";
import { CodeChip } from "./ClassesView";
import { useFaculty } from "./FacultyProvider";
import { aiSignals } from "@/lib/aiMark";
import { ExperimentsPanel } from "./ExperimentsPanel";
import { RecordViewer } from "./RecordViewer";
import { Stamp } from "./Stamp";

type Filter = "pending" | "approved" | "changes" | "all";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "pending", label: "Waiting" },
  { id: "approved", label: "Verified" },
  { id: "changes", label: "Sent back" },
  { id: "all", label: "All" },
];

const dot: Record<Verdict, string> = { pending: "bg-amber-400", approved: "bg-emerald-500", changes: "bg-red-500" };
const word: Record<Verdict, string> = { pending: "Waiting", approved: "Verified", changes: "Sent back" };

export function ClassView() {
  const { uid } = useFaculty();
  const router = useRouter();
  const code = String(useParams<{ code: string }>().code ?? "").toUpperCase();
  const [cls, setCls] = useState<ClassRow | null | undefined>(undefined);
  const [subs, setSubs] = useState<Submission[] | null>(null);
  const [filter, setFilter] = useState<Filter>("pending");
  const [picked, setPicked] = useState<string | null>(useSearchParams().get("s"));
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    const fail = () => setError("Couldn't load this class. Check that the latest Firestore rules are deployed.");
    const a = watchMyClasses(uid, (rows) => setCls(rows.find((c) => c.code === code) ?? null), fail);
    const b = watchClassSubmissions(code, uid, setSubs, fail);
    return () => {
      a();
      b();
    };
  }, [uid, code]);

  const counts = useMemo(() => {
    const n = { pending: 0, approved: 0, changes: 0, all: subs?.length ?? 0 };
    for (const s of subs ?? []) n[s.status]++;
    return n;
  }, [subs]);

  // Land on the first tab that has someone in it.
  const [chose, setChose] = useState(false);
  useEffect(() => {
    if (!subs || chose) return;
    setChose(true);
    if (!subs.some((s) => s.status === "pending") && subs.length > 0) setFilter("all");
  }, [subs, chose]);

  const shown = (subs ?? []).filter((s) => filter === "all" || s.status === filter);
  const current = (subs ?? []).find((s) => s.id === picked) ?? null;

  if (cls === null) {
    return (
      <div className="ui-card p-8">
        <p className="font-serif text-lg font-bold text-ink">This class isn&apos;t on your desk</p>
        <Link href="/faculty" className="mt-2 inline-block text-sm font-semibold text-accent hover:underline">
          Back to your classes
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="ui-card p-5 sm:p-6">
        <Link href="/faculty" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-accent">
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.5} /> Your classes
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate font-serif text-3xl font-bold tracking-tight text-ink">{cls?.subject ?? "Loading…"}</h1>
            <p className="mt-1 text-sm text-ink-soft">{cls?.section || "Give students this code so they can hand in their records."}</p>
          </div>
          <div className="flex items-center gap-2">
            <CodeChip code={code} />
            <button
              type="button"
              title="Copy the link students open to join this class"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(`${window.location.origin}/join/${code}`);
                  setLinkCopied(true);
                  window.setTimeout(() => setLinkCopied(false), 1500);
                } catch {}
              }}
              className="ui-btn ui-btn-secondary flex min-h-9 items-center gap-1.5 px-3.5 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            >
              {linkCopied ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : <Link2 className="h-3.5 w-3.5" strokeWidth={2} />}
              {linkCopied ? "Link copied" : "Copy join link"}
            </button>
            {confirmDelete ? (
              <span className="flex items-center gap-2 text-sm">
                <button
                  type="button"
                  className="font-semibold text-red-700 hover:underline"
                  onClick={async () => {
                    await deleteClass(code);
                    router.replace("/faculty");
                  }}
                >
                  Delete class
                </button>
                <button type="button" className="text-ink-soft hover:underline" onClick={() => setConfirmDelete(false)}>
                  Keep
                </button>
              </span>
            ) : (
              <button type="button" aria-label="Delete class" title="Delete class" onClick={() => setConfirmDelete(true)} className="ui-icon-btn flex items-center justify-center hover:!text-red-600">
                <Trash2 className="h-4 w-4" strokeWidth={2} />
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      {cls && <ExperimentsPanel cls={cls} />}

      <div className="grid gap-5 lg:grid-cols-[19rem_minmax(0,1fr)]">
        <section aria-label="Students" className="ui-card self-start overflow-hidden">
          <div role="tablist" aria-label="Filter students" className="m-3 grid grid-cols-4 gap-1 rounded-2xl bg-black/[0.05] p-1">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                role="tab"
                aria-selected={filter === f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`flex flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-[11px] font-semibold leading-none transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                  filter === f.id ? "bg-accent text-white shadow-sm" : "text-ink-soft hover:bg-ink/5"
                }`}
              >
                <span className="whitespace-nowrap">{f.label}</span>
                <span className={`font-mono text-[13px] ${filter === f.id ? "text-white" : "text-ink"}`}>{counts[f.id]}</span>
              </button>
            ))}
          </div>
          {subs === null ? (
            <p className="flex items-center gap-2 px-4 py-8 text-sm text-ink-soft">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </p>
          ) : shown.length === 0 ? (
            <p className="px-4 py-10 text-sm text-ink-soft">
              {subs.length === 0 ? "No one has handed in yet. Share the class code above." : filter === "pending" ? "Everyone who handed in has been checked." : "No one here."}
            </p>
          ) : (
            <ul className="max-h-[70vh] divide-y divide-line/70 overflow-y-auto border-t border-line/70">
              {shown.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setPicked(s.id)}
                    aria-current={picked === s.id}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent-soft/40 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent ${picked === s.id ? "bg-accent-soft/60" : ""}`}
                  >
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dot[s.status]}`} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">{s.studentName || s.studentEmail}</span>
                      <span className="block truncate text-xs text-ink-soft">
                        {s.rrn ? `${s.rrn} · ` : ""}
                        {s.recordCount} {s.recordCount === 1 ? "record" : "records"} · {s.submittedAt ? fmtDate(s.submittedAt) : "just now"}
                      </span>
                    </span>
                    <span className="sr-only">{word[s.status]}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-label="Review" className="min-w-0">
          {current ? (
            <Review key={current.id} sub={current} facultyUid={uid} />
          ) : (
            <div className="ui-card px-6 py-16 text-center">
              <p className="font-serif text-lg font-bold text-ink">Pick a student</p>
              <p className="mt-1 text-sm text-ink-soft">Their records open here, page by page, as they would print.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Review({ sub, facultyUid }: { sub: Submission; facultyUid: string }) {
  const [docs, setDocs] = useState<CloudDocument[] | null>(null);
  const [which, setWhich] = useState(0);
  const [comment, setComment] = useState(sub.comment);
  const [busy, setBusy] = useState<"" | "approved" | "changes">("");
  const [error, setError] = useState("");
  const [fresh, setFresh] = useState(false);

  useEffect(() => {
    let off = false;
    loadSubmittedRecords(sub.classCode, sub.studentUid)
      .then((d) => !off && setDocs(d))
      .catch(() => !off && (setDocs([]), setError("Couldn't open these records. The student may have withdrawn them.")));
    return () => {
      off = true;
    };
  }, [sub.classCode, sub.studentUid]);

  async function decide(status: "approved" | "changes") {
    setBusy(status);
    setError("");
    try {
      await reviewSubmission(sub.id, status, comment, facultyUid);
      setFresh(true);
    } catch (e) {
      setError(e instanceof Error && e.message.length < 60 ? e.message : "Couldn't save your decision. Try again.");
    } finally {
      setBusy("");
    }
  }

  const doc = docs?.[which] ?? null;
  const reviewed = sub.status !== "pending";

  return (
    <div className="space-y-4">
      <div className="ui-card flex flex-wrap items-start justify-between gap-4 p-5 sm:p-6">
        <div className="min-w-0">
          <h2 className="truncate font-serif text-xl font-bold text-ink">{sub.studentName || sub.studentEmail}</h2>
          <p className="mt-0.5 text-sm text-ink-soft">
            {sub.studentEmail}
            {sub.rrn ? ` · ${sub.rrn}` : ""}
          </p>
        </div>
        {reviewed && <Stamp status={sub.status as "approved" | "changes"} date={sub.reviewedAt ? fmtDate(sub.reviewedAt) : undefined} fresh={fresh} />}
      </div>

      {docs === null ? (
        <p className="flex items-center gap-2 py-10 text-sm text-ink-soft">
          <Loader2 className="h-4 w-4 animate-spin" /> Opening records…
        </p>
      ) : docs.length === 0 ? (
        <p className="ui-card px-5 py-8 text-sm text-ink-soft">No records to show. The student may have withdrawn this subject.</p>
      ) : (
        <>
          {docs.length > 1 && (
          <div role="tablist" aria-label="Records" className="flex gap-1.5 overflow-x-auto pb-1">
            {docs.map((d, i) => (
              <button
                key={d.id}
                role="tab"
                aria-selected={which === i}
                type="button"
                onClick={() => setWhich(i)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
                  which === i ? "bg-accent-soft text-accent-ink" : "bg-black/[0.05] text-ink-soft hover:bg-ink/10"
                }`}
              >
                {d.data?.record?.exercise_number ? `Ex ${d.data.record.exercise_number}` : d.title}
              </button>
            ))}
          </div>
          )}
          {doc?.data?.record && (
            <>
              <p className="text-sm text-ink-soft">
                <strong className="font-semibold text-ink">{doc.title}</strong>
                {doc.data.record.date ? ` · ${doc.data.record.date}` : ""}
              </p>
              <AiNotice record={doc.data.record} />
              <RecordViewer key={doc.id} payload={doc.data} />
            </>
          )}
        </>
      )}

      <div className="ui-card sticky bottom-0 z-30 space-y-3 !bg-white p-4 shadow-[0_-10px_30px_-12px_rgba(28,43,51,0.28)] sm:p-5">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ink-soft">Note for the student {reviewed ? "" : "(needed when you send it back)"}</span>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={1000}
            rows={2}
            placeholder="Exercise 4: the output doesn't match the program. Run it again and re-capture."
            className="ui-input w-full resize-y"
          />
        </label>
        {error && (
          <p role="alert" className="text-sm font-medium text-red-700">
            {error}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!!busy || !docs?.length}
            onClick={() => void decide("approved")}
            className="ui-primary flex min-h-11 items-center gap-2 px-6 text-[13px] font-semibold disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {busy === "approved" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" strokeWidth={2.75} />}
            {sub.status === "approved" ? "Update note" : "Verify subject"}
          </button>
          <button
            type="button"
            disabled={!!busy || !docs?.length}
            onClick={() => void decide("changes")}
            className="ui-btn flex min-h-11 items-center gap-2 border border-red-300 bg-white px-6 text-[13px] text-red-700 hover:bg-red-50 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
          >
            {busy === "changes" && <Loader2 className="h-4 w-4 animate-spin" />}
            Send back with note
          </button>
        </div>
      </div>
    </div>
  );
}

/** Tells the faculty when the AI assistant wrote a record: from the saved flag and from the hidden mark in the text. */
function AiNotice({ record }: { record: RecordState }) {
  const { declared, declaredAt, marked } = aiSignals(record);
  if (!declared && marked.length === 0) return null;
  return (
    <p role="note" className="flex items-start gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <Sparkles className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.2} />
      <span>
        <strong className="font-semibold">Written with the AI assistant.</strong>{" "}
        {declaredAt ? `Generated ${fmtDate(declaredAt)}. ` : ""}
        {marked.length > 0 ? `The hidden mark is still in: ${marked.join(", ")}.` : "The hidden mark has been removed from the text, but the record is flagged."}
      </span>
    </p>
  );
}
