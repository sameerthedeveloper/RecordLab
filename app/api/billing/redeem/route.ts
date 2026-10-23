import { NextResponse } from "next/server";
import { normalizeCode, redeemPromo } from "@/lib/server/billing";
import { adminSdkConfigured } from "@/lib/server/firebaseAdmin";
import { verifyUser } from "@/lib/server/userAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUS: Record<string, number> = { not_found: 404, used: 409, expired: 410, wrong_email: 403 };

/** Redeems a promo code for the signed-in person. */
export async function POST(request: Request) {
  const user = await verifyUser(request);
  if (!user) return NextResponse.json({ error: "sign_in" }, { status: 401 });
  if (!adminSdkConfigured()) return NextResponse.json({ error: "not_configured" }, { status: 501 });

  const body = (await request.json().catch(() => ({}))) as { code?: unknown };
  const code = normalizeCode(typeof body.code === "string" ? body.code : "");
  if (!code) return NextResponse.json({ error: "not_found" }, { status: 404 });

  try {
    const sub = await redeemPromo(code, user.uid, user.email);
    return NextResponse.json({ plan: sub.plan, expiresAt: sub.expiresAt.toISOString() });
  } catch (e) {
    const err = e instanceof Error ? e.message : "";
    return NextResponse.json({ error: err in STATUS ? err : "failed" }, { status: STATUS[err] ?? 500 });
  }
}
