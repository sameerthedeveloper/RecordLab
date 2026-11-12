import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/server/adminAuth";
import { adminSdkConfigured } from "@/lib/server/firebaseAdmin";
import { razorpayKeys, webhookConfigured } from "@/lib/server/razorpay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Tells the billing page which parts of the server setup exist, without exposing any secret. */
export async function GET(request: Request) {
  if (!(await verifyAdmin(request))) return NextResponse.json({ error: "Only Record Lab admins can see this." }, { status: 403 });
  const keys = razorpayKeys();
  return NextResponse.json({
    razorpayKeys: !!keys,
    testMode: !!keys?.id.startsWith("rzp_test_"),
    webhookSecret: webhookConfigured(),
    adminSdk: adminSdkConfigured(),
  });
}
