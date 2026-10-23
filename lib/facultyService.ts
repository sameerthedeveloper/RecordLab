"use client";

import { useCallback, useEffect, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { getDb } from "./firebaseConfig";
import { useAuthUser } from "./authService";
import type { CloudDocument, RlabPayload } from "./firestoreService";

/*
 * Faculty review, in four collections (rules in firestore.rules, notes in docs/faculty.md):
 *   facultyRequests/<uid>  a person asking to be faculty; an admin approves or declines
 *   faculty/<uid>          approved faculty
 *   classes/<code>         one subject a faculty member teaches; the id is the join code students type
 *   submissions/<code>_<studentUid>  a student's subject handed in for review, plus the faculty verdict
 * Records stay where they are (documents/*). Submitting stamps each record with `submittedTo: <code>`,
 * and the rules let that class's faculty read exactly those records.
 */

export type Verdict = "pending" | "approved" | "changes";

export interface FacultyRequest {
  uid: string;
  name: string;
  email: string;
  department: string;
  college: string;
  requestedAt: Date | null;
}

export interface ClassRow {
  code: string;
  facultyUid: string;
  facultyName: string;
  subject: string;
  section: string;
  /** Experiments the faculty assigned to everyone in the class, in order. */
  experiments: AssignedExperiment[];
  createdAt: Date | null;
}

export interface AssignedExperiment {
  /** Matches the record's exercise number, so a student's records tick it off. */
  no: string;
  title: string;
  /** Optional due date, YYYY-MM-DD. */
  due: string;
}

export interface Submission {
  id: string;
  classCode: string;
  facultyUid: string;
  studentUid: string;
  studentName: string;
  studentEmail: string;
  rrn: string;
  subject: string;
  /** The student's subject folder, so a record can find its verdict on any device. */
  folderId: string | null;
  /** Copied from the class when the student hands in (the rules check it), so the "verified by" line is trustworthy. */
  facultyName: string;
  recordCount: number;
  status: Verdict;
  comment: string;
  submittedAt: Date | null;
  reviewedAt: Date | null;
}

const toDate = (v: unknown): Date | null => (v instanceof Timestamp ? v.toDate() : null);
const str = (v: unknown) => (typeof v === "string" ? v : "");

/* ---------------------------------------------------------------- access */

export type FacultyAccess =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "no-access"; uid: string; email: string | null; request: FacultyRequest | null }
  | { status: "faculty"; uid: string; name: string };

function toRequest(uid: string, x: Record<string, unknown>): FacultyRequest {
  return { uid, name: str(x.name), email: str(x.email), department: str(x.department), college: str(x.college), requestedAt: toDate(x.requestedAt) };
}

/** Faculty = has a document at faculty/<uid>, created when an admin approves a request. `recheck` re-reads after you send a request. */
export function useFacultyAccess(): { access: FacultyAccess; recheck: () => void } {
  const user = useAuthUser();
  const [access, setAccess] = useState<FacultyAccess>({ status: "loading" });
  const [tick, setTick] = useState(0);
  const recheck = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    if (!user) {
      // useAuthUser is null both while Firebase restores a session and when signed out.
      const t = window.setTimeout(() => setAccess({ status: "signed-out" }), 1500);
      return () => window.clearTimeout(t);
    }
    let cancelled = false;
    (async () => {
      try {
        const fac = await getDoc(doc(getDb(), "faculty", user.uid));
        if (cancelled) return;
        if (fac.exists()) {
          setAccess({ status: "faculty", uid: user.uid, name: str(fac.data().name) || user.displayName || user.email || "Faculty" });
          return;
        }
        const req = await getDoc(doc(getDb(), "facultyRequests", user.uid));
        if (!cancelled) setAccess({ status: "no-access", uid: user.uid, email: user.email, request: req.exists() ? toRequest(user.uid, req.data()) : null });
      } catch {
        if (!cancelled) setAccess({ status: "no-access", uid: user.uid, email: user.email, request: null });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, tick]);

  return { access, recheck };
}

export async function requestFacultyAccess(uid: string, input: { name: string; email: string; department: string; college: string }): Promise<void> {
  const clean = (s: string, max: number) => s.trim().replace(/\s+/g, " ").slice(0, max);
  const name = clean(input.name, 80);
  if (name.length < 2) throw new Error("Enter your name.");
  await setDoc(doc(getDb(), "facultyRequests", uid), {
    name,
    email: input.email,
    department: clean(input.department, 80),
    college: clean(input.college, 120),
    requestedAt: serverTimestamp(),
  });
}

/* ----------------------------------------------------------------- admin */

export async function loadFacultyRequests(): Promise<FacultyRequest[]> {
  const snap = await getDocs(query(collection(getDb(), "facultyRequests"), orderBy("requestedAt", "desc"), limit(200)));
  return snap.docs.map((d) => toRequest(d.id, d.data()));
}

export interface FacultyMember {
  uid: string;
  name: string;
  email: string;
  department: string;
  college: string;
  approvedAt: Date | null;
}

export async function loadFaculty(): Promise<FacultyMember[]> {
  const snap = await getDocs(query(collection(getDb(), "faculty"), limit(500)));
  return snap.docs
    .map((d) => {
      const x = d.data();
      return { uid: d.id, name: str(x.name), email: str(x.email), department: str(x.department), college: str(x.college), approvedAt: toDate(x.approvedAt) };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Approves a request: creates faculty/<uid> and removes the request in one batch. */
export async function approveFaculty(req: FacultyRequest, adminUid: string): Promise<void> {
  const batch = writeBatch(getDb());
  batch.set(doc(getDb(), "faculty", req.uid), {
    name: req.name,
    email: req.email,
    department: req.department,
    college: req.college,
    approvedBy: adminUid,
    approvedAt: serverTimestamp(),
  });
  batch.delete(doc(getDb(), "facultyRequests", req.uid));
  await batch.commit();
}

export async function declineFaculty(uid: string): Promise<void> {
  await deleteDoc(doc(getDb(), "facultyRequests", uid));
}

export async function removeFaculty(uid: string): Promise<void> {
  await deleteDoc(doc(getDb(), "faculty", uid));
}

/* --------------------------------------------------------------- classes */

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I

function newCode(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

function toExperiments(v: unknown): AssignedExperiment[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((e) => (e && typeof e === "object" ? (e as Record<string, unknown>) : {}))
    .map((e) => ({ no: str(e.no), title: str(e.title), due: str(e.due) }))
    .filter((e) => e.no && e.title);
}

function toClass(code: string, x: Record<string, unknown>): ClassRow {
  return {
    code,
    facultyUid: str(x.facultyUid),
    facultyName: str(x.facultyName),
    subject: str(x.subject),
    section: str(x.section),
    experiments: toExperiments(x.experiments),
    createdAt: toDate(x.createdAt),
  };
}

/** Faculty: replaces the experiments assigned to a class. Students who have the class code see the list. */
export async function saveExperiments(code: string, experiments: AssignedExperiment[]): Promise<void> {
  const clean = experiments
    .map((e) => ({ no: e.no.trim().slice(0, 10), title: e.title.trim().replace(/\s+/g, " ").slice(0, 120), due: /^\d{4}-\d{2}-\d{2}$/.test(e.due) ? e.due : "" }))
    .filter((e) => e.no && e.title);
  if (new Set(clean.map((e) => e.no)).size !== clean.length) throw new Error("Two experiments share a number.");
  if (clean.length > 60) throw new Error("A class can have up to 60 experiments.");
  await updateDoc(doc(getDb(), "classes", code), { experiments: clean });
}

export function watchMyClasses(uid: string, onChange: (rows: ClassRow[]) => void, onError: (e: Error) => void): () => void {
  return onSnapshot(
    query(collection(getDb(), "classes"), where("facultyUid", "==", uid)),
    (snap) => onChange(snap.docs.map((d) => toClass(d.id, d.data())).sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0))),
    (err) => onError(err instanceof Error ? err : new Error(String(err)))
  );
}

export async function createClass(uid: string, facultyName: string, subject: string, section: string): Promise<string> {
  const name = subject.trim().replace(/\s+/g, " ").slice(0, 80);
  if (!name) throw new Error("Give the subject a name.");
  // A code clash is very unlikely (32^6), but a create over an existing class would be refused by the rules anyway: retry.
  for (let i = 0; i < 4; i++) {
    const code = newCode();
    try {
      await setDoc(doc(getDb(), "classes", code), {
        facultyUid: uid,
        facultyName,
        subject: name,
        section: section.trim().slice(0, 40),
        experiments: [],
        createdAt: serverTimestamp(),
      });
      return code;
    } catch (e) {
      if (i === 3) throw e;
    }
  }
  throw new Error("Couldn't create the class.");
}

export async function deleteClass(code: string): Promise<void> {
  await deleteDoc(doc(getDb(), "classes", code));
}

/** Looks up a class by the code a student typed. Null when there is no such class. */
export async function findClass(rawCode: string): Promise<ClassRow | null> {
  const code = rawCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (code.length < 4) return null;
  const snap = await getDoc(doc(getDb(), "classes", code));
  return snap.exists() ? toClass(snap.id, snap.data()) : null;
}

/* ------------------------------------------------------------ submissions */

function toSubmission(id: string, x: Record<string, unknown>): Submission {
  return {
    id,
    classCode: str(x.classCode),
    facultyUid: str(x.facultyUid),
    studentUid: str(x.studentUid),
    studentName: str(x.studentName),
    studentEmail: str(x.studentEmail),
    rrn: str(x.rrn),
    subject: str(x.subject),
    folderId: typeof x.folderId === "string" ? x.folderId : null,
    facultyName: str(x.facultyName),
    recordCount: typeof x.recordCount === "number" ? x.recordCount : 0,
    status: x.status === "approved" || x.status === "changes" ? x.status : "pending",
    comment: str(x.comment),
    submittedAt: toDate(x.submittedAt),
    reviewedAt: toDate(x.reviewedAt),
  };
}

/** Faculty: every submission to one class, live. */
export function watchClassSubmissions(classCode: string, facultyUid: string, onChange: (rows: Submission[]) => void, onError: (e: Error) => void): () => void {
  return onSnapshot(
    query(collection(getDb(), "submissions"), where("facultyUid", "==", facultyUid), where("classCode", "==", classCode)),
    (snap) => onChange(snap.docs.map((d) => toSubmission(d.id, d.data())).sort((a, b) => (b.submittedAt?.getTime() ?? 0) - (a.submittedAt?.getTime() ?? 0))),
    (err) => onError(err instanceof Error ? err : new Error(String(err)))
  );
}

/** Faculty: every submission across all their classes (for the counts on the class list). */
export function watchAllSubmissions(facultyUid: string, onChange: (rows: Submission[]) => void, onError: (e: Error) => void): () => void {
  return onSnapshot(
    query(collection(getDb(), "submissions"), where("facultyUid", "==", facultyUid)),
    (snap) => onChange(snap.docs.map((d) => toSubmission(d.id, d.data()))),
    (err) => onError(err instanceof Error ? err : new Error(String(err)))
  );
}

/** Faculty: the student's records that were handed in to this class. Allowed by the `submittedTo` rule. */
export async function loadSubmittedRecords(classCode: string, studentUid: string): Promise<CloudDocument[]> {
  const snap = await getDocs(query(collection(getDb(), "documents"), where("userId", "==", studentUid), where("submittedTo", "==", classCode)));
  return snap.docs
    .map((d) => {
      const x = d.data();
      return {
        id: d.id,
        userId: str(x.userId),
        puterUserId: null,
        puterUsername: null,
        title: str(x.title) || "Untitled",
        folderId: (x.folderId as string) ?? null,
        data: x.data as RlabPayload,
        createdAt: (x.createdAt as Timestamp) ?? null,
        updatedAt: (x.updatedAt as Timestamp) ?? null,
      } satisfies CloudDocument;
    })
    .sort((a, b) => (Number(a.data?.record?.exercise_number) || 0) - (Number(b.data?.record?.exercise_number) || 0));
}

export async function reviewSubmission(id: string, status: Exclude<Verdict, "pending">, comment: string, facultyUid: string): Promise<void> {
  const text = comment.trim().slice(0, 1000);
  if (status === "changes" && !text) throw new Error("Say what needs to change.");
  await updateDoc(doc(getDb(), "submissions", id), { status, comment: text, reviewedAt: serverTimestamp(), reviewedBy: facultyUid });
}

/* ---------------------------------------------------------------- student */

export const submissionId = (classCode: string, studentUid: string) => `${classCode}_${studentUid}`;

/** Student: live view of their own submission for one class (null = never submitted). */
export function useMySubmission(classCode: string | null): Submission | null | undefined {
  const user = useAuthUser();
  const [sub, setSub] = useState<Submission | null | undefined>(undefined);
  useEffect(() => {
    if (!user || !classCode) {
      setSub(classCode ? undefined : null);
      return;
    }
    return onSnapshot(
      doc(getDb(), "submissions", submissionId(classCode, user.uid)),
      (snap) => setSub(snap.exists() ? toSubmission(snap.id, snap.data()) : null),
      () => setSub(null)
    );
  }, [user, classCode]);
  return sub;
}

/** Student: all their submissions, newest first (to show a status next to each subject). */
export function useMySubmissions(): Submission[] {
  const user = useAuthUser();
  const [rows, setRows] = useState<Submission[]>([]);
  useEffect(() => {
    if (!user) return setRows([]);
    return onSnapshot(
      query(collection(getDb(), "submissions"), where("studentUid", "==", user.uid)),
      (snap) => setRows(snap.docs.map((d) => toSubmission(d.id, d.data()))),
      () => setRows([])
    );
  }, [user]);
  return rows;
}

/**
 * Hands a subject in to a class: stamps each record with the class code (so the faculty's read rule applies)
 * and writes the submission as "pending". Handing in again after "needs changes" resets it to pending.
 */
export async function submitSubject(input: {
  cls: ClassRow;
  studentUid: string;
  studentName: string;
  studentEmail: string;
  rrn: string;
  subject: string;
  folderId: string | null;
  docIds: string[];
}): Promise<void> {
  if (input.docIds.length === 0) throw new Error("Add at least one record to this subject first.");
  const batch = writeBatch(getDb());
  for (const id of input.docIds) batch.update(doc(getDb(), "documents", id), { submittedTo: input.cls.code });
  batch.set(doc(getDb(), "submissions", submissionId(input.cls.code, input.studentUid)), {
    classCode: input.cls.code,
    facultyUid: input.cls.facultyUid,
    studentUid: input.studentUid,
    studentName: input.studentName,
    studentEmail: input.studentEmail,
    rrn: input.rrn,
    subject: input.subject,
    folderId: input.folderId,
    facultyName: input.cls.facultyName,
    recordCount: input.docIds.length,
    status: "pending",
    comment: "",
    submittedAt: serverTimestamp(),
    reviewedAt: null,
  });
  await batch.commit();
}

/** Student: takes the subject back. The records stop being visible to the faculty. */
export async function withdrawSubmission(sub: Submission, docIds: string[]): Promise<void> {
  const batch = writeBatch(getDb());
  for (const id of docIds) batch.update(doc(getDb(), "documents", id), { submittedTo: null });
  batch.delete(doc(getDb(), "submissions", sub.id));
  await batch.commit();
}
