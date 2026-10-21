"use client";

import { useEffect, useState } from "react";
import { Loader2, UserCheck } from "lucide-react";
import type { User } from "firebase/auth";
import { Modal, modalButton } from "./Modal";
import { findClass, submitSubject, useMySubmission, withdrawSubmission, type ClassRow } from "@/lib/facultyService";
import type { CloudDocument } from "@/lib/firestoreService";
import { loadSettings } from "@/lib/settings";
import { fmtDate } from "@/lib/adminFormat";

interface Props {
  open: boolean;
  onClose: () => void;
  user: User;
  subjectId: string;
  subjectName: string;
  /** The records in this subject. */
  documents: CloudDocument[];
  onToast: (message: string) => void;
}

const key = (subjectId: string) => `recordlab.faculty-class.${subjectId}`;
const field = "w-full rounded-xl border border-line bg-white px-3 py-2.5 font-mono text-base uppercase tracking-[0.2em] text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/15";

/** Hand a subject in to a faculty member's class with its code, and see their verdict and note. */
export function FacultyReviewModal({ open, onClose, user, subjectId, subjectName, documents, onToast }: Props) {
  const [code, setCode] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [cls, setCls] = useState<ClassRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const sub = useMySubmission(code);

  // Remember which class this subject was handed in to.
  useEffect(() => {
    if (!open) return;
    try {
      setCode(localStorage.getItem(key(subjectId)));
    } catch {
      setCode(null);
    }
    setError("");
  }, [open, subjectId]);

  useEffect(() => {
    if (!code) return setCls(null);
    findClass(code).then(setCls).catch(() => setCls(null));
  }, [code]);

  const docIds = documents.map((d) => d.id);

  async function submit(target: ClassRow) {
    setBusy(true);
    setError("");
    try {
      await submitSubject({
        cls: target,
        studentUid: user.uid,
        studentName: user.displayName || user.email || "Student",
        studentEmail: user.email ?? "",
        rrn: loadSettings().rrn,
        subject: subjectName,
        folderId: subjectId,
        docIds,
      });
      try {
        localStorage.setItem(key(subjectId), target.code);
      } catch {}
      setCode(target.code);
      setTyped("");
      onToast(`Handed in to ${target.facultyName}.`);
    } catch (e) {
      setError(e instanceof Error && e.message.length < 80 ? e.message : "Couldn't hand in this subject. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function join() {
    setBusy(true);
    setError("");
    try {
      const found = await findClass(typed);
      if (!found) return setError("No class has that code. Check it with your faculty.");
      await submit(found);
    } catch {
      setError("Couldn't look up that code. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function withdraw() {
    if (!sub || !code) return;
    setBusy(true);
    try {
      await withdrawSubmission(sub, docIds);
      try {
        localStorage.removeItem(key(subjectId));
      } catch {}
      setCode(null);
      onToast("Taken back.");
    } catch {
      setError("Couldn't take it back. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const status = sub?.status;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Faculty review"
      description={`Hand in "${subjectName}" for your faculty to check.`}
      icon={UserCheck}
      size="md"
      bodyClassName="p-5 pb-6 sm:p-7 sm:pb-8"
      footer={
        <button type="button" onClick={onClose} className={modalButton.secondary}>
          Close
        </button>
      }
    >
      {sub && cls ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-line bg-white p-4">
            <p className="text-sm text-ink-soft">
              {cls.subject}
              {cls.section ? `, ${cls.section}` : ""} · {cls.facultyName}
            </p>
            <p className={`mt-1 font-serif text-xl font-bold ${status === "approved" ? "text-emerald-700" : status === "changes" ? "text-red-700" : "text-ink"}`}>
              {status === "approved" ? "Verified" : status === "changes" ? "Needs changes" : "Waiting for review"}
            </p>
            <p className="mt-0.5 text-xs text-ink-soft">
              Handed in {fmtDate(sub.submittedAt)} · {sub.recordCount} {sub.recordCount === 1 ? "record" : "records"}
              {sub.reviewedAt ? ` · reviewed ${fmtDate(sub.reviewedAt)}` : ""}
            </p>
            {sub.comment && <p className="mt-3 whitespace-pre-wrap rounded-lg bg-black/[0.04] px-3 py-2 text-sm text-ink">{sub.comment}</p>}
          </div>
          {documents.length !== sub.recordCount && status !== "approved" && (
            <p className="text-xs text-ink-soft">This subject now has {documents.length} records. Hand it in again so your faculty sees all of them.</p>
          )}
          <div className="flex flex-wrap gap-2">
            {status !== "pending" || documents.length !== sub.recordCount ? (
              <button type="button" disabled={busy} onClick={() => void submit(cls)} className={`${modalButton.primary} flex items-center gap-2`}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Hand in again
              </button>
            ) : null}
            <button type="button" disabled={busy} onClick={() => void withdraw()} className={modalButton.secondary}>
              Take back
            </button>
          </div>
        </div>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void join();
          }}
        >
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-ink-soft">Class code from your faculty</span>
            <input value={typed} onChange={(e) => setTyped(e.target.value)} maxLength={8} placeholder="K7M2QX" className={field} autoComplete="off" spellCheck={false} />
          </label>
          <p className="text-xs text-ink-soft">
            Your faculty will see the {documents.length} {documents.length === 1 ? "record" : "records"} in this subject, and nothing else. You can take it back any time.
          </p>
          <button type="submit" disabled={busy || typed.trim().length < 4 || documents.length === 0} className={`${modalButton.primary} flex items-center gap-2`}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Hand in subject
          </button>
          {documents.length === 0 && <p className="text-xs text-ink-soft">Add at least one record to this subject first.</p>}
        </form>
      )}
      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
    </Modal>
  );
}
