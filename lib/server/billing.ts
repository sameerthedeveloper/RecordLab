import { randomInt } from "node:crypto";
import { FieldValue, Timestamp, type DocumentSnapshot } from "firebase-admin/firestore";
import { DEFAULT_BILLING_CONFIG, PLANS, priceOf, sanitizeBillingConfig, type BillingConfig, type PlanId } from "../billingShared";
import { getAdminDb } from "./firebaseAdmin";
import { fetchOrder, type RazorpayOrder } from "./razorpay";

export const isPlan = (v: unknown): v is PlanId => PLANS.some((p) => p.id === v);

/** The admin's saved prices, read with the Admin SDK. Missing document: the defaults. */
export async function readBillingConfig(): Promise<BillingConfig> {
  const db = getAdminDb();
  if (!db) return DEFAULT_BILLING_CONFIG;
  const snap = await db.doc("config/billing").get();
  return snap.exists ? sanitizeBillingConfig(snap.data()) : DEFAULT_BILLING_CONFIG;
}

export const amountFor = (cfg: BillingConfig, plan: PlanId) => priceOf(cfg, plan);

/** When Pro would end after adding `days`: from the current end if still running, else from now (renewals stack, never overlap). */
function extendedExpiry(sub: DocumentSnapshot, days: number): Date {
  const current = (sub.data()?.expiresAt as Timestamp | undefined)?.toDate();
  const from = current && current.getTime() > Date.now() ? current : new Date();
  return new Date(from.getTime() + days * 86_400_000);
}

/**
 * Turns a paid Razorpay order into subscription time. Safe to call twice for the same payment (the browser
 * confirming and the webhook arriving both do): the payment id is recorded once, inside a transaction, and a
 * repeat changes nothing. A renewal while still subscribed adds on to the end date instead of overlapping it.
 */
export async function activateOrder(orderId: string, paymentId: string): Promise<{ uid: string; plan: PlanId; expiresAt: Date; fresh: boolean }> {
  const db = getAdminDb();
  if (!db) throw new Error("admin_sdk_missing");

  const order: RazorpayOrder = await fetchOrder(orderId);
  const notes = (Array.isArray(order.notes) ? {} : order.notes) as Record<string, string>;
  const uid = notes.uid;
  const plan = notes.plan;
  if (order.status !== "paid" || !uid || !isPlan(plan)) throw new Error("order_not_paid");
  const days = PLANS.find((p) => p.id === plan)!.days;

  return db.runTransaction(async (tx) => {
    const payRef = db.doc(`payments/${paymentId}`);
    const subRef = db.doc(`subscriptions/${uid}`);
    const [pay, sub] = await Promise.all([tx.get(payRef), tx.get(subRef)]);
    if (pay.exists) {
      const at = (sub.data()?.expiresAt as Timestamp | undefined)?.toDate() ?? new Date();
      return { uid, plan, expiresAt: at, fresh: false };
    }
    const expiresAt = extendedExpiry(sub, days);
    tx.set(payRef, { uid, plan, orderId, amount: order.amount_paid, paidAt: FieldValue.serverTimestamp() });
    tx.set(subRef, { plan, expiresAt: Timestamp.fromDate(expiresAt), lastPaymentId: paymentId, updatedAt: FieldValue.serverTimestamp() });
    return { uid, plan, expiresAt, fresh: true };
  });
}

/* ---------------------------------------------------------- promo codes */

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I

/** A code as people type it ("rl k7qd m2xp", "RLK7QDM2XP") becomes the stored form "RL-K7QD-M2XP". */
export function normalizeCode(raw: string): string {
  const c = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const body = c.startsWith("RL") ? c.slice(2) : c;
  return body.length === 8 ? `RL-${body.slice(0, 4)}-${body.slice(4)}` : "";
}

export function newCode(): string {
  const pick = () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  const part = () => Array.from({ length: 4 }, pick).join("");
  return `RL-${part()}-${part()}`;
}

/**
 * Redeems an admin-issued promo code: it must exist, be unused, still inside its redeem-by date, and have been
 * issued to the caller's own email address. Adds the code's days to the caller's Pro, once.
 */
export async function redeemPromo(code: string, uid: string, email: string | null): Promise<{ plan: PlanId; expiresAt: Date }> {
  const db = getAdminDb();
  if (!db) throw new Error("admin_sdk_missing");
  return db.runTransaction(async (tx) => {
    const codeRef = db.doc(`promoCodes/${code}`);
    const subRef = db.doc(`subscriptions/${uid}`);
    const [c, sub] = await Promise.all([tx.get(codeRef), tx.get(subRef)]);
    const d = c.data();
    if (!d) throw new Error("not_found");
    if (d.redeemedAt) throw new Error("used");
    if ((d.codeExpiresAt as Timestamp).toDate().getTime() < Date.now()) throw new Error("expired");
    if (!email || String(d.email).toLowerCase() !== email.toLowerCase()) throw new Error("wrong_email");

    const days = Number(d.days);
    const plan: PlanId = days >= 180 ? "year" : "month";
    const expiresAt = extendedExpiry(sub, days);
    tx.update(codeRef, { redeemedAt: FieldValue.serverTimestamp(), redeemedBy: uid });
    tx.set(subRef, { plan, expiresAt: Timestamp.fromDate(expiresAt), source: "promo", lastPromoCode: code, updatedAt: FieldValue.serverTimestamp() });
    return { plan, expiresAt };
  });
}
