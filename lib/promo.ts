"use client";

import { collection, getDocs, limit, orderBy, query, Timestamp } from "firebase/firestore";
import { getDb, getFirebaseAuth } from "./firebaseConfig";

export const PROMO_ERRORS: Record<string, string> = {
  sign_in: "Sign in first, then enter the code.",
  not_found: "That code doesn't exist. Check it for typos.",
  used: "That code has already been used.",
  expired: "That code has expired. Ask for a new one.",
  wrong_email: "That code was issued to a different email address. Sign in with the email it was sent to.",
  not_configured: "Codes can't be redeemed yet. Please try again later.",
};

async function authedPost(path: string, body: unknown): Promise<Record<string, unknown> & { error?: string }> {
  const token = await getFirebaseAuth().currentUser?.getIdToken();
  if (!token) return { error: "sign_in" };
  const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown> & { error?: string };
  return res.ok ? data : { ...data, error: data.error ?? "failed" };
}

/** Redeems a code for the signed-in person. Resolves with the new end date; throws a code from PROMO_ERRORS. */
export async function redeemPromoCode(code: string): Promise<Date> {
  const r = await authedPost("/api/billing/redeem", { code });
  if (r.error || typeof r.expiresAt !== "string") throw new Error(r.error ?? "failed");
  return new Date(r.expiresAt);
}

/* ----------------------------------------------------------------- admin */

export interface PromoRow {
  code: string;
  email: string;
  days: number;
  note: string;
  codeExpiresAt: Date | null;
  createdAt: Date | null;
  redeemedAt: Date | null;
  redeemedBy: string | null;
}

const date = (v: unknown) => (v instanceof Timestamp ? v.toDate() : null);

export async function loadPromos(): Promise<PromoRow[]> {
  const snap = await getDocs(query(collection(getDb(), "promoCodes"), orderBy("createdAt", "desc"), limit(200)));
  return snap.docs.map((d) => {
    const x = d.data();
    return {
      code: d.id,
      email: String(x.email ?? ""),
      days: Number(x.days ?? 0),
      note: String(x.note ?? ""),
      codeExpiresAt: date(x.codeExpiresAt),
      createdAt: date(x.createdAt),
      redeemedAt: date(x.redeemedAt),
      redeemedBy: typeof x.redeemedBy === "string" ? x.redeemedBy : null,
    };
  });
}

export async function createPromo(input: { email: string; days: number; validDays: number; note: string; send: boolean }): Promise<{ code: string; mailed: boolean; mailError: string | null }> {
  const r = await authedPost("/api/admin/promo", input);
  if (r.error || typeof r.code !== "string") throw new Error(r.error ?? "Couldn't make the code.");
  return { code: r.code, mailed: r.mailed === true, mailError: typeof r.mailError === "string" ? r.mailError : null };
}

export async function resendPromo(code: string): Promise<string | null> {
  const r = await authedPost("/api/admin/promo", { action: "resend", code });
  if (r.error) throw new Error(r.error);
  return typeof r.mailError === "string" ? r.mailError : null;
}

export async function revokePromo(code: string): Promise<void> {
  const r = await authedPost("/api/admin/promo", { action: "revoke", code });
  if (r.error) throw new Error(r.error);
}
