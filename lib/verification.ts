"use client";

import { useMemo } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { getDb } from "./firebaseConfig";
import { useMySubmissions, type Submission } from "./facultyService";
import type { Verification } from "./types";

const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

function toVerification(s: Submission | undefined): Verification | null {
  if (!s || s.status !== "approved" || !s.facultyName) return null;
  return { by: s.facultyName, on: s.reviewedAt ? fmt(s.reviewedAt) : "" };
}

/** The faculty's "verified by" for records in this subject, live. Null until a faculty verifies the subject. */
export function useVerification(folderId: string | null): Verification | null {
  const subs = useMySubmissions();
  return useMemo(() => (folderId ? toVerification(subs.find((s) => s.folderId === folderId && s.status === "approved")) : null), [subs, folderId]);
}

/** Same lookup without a hook, for exports that run outside the editor (the file explorer's PDF). */
export async function loadVerification(studentUid: string, folderId: string | null): Promise<Verification | null> {
  if (!folderId) return null;
  try {
    const snap = await getDocs(query(collection(getDb(), "submissions"), where("studentUid", "==", studentUid), where("folderId", "==", folderId)));
    const row = snap.docs.map((d) => d.data()).find((x) => x.status === "approved");
    if (!row) return null;
    const at = row.reviewedAt?.toDate?.() as Date | undefined;
    return typeof row.facultyName === "string" && row.facultyName ? { by: row.facultyName, on: at ? fmt(at) : "" } : null;
  } catch {
    return null;
  }
}
