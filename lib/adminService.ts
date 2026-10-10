"use client";

import { useEffect, useState } from "react";
import { collection, doc, getDoc, getDocs, limit, orderBy, query, Timestamp, where } from "firebase/firestore";
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
