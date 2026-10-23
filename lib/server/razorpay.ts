import { createHmac, timingSafeEqual } from "node:crypto";

/** Razorpay over its REST API (no SDK needed). Keys: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET; webhook: RAZORPAY_WEBHOOK_SECRET. */
const API = "https://api.razorpay.com/v1";

export interface RazorpayOrder {
  id: string;
  amount: number;
  amount_paid: number;
  currency: string;
  status: "created" | "attempted" | "paid";
  notes: Record<string, string> | unknown[];
}

export function razorpayKeys() {
  const id = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  return id && secret ? { id, secret } : null;
}

export const webhookConfigured = () => !!process.env.RAZORPAY_WEBHOOK_SECRET;

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const keys = razorpayKeys();
  if (!keys) throw new Error("not_configured");
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Basic ${Buffer.from(`${keys.id}:${keys.secret}`).toString("base64")}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`razorpay_${res.status}`);
  return (await res.json()) as T;
}

export const createOrder = (input: { amount: number; receipt: string; notes: Record<string, string> }) =>
  call<RazorpayOrder>("/orders", { method: "POST", body: JSON.stringify({ ...input, currency: "INR" }) });

export const fetchOrder = (id: string) => call<RazorpayOrder>(`/orders/${encodeURIComponent(id)}`);

const same = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/** The signature Checkout hands the browser after a payment: HMAC-SHA256 of "order_id|payment_id" with the key secret. */
export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
  const keys = razorpayKeys();
  if (!keys) return false;
  return same(createHmac("sha256", keys.secret).update(`${orderId}|${paymentId}`).digest("hex"), signature);
}

/** The X-Razorpay-Signature header on a webhook: HMAC-SHA256 of the raw body with the webhook secret. */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  return same(createHmac("sha256", secret).update(rawBody).digest("hex"), signature);
}
