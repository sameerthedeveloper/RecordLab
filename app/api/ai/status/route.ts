import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/server/adminAuth";
import { aiAvailability } from "@/lib/server/aiProvider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** What the server can use (which keys exist, whether the keyless provider is on). Admins only; never returns a key. */
export async function GET(request: Request) {
  if (!(await verifyAdmin(request))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return NextResponse.json(aiAvailability());
}
