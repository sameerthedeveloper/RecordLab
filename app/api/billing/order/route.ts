import { NextResponse } from "next/server";
import { amountFor, isPlan, readBillingConfig } from "@/lib/server/billing";
import { adminSdkConfigured } from "@/lib/server/firebaseAdmin";
import { createOrder, razorpayKeys } from "@/lib/server/razorpay";
import { verifyUser } from "@/lib/server/userAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Starts a payment: prices the plan on the server and creates the Razorpay order the browser then pays. */
export async function POST(request: Request) {
  const user = await verifyUser(request);
  if (!user) return NextResponse.json({ error: "sign_in" }, { status: 401 });
  const keys = razorpayKeys();
  if (!keys || !adminSdkConfigured()) return NextResponse.json({ error: "not_configured" }, { status: 501 });

  const body = (await request.json().catch(() => ({}))) as { plan?: unknown };
  if (!isPlan(body.plan)) return NextResponse.json({ error: "bad_plan" }, { status: 400 });
  const cfg = await readBillingConfig();
  if (!cfg.enabled) return NextResponse.json({ error: "plans_off" }, { status: 409 });

  try {
    const amount = amountFor(cfg, body.plan);
    const order = await createOrder({ amount, receipt: `rl_${user.uid.slice(0, 10)}_${Date.now().toString(36)}`, notes: { uid: user.uid, plan: body.plan } });
    return NextResponse.json({ keyId: keys.id, orderId: order.id, amount: order.amount, currency: order.currency, email: user.email });
  } catch {
    return NextResponse.json({ error: "provider_failed" }, { status: 502 });
  }
}
