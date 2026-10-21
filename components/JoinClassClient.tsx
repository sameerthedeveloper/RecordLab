"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Loader2, UserCheck } from "lucide-react";
import { useAuthUser } from "@/lib/authService";
import { findClass, submitSubject, useMySubmissions, type ClassRow } from "@/lib/facultyService";
import { watchUserDocuments, type CloudDocument } from "@/lib/firestoreService";
import { createFolder, useFolders } from "@/lib/folderService";
import { loadSettings } from "@/lib/settings";
import { AuthModal } from "./AuthModal";

const NEW = "__new__";

/** /join/<code>: the link a faculty member shares. Sign in, pick which subject to hand in, done. */
export function JoinClassClient() {
  const code = String(useParams<{ code: string }>().code ?? "");
  const user = useAuthUser();
  const folders = useFolders();
  const mine = useMySubmissions();
  const [cls, setCls] = useState<ClassRow | null | undefined>(undefined);
  const [docs, setDocs] = useState<CloudDocument[] | null>(null);
  const [choice, setChoice] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!user) return setCls(undefined);
    findClass(code).then(setCls).catch(() => setCls(null));
  }, [user, code]);

  useEffect(() => {
    if (!user) return;
    let off: (() => void) | undefined;
    let dead = false;
    watchUserDocuments(setDocs, () => setDocs([])).then((u) => (dead ? u() : (off = u)));
    return () => {
      dead = true;
      off?.();
    };
  }, [user]);

  // Pre-pick the subject whose name matches the class, if there is one.
  useEffect(() => {
    if (choice || !cls || !folders) return;
    const match = folders.find((f) => f.name.toLowerCase() === cls.subject.toLowerCase());
    setChoice(match?.id ?? (folders.length === 0 ? NEW : ""));
  }, [cls, folders, choice]);

  async function hand() {
    if (!user || !cls || !docs) return;
    setBusy(true);
    setError("");
    try {
      const folderId = choice === NEW ? (await createFolder(user.uid, cls.subject)).id : choice;
      const folder = (folders ?? []).find((f) => f.id === folderId);
      const inSubject = docs.filter((d) => d.folderId === folderId);
      await submitSubject({
        cls,
        studentUid: user.uid,
        studentName: user.displayName || user.email || "Student",
        studentEmail: user.email ?? "",
        rrn: loadSettings().rrn,
        subject: folder?.name ?? cls.subject,
        folderId,
        docIds: inSubject.map((d) => d.id),
      });
      try {
        localStorage.setItem(`recordlab.faculty-class.${folderId}`, cls.code);
      } catch {}
      setDone(true);
    } catch (e) {
      setError(e instanceof Error && e.message.length < 80 ? e.message : "Couldn't hand in this subject. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const already = mine.find((s) => s.classCode === cls?.code);
  const count = choice && choice !== NEW && docs ? docs.filter((d) => d.folderId === choice).length : 0;

  return (
    <div className="app-canvas fixed inset-0 overflow-y-auto">
      <div className="mx-auto flex min-h-full max-w-md items-center px-4 py-10">
        <div className="ui-card w-full space-y-4 p-6 sm:p-8">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent-ink">
            <UserCheck className="h-5 w-5" strokeWidth={2} />
          </span>
          {!user ? (
            <>
              <h1 className="font-serif text-2xl font-bold text-ink">Join a class</h1>
              <p className="text-sm text-ink-soft">Sign in to hand in your records to your faculty with code <strong className="font-mono tracking-widest text-ink">{code.toUpperCase()}</strong>.</p>
              <button type="button" onClick={() => setAuthOpen(true)} className="ui-primary px-6 py-2.5 text-sm font-semibold">
                Sign in
              </button>
              <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onToast={() => {}} />
            </>
          ) : cls === undefined || folders === null || docs === null ? (
            <p className="flex items-center gap-2 text-sm text-ink-soft" role="status">
              <Loader2 className="h-4 w-4 animate-spin" /> Looking up the class…
            </p>
          ) : cls === null ? (
            <>
              <h1 className="font-serif text-2xl font-bold text-ink">Class not found</h1>
              <p className="text-sm text-ink-soft">No class has the code {code.toUpperCase()}. Ask your faculty to send the link again.</p>
            </>
          ) : done ? (
            <>
              <h1 className="font-serif text-2xl font-bold text-ink">Handed in</h1>
              <p className="text-sm text-ink-soft">{cls.facultyName} will check {cls.subject}. You&apos;ll see the result on that subject in your dashboard.</p>
              <Link href="/dashboard" className="ui-primary inline-block px-6 py-2.5 text-sm font-semibold">
                Go to my files
              </Link>
            </>
          ) : (
            <>
              <div>
                <h1 className="font-serif text-2xl font-bold text-ink">{cls.subject}</h1>
                <p className="mt-1 text-sm text-ink-soft">
                  {cls.facultyName}
                  {cls.section ? ` · ${cls.section}` : ""}
                </p>
              </div>
              {already && (
                <p className="rounded-lg bg-black/[0.04] px-3 py-2 text-sm text-ink">
                  You already handed in &ldquo;{already.subject}&rdquo; here. It is {already.status === "approved" ? "verified" : already.status === "changes" ? "sent back with a note" : "waiting for review"}. Handing in again replaces it.
                </p>
              )}
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-ink-soft">Which of your subjects is this?</span>
                <select
                  value={choice}
                  onChange={(e) => setChoice(e.target.value)}
                  className="w-full rounded-xl border border-line bg-white p-2.5 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
                >
                  <option value="">Choose a subject…</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                  <option value={NEW}>New subject: {cls.subject}</option>
                </select>
              </label>
              {choice && choice !== NEW && (
                <p className="text-xs text-ink-soft">
                  {count === 0 ? "This subject has no records yet. Add some in the editor first." : `Your faculty will see the ${count} ${count === 1 ? "record" : "records"} in it, and nothing else.`}
                </p>
              )}
              {choice === NEW && <p className="text-xs text-ink-soft">A new empty subject is created. Move your records into it, then open this link again to hand in.</p>}
              {error && (
                <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                  {error}
                </p>
              )}
              <button
                type="button"
                disabled={busy || !choice || (choice !== NEW && count === 0)}
                onClick={() => void hand()}
                className="ui-primary flex items-center gap-2 px-6 py-2.5 text-sm font-semibold disabled:opacity-50"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {choice === NEW ? "Create subject" : "Hand in subject"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
