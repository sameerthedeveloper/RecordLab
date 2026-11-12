import { NextResponse } from "next/server";
import { activateOrder } from "@/lib/server/billing";
import { verifyWebhookSignature } from "@/lib/server/razorpay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Event {
  event?: string;
  payload?: { payment?: { entity?: { id?: string; order_id?: string } }; order?: { entity?: { id?: string } } };
}

/**
 * Razorpay tells us a payment went through, even if the person closed the tab before the browser could say so.
 * Set up in Razorpay > Settings > Webhooks with events payment.captured and order.paid, and the same secret as
 * RAZORPAY_WEBHOOK_SECRET.
 */
export async function POST(request: Request) {
  const raw = await request.text();
  if (!verifyWebhookSignature(raw, request.headers.get("x-razorpay-signature") ?? "")) {
    return NextResponse.json({ error: "bad_signature" }, { status: 400 });
  }
  const e = JSON.parse(raw) as Event;
  if (e.event !== "payment.captured" && e.event !== "order.paid") return NextResponse.json({ ok: true });

  const payment = e.payload?.payment?.entity;
  const orderId = payment?.order_id ?? e.payload?.order?.entity?.id;
  if (!payment?.id || !orderId) return NextResponse.json({ ok: true });
  try {
    await activateOrder(orderId, payment.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    // An order that isn't ours or isn't paid will never succeed: acknowledge. Anything else: let Razorpay retry.
    if (err instanceof Error && err.message === "order_not_paid") return NextResponse.json({ ok: true });
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
