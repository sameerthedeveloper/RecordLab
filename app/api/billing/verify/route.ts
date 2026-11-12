import { NextResponse } from "next/server";
import { activateOrder } from "@/lib/server/billing";
import { fetchOrder, verifyPaymentSignature } from "@/lib/server/razorpay";
import { verifyUser } from "@/lib/server/userAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The browser's "I paid": checks Razorpay's signature, then turns the payment into subscription time. */
export async function POST(request: Request) {
  const user = await verifyUser(request);
  if (!user) return NextResponse.json({ error: "sign_in" }, { status: 401 });

  const b = (await request.json().catch(() => ({}))) as { orderId?: unknown; paymentId?: unknown; signature?: unknown };
  const orderId = typeof b.orderId === "string" ? b.orderId : "";
  const paymentId = typeof b.paymentId === "string" ? b.paymentId : "";
  const signature = typeof b.signature === "string" ? b.signature : "";
  if (!orderId || !paymentId || !signature || !verifyPaymentSignature(orderId, paymentId, signature)) {
    return NextResponse.json({ error: "bad_signature" }, { status: 400 });
  }

  try {
    // The order must be this person's own, so a stolen receipt can't credit someone else's account.
    const order = await fetchOrder(orderId);
    const owner = Array.isArray(order.notes) ? "" : order.notes.uid;
    if (owner !== user.uid) return NextResponse.json({ error: "not_yours" }, { status: 403 });
    const sub = await activateOrder(orderId, paymentId);
    return NextResponse.json({ plan: sub.plan, expiresAt: sub.expiresAt.toISOString() });
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    return NextResponse.json({ error: code === "order_not_paid" ? "not_paid" : "failed" }, { status: code === "order_not_paid" ? 409 : 500 });
  }
}
