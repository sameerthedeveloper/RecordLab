"use client";

import { useEffect, useState } from "react";
import { collection, doc, getCountFromServer, getDoc, onSnapshot, query, serverTimestamp, setDoc, Timestamp, where } from "firebase/firestore";
import { useAuthUser } from "./authService";
import { DEFAULT_BILLING_CONFIG, sanitizeBillingConfig, type BillingConfig, type PlanId, type Subscription } from "./billingShared";
import { getDb, getFirebaseAuth } from "./firebaseConfig";

const configRef = () => doc(getDb(), "config", "billing");

/** Thrown when a free account is full. The editor catches this one to open the upgrade sheet. */
export class RecordLimitError extends Error {
  constructor(public limit: number) {
    super(`The free plan keeps ${limit} records. Upgrade to save more.`);
  }
}

/** Live plan prices and the free limit (null until the first read). Unreadable or missing: plans off. */
export function useBillingConfig(): BillingConfig | null {
  const [cfg, setCfg] = useState<BillingConfig | null>(null);
  useEffect(
    () =>
      onSnapshot(
        configRef(),
        (snap) => setCfg(snap.exists() ? sanitizeBillingConfig(snap.data()) : DEFAULT_BILLING_CONFIG),
        () => setCfg(DEFAULT_BILLING_CONFIG)
      ),
    []
  );
  return cfg;
}

/** Admins only (the rules refuse anyone else). */
export async function saveBillingConfig(next: BillingConfig, adminUid: string): Promise<void> {
  await setDoc(configRef(), { ...sanitizeBillingConfig({ ...next }), updatedBy: adminUid, updatedAt: serverTimestamp() });
}

const toSubscription = (x: Record<string, unknown> | undefined): Subscription | null => {
  const at = x?.expiresAt instanceof Timestamp ? x.expiresAt.toDate() : null;
  return at && at.getTime() > Date.now() ? { plan: x?.plan === "year" ? "year" : "month", expiresAt: at } : null;
};

/** The signed-in person's paid plan: undefined while loading, null when they have none (or it ran out). */
export function useSubscription(): Subscription | null | undefined {
  const user = useAuthUser();
  const [sub, setSub] = useState<Subscription | null | undefined>(undefined);
  useEffect(() => {
    if (!user) {
      setSub(null);
      return;
    }
    return onSnapshot(
      doc(getDb(), "subscriptions", user.uid),
      (snap) => setSub(toSubscription(snap.data())),
      () => setSub(null)
    );
  }, [user]);
  return sub;
}

/**
 * Whether to show ads: not until the sign-in has been restored and the plan is known (so a Pro member never
 * gets even one request), and never for anyone on Pro.
 */
export function useShowAds(): boolean {
  const sub = useSubscription();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let live = true;
    getFirebaseAuth()
      .authStateReady()
      .then(() => live && setReady(true))
      .catch(() => live && setReady(true));
    return () => {
      live = false;
    };
  }, []);
  return ready && sub === null;
}

/**
 * Called before a NEW cloud record is created. Plans off, or a paid plan running: always fine. Otherwise the
 * person's record count must be under the free limit. (Browser-side check: it keeps honest accounts honest,
 * it is not a security boundary, because Firestore rules cannot count documents.)
 */
export async function assertCanCreateRecord(uid: string): Promise<void> {
  let cfg = DEFAULT_BILLING_CONFIG;
  try {
    const snap = await getDoc(configRef());
    if (snap.exists()) cfg = sanitizeBillingConfig(snap.data());
  } catch {
    return; // can't tell: never block someone's work on a failed read
  }
  if (!cfg.enabled) return;
  try {
    const sub = await getDoc(doc(getDb(), "subscriptions", uid));
    if (toSubscription(sub.data())) return;
    const n = (await getCountFromServer(query(collection(getDb(), "documents"), where("userId", "==", uid)))).data().count;
    if (n >= cfg.freeLimit) throw new RecordLimitError(cfg.freeLimit);
  } catch (e) {
    if (e instanceof RecordLimitError) throw e;
  }
}

/* ------------------------------------------------------------- checkout */

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}
interface RazorpayCtor {
  new (options: Record<string, unknown>): { open: () => void; on: (event: string, cb: (r: { error?: { description?: string } }) => void) => void };
}

let scriptPromise: Promise<RazorpayCtor> | null = null;

function loadCheckout(): Promise<RazorpayCtor> {
  const w = window as unknown as { Razorpay?: RazorpayCtor };
  if (w.Razorpay) return Promise.resolve(w.Razorpay);
  scriptPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => (w.Razorpay ? resolve(w.Razorpay) : reject(new Error("checkout_missing")));
    s.onerror = () => {
      scriptPromise = null;
      reject(new Error("checkout_blocked"));
    };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export const CHECKOUT_MESSAGES: Record<string, string> = {
  sign_in: "Sign in first, then upgrade.",
  not_configured: "Payments aren't switched on yet. Please try again later.",
  plans_off: "Paid plans aren't open right now.",
  checkout_blocked: "The payment window couldn't load. Check your connection or ad blocker and try again.",
  not_paid: "Razorpay hasn't confirmed this payment yet. If money left your account it will show up here within a few minutes.",
  provider_failed: "Razorpay didn't answer. Try again in a moment.",
  verify_failed: "Your payment went through but we couldn't confirm it yet. Don't pay again: Pro switches on within a few minutes.",
};

/** Resolves with the new end date once the payment is confirmed; rejects with a code from CHECKOUT_MESSAGES, or "dismissed" when the person closed the window. */
export async function startCheckout(plan: PlanId): Promise<Date> {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error("sign_in");
  const token = await user.getIdToken();
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const orderRes = await fetch("/api/billing/order", { method: "POST", headers, body: JSON.stringify({ plan }) });
  const order = (await orderRes.json().catch(() => ({}))) as { keyId?: string; orderId?: string; amount?: number; currency?: string; error?: string };
  if (!orderRes.ok || !order.orderId) throw new Error(order.error ?? "provider_failed");

  const Razorpay = await loadCheckout();
  return new Promise<Date>((resolve, reject) => {
    const rzp = new Razorpay({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amount,
      currency: order.currency,
      name: "Record Lab",
      description: plan === "year" ? "Pro, one year" : "Pro, one month",
      prefill: { email: user.email ?? "", name: user.displayName ?? "" },
      theme: { color: "#c2410c" },
      modal: { ondismiss: () => reject(new Error("dismissed")) },
      handler: async (r: RazorpayResponse) => {
        try {
          const res = await fetch("/api/billing/verify", {
            method: "POST",
            headers: { ...headers, Authorization: `Bearer ${await user.getIdToken()}` },
            body: JSON.stringify({ orderId: r.razorpay_order_id, paymentId: r.razorpay_payment_id, signature: r.razorpay_signature }),
          });
          const data = (await res.json().catch(() => ({}))) as { expiresAt?: string; error?: string };
          if (!res.ok || !data.expiresAt) throw new Error(data.error === "not_paid" ? "not_paid" : "verify_failed");
          resolve(new Date(data.expiresAt));
        } catch (e) {
          reject(e);
        }
      },
    });
    rzp.open();
  });
}
