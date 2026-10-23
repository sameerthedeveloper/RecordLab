"use client";

import { useEffect, useState } from "react";
import { collection, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, Timestamp, where, writeBatch } from "firebase/firestore";
import { getDb } from "./firebaseConfig";
import { useAuthUser } from "./authService";
import { dayKey } from "./usageStats";

export type AdminAccess =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "denied"; uid: string; email: string | null }
  | { status: "admin"; uid: string };

/** Admin = has a document at admins/<uid> (created by hand in the Firebase console; see docs/admin.md). */
export function useAdminAccess(): AdminAccess {
  const user = useAuthUser();
  const [access, setAccess] = useState<AdminAccess>({ status: "loading" });

  useEffect(() => {
    if (!user) {
      // useAuthUser is null both while Firebase restores a session and when signed out.
      const t = window.setTimeout(() => setAccess({ status: "signed-out" }), 1500);
      return () => window.clearTimeout(t);
    }
    let cancelled = false;
    setAccess({ status: "loading" });
    getDoc(doc(getDb(), "admins", user.uid))
      .then((snap) => !cancelled && setAccess(snap.exists() ? { status: "admin", uid: user.uid } : { status: "denied", uid: user.uid, email: user.email }))
      .catch(() => !cancelled && setAccess({ status: "denied", uid: user.uid, email: user.email }));
    return () => {
      cancelled = true;
    };
  }, [user]);

  return access;
}

export interface DayStats {
  day: string;
  total: number;
  events: Record<string, number>;
}

export interface ProfileRow {
  uid: string;
  email: string | null;
  displayName: string | null;
  providers: string[];
  createdAt: Date | null;
  lastSeenAt: Date | null;
}

export interface UsageSnapshot {
  days: DayStats[];
  lifetime: { total: number; events: Record<string, number> } | null;
  profiles: ProfileRow[];
  loadedAt: Date;
}

const toDate = (v: unknown): Date | null => (v instanceof Timestamp ? v.toDate() : null);
const asCounts = (v: unknown): Record<string, number> =>
  v && typeof v === "object" ? Object.fromEntries(Object.entries(v as Record<string, unknown>).filter(([, n]) => typeof n === "number")) as Record<string, number> : {};

/** Reads counters and profile rows only. Never touches users' records or settings. */
export async function loadUsage(rangeDays: number): Promise<UsageSnapshot> {
  const db = getDb();
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - (rangeDays - 1));

  const [daySnap, allSnap, profileSnap] = await Promise.all([
    getDocs(query(collection(db, "stats"), where("day", ">=", dayKey(start)), orderBy("day"))),
    getDoc(doc(db, "stats", "_all")),
    getDocs(query(collection(db, "profiles"), orderBy("lastSeenAt", "desc"), limit(500))),
  ]);

  return {
    days: daySnap.docs.map((d) => ({ day: d.id, total: Number(d.data().total ?? 0), events: asCounts(d.data().events) })),
    lifetime: allSnap.exists() ? { total: Number(allSnap.data().total ?? 0), events: asCounts(allSnap.data().events) } : null,
    profiles: profileSnap.docs.map((d) => {
      const p = d.data();
      return {
        uid: d.id,
        email: (p.email as string) ?? null,
        displayName: (p.displayName as string) ?? null,
        providers: Array.isArray(p.providers) ? (p.providers as string[]) : [],
        createdAt: toDate(p.createdAt),
        lastSeenAt: toDate(p.lastSeenAt),
      };
    }),
    loadedAt: new Date(),
  };
}

export interface AdminRecord {
  id: string;
  userId: string;
  title: string;
  folderId: string | null;
  updatedAt: Date | null;
  createdAt: Date | null;
  record: import("./types").RecordState | null;
}

/** Admins can read every saved record (firestore.rules: documents). Newest first. */
export async function loadRecords(max = 200): Promise<AdminRecord[]> {
  const snap = await getDocs(query(collection(getDb(), "documents"), orderBy("updatedAt", "desc"), limit(max)));
  return snap.docs.map((d) => {
    const x = d.data();
    return {
      id: d.id,
      userId: (x.userId as string) ?? "",
      title: (x.title as string) || "Untitled",
      folderId: (x.folderId as string) ?? null,
      updatedAt: toDate(x.updatedAt),
      createdAt: toDate(x.createdAt),
      record: (x.data?.record as import("./types").RecordState) ?? null,
    };
  });
}

export interface CollegeRow {
  domain: string;
  name: string;
  createdBy: string | null;
  createdAt: Date | null;
}

/** Colleges students named (colleges/<domain>); readable by any signed-in user, so this works for admins too. */
export async function loadColleges(): Promise<CollegeRow[]> {
  const snap = await getDocs(query(collection(getDb(), "colleges"), limit(500)));
  return snap.docs
    .map((d) => {
      const x = d.data();
      return { domain: d.id, name: (x.name as string) ?? d.id, createdBy: (x.createdBy as string) ?? null, createdAt: toDate(x.createdAt) };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Everything the admin dashboard shows. Records and colleges are optional: if their rules are not deployed the rest still works. */
export interface AdminRow {
  uid: string;
  grantedBy: string | null;
  grantedAt: Date | null;
}

/** Who is an admin: the documents under admins/. Needs the admin rules in docs/admin.md to be deployed. */
export async function loadAdmins(): Promise<AdminRow[]> {
  const snap = await getDocs(collection(getDb(), "admins"));
  return snap.docs.map((d) => ({ uid: d.id, grantedBy: (d.data().grantedBy as string) ?? null, grantedAt: toDate(d.data().grantedAt) }));
}

/** Makes `toUid` an admin. Only an existing admin can do this. */
export async function addAdmin(toUid: string, byUid: string): Promise<void> {
  const batch = writeBatch(getDb());
  batch.set(doc(getDb(), "admins", toUid), { grantedBy: byUid, grantedAt: serverTimestamp() });
  await batch.commit();
}

/** Hands admin access to someone else and gives up your own, in one batch so there is never a moment with no admin. */
export async function transferAdmin(fromUid: string, toUid: string): Promise<void> {
  const batch = writeBatch(getDb());
  batch.set(doc(getDb(), "admins", toUid), { grantedBy: fromUid, grantedAt: serverTimestamp() });
  batch.delete(doc(getDb(), "admins", fromUid));
  await batch.commit();
}

/** Gives up your own admin access (the page refuses when you are the only admin). */
export async function stepDownAsAdmin(uid: string): Promise<void> {
  const batch = writeBatch(getDb());
  batch.delete(doc(getDb(), "admins", uid));
  await batch.commit();
}

export interface AdminData {
  usage: UsageSnapshot;
  admins: AdminRow[] | null;
  records: AdminRecord[] | null;
  recordsError: string;
  colleges: CollegeRow[] | null;
}

export async function loadAdminData(rangeDays: number): Promise<AdminData> {
  // Twice the range, so the dashboard can compare this period with the one before it.
  const [usage, records, colleges, admins] = await Promise.all([
    loadUsage(rangeDays * 2),
    loadRecords(500).then(
      (r) => ({ r, err: "" }),
      (e: unknown) => ({ r: null, err: e instanceof Error && /permission/i.test(e.message) ? "Firestore refused the read. Deploy the latest firestore.rules (admins can read documents), then reload." : "Couldn't load the records." }),
    ),
    loadColleges().catch(() => null),
    loadAdmins().catch(() => null),
  ]);
  return { usage, records: records.r, recordsError: records.err, colleges, admins };
}
