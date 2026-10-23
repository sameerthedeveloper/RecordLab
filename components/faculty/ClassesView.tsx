"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Check, CheckCircle2, ChevronRight, Copy, Inbox, Loader2, Plus, Undo2 } from "lucide-react";
import { ago } from "@/lib/adminFormat";
import { Card, Kpi } from "@/components/admin/ui";
import { createClass, watchAllSubmissions, watchMyClasses, type ClassRow, type Submission } from "@/lib/facultyService";
import { useFaculty } from "./FacultyProvider";

const field = "ui-input w-full";

export function CodeChip({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      title="Copy the class code"
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(code);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        } catch {}
      }}
      className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-ink/30 bg-white px-3 py-1 font-mono text-[13px] font-semibold tracking-[0.12em] text-ink transition-colors hover:border-accent hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
    >
      {code}
      {copied ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : <Copy className="h-3.5 w-3.5" strokeWidth={2} />}
      <span className="sr-only">{copied ? "Copied" : "Copy code"}</span>
    </button>
  );
}

export function ClassesView() {
  const { uid, name } = useFaculty();
  const [classes, setClasses] = useState<ClassRow[] | null>(null);
  const [subs, setSubs] = useState<Submission[]>([]);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [section, setSection] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const fail = () => setError("Couldn't load your classes. Ask an admin to check that the latest Firestore rules are deployed.");
    const a = watchMyClasses(uid, setClasses, fail);
    const b = watchAllSubmissions(uid, setSubs, fail);
    return () => {
      a();
      b();
    };
  }, [uid]);

  const count = (code: string, status: Submission["status"]) => subs.filter((s) => s.classCode === code && s.status === status).length;
  const waiting = subs.filter((s) => s.status === "pending").length;

  const verified = subs.filter((s) => s.status === "approved").length;
  const sentBack = subs.filter((s) => s.status === "changes").length;
  const queue = subs
    .filter((s) => s.status === "pending")
    .sort((a, b) => (a.submittedAt?.getTime() ?? 0) - (b.submittedAt?.getTime() ?? 0))
    .slice(0, 6);
  const subjectOf = (code: string) => classes?.find((c) => c.code === code)?.subject ?? "";
  const first = name.trim().split(/\s+/)[0] || "there";

  return (
    <div className="space-y-4">
      <div className="ui-card flex flex-wrap items-end justify-between gap-3 p-5 sm:p-6">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-ink">Hello, {first}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {classes === null ? "Loading…" : waiting > 0 ? `${waiting} ${waiting === 1 ? "subject is" : "subjects are"} waiting for your check.` : "Nothing waiting for you right now."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="ui-primary flex min-h-10 items-center gap-2 px-5 text-[13px] font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} /> New class
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Kpi label="Classes" icon={BookOpen} value={classes?.length ?? "—"} note={classes?.length ? "you teach" : "create your first"} />
        <Kpi label="Waiting" icon={Inbox} value={waiting} note={waiting ? "oldest first below" : "all caught up"} />
        <Kpi label="Verified" icon={CheckCircle2} value={verified} note="subjects signed off" />
        <Kpi label="Sent back" icon={Undo2} value={sentBack} note="waiting on students" />
      </div>

      {open && (
        <form
          className="ui-card grid gap-3 p-5 sm:grid-cols-[1fr_12rem_auto] sm:items-end sm:p-6"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              await createClass(uid, name, subject, section);
              setSubject("");
              setSection("");
              setOpen(false);
            } catch (err) {
              setError(err instanceof Error && err.message.length < 60 ? err.message : "Couldn't create the class. Try again.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-ink-soft">Subject</span>
            <input className={field} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Data Structures Lab" autoFocus required />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-ink-soft">Section or year</span>
            <input className={field} value={section} onChange={(e) => setSection(e.target.value)} placeholder="CSE-B, 2nd year" />
          </label>
          <button type="submit" disabled={busy} className="ui-primary flex min-h-10 items-center justify-center gap-2 px-5 text-[13px] font-semibold disabled:opacity-60">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Create class
          </button>
        </form>
      )}

      {error && (
        <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      {queue.length > 0 && (
        <Card title="Needs your check" aside={waiting > queue.length ? `${queue.length} of ${waiting}` : `${waiting}`}>
          <ul className="divide-y divide-line/70 px-2 pb-3 pt-2">
            {queue.map((q) => (
              <li key={q.id}>
                <Link href={`/faculty/${q.classCode}?s=${encodeURIComponent(q.id)}`} className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-black/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent">
                  <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[12px] font-bold text-accent-ink">
                    {((q.studentName || q.studentEmail).trim()[0] || "?").toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-ink">{q.studentName || q.studentEmail}</span>
                    <span className="block truncate text-xs text-ink-soft">
                      {subjectOf(q.classCode) || q.subject} · {q.recordCount} {q.recordCount === 1 ? "record" : "records"} · handed in {ago(q.submittedAt)}
                    </span>
                  </span>
                  <span className="hidden text-xs font-semibold text-accent sm:block">Review</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-ink-soft/50" strokeWidth={2.2} />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {classes && classes.length === 0 && !error && (
        <div className="ui-card px-6 py-12 text-center">
          <p className="font-serif text-lg font-bold text-ink">No classes yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-ink-soft">Create one class for each subject you teach. Each gets a code: give it to your students, and they hand in their records with it.</p>
        </div>
      )}

      {classes && classes.length > 0 && (
        <Card title="Your classes" aside={classes ? `${classes.length}` : undefined}>
        <ul className="divide-y divide-line/70 px-2 pb-3 pt-2">
          {classes.map((c) => {
            const p = count(c.code, "pending");
            const v = count(c.code, "approved");
            const s = count(c.code, "changes");
            return (
              <li key={c.code}>
                <Link href={`/faculty/${c.code}`} className="flex items-center gap-4 rounded-xl px-3 py-3.5 transition-colors hover:bg-black/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-serif text-lg font-bold leading-tight text-ink">{c.subject}</p>
                    <p className="mt-0.5 truncate text-sm text-ink-soft">{c.section || "No section"}</p>
                  </div>
                  <CodeChip code={c.code} />
                  <div className="hidden w-52 shrink-0 md:block">
                    {p + v + s === 0 ? (
                      <p className="text-right text-sm text-ink-soft">No submissions yet</p>
                    ) : (
                      <>
                        <p className="text-right text-xs text-ink-soft">
                          {p > 0 && <strong className="font-semibold text-ink">{p} waiting · </strong>}
                          {v} of {p + v + s} verified
                        </p>
                        <div className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-black/[0.07]" role="img" aria-label={`${v} verified, ${s} sent back, ${p} waiting`}>
                          <span className="bg-emerald-500" style={{ width: `${(v / (p + v + s)) * 100}%` }} />
                          <span className="bg-red-400" style={{ width: `${(s / (p + v + s)) * 100}%` }} />
                          <span className="bg-amber-400" style={{ width: `${(p / (p + v + s)) * 100}%` }} />
                        </div>
                      </>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-ink-soft" />
                </Link>
              </li>
            );
          })}
        </ul>
        </Card>
      )}
    </div>
  );
}
