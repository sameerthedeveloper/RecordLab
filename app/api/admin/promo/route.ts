import { NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { SITE_URL } from "@/lib/site";
import { buildMailHtml } from "@/lib/mailTemplate";
import { verifyAdmin } from "@/lib/server/adminAuth";
import { newCode, normalizeCode } from "@/lib/server/billing";
import { getAdminDb } from "@/lib/server/firebaseAdmin";
import { mailConfig, sendMail } from "@/lib/server/gmail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]+$/;
const fmt = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });

interface Body {
  action?: unknown;
  email?: unknown;
  days?: unknown;
  validDays?: unknown;
  note?: unknown;
  send?: unknown;
  code?: unknown;
}

async function mailCode(input: { email: string; code: string; days: number; codeExpiresAt: Date; note: string }): Promise<string | null> {
  const cfg = mailConfig();
  if (!cfg) return "Mail isn't set up yet (see docs/admin-mail.md). Copy the code and send it yourself.";
  const text = [
    "Hi,",
    input.note,
    `Your Record Lab Pro code: ${input.code}`,
    `It gives you ${input.days} days of Pro: unlimited cloud records. Use it before ${fmt(input.codeExpiresAt)}.`,
    `To redeem: sign in to Record Lab with this email address (${input.email}), open Settings, choose Billing, and enter the code under "Have a promo code?".`,
  ]
    .filter(Boolean)
    .join("\n\n");
  try {
    await sendMail(cfg, {
      to: input.email,
      subject: "Your Record Lab Pro code",
      text: `${text}\n\nOpen Record Lab: ${SITE_URL}/editor`,
      html: buildMailHtml({ subject: "Your Record Lab Pro code", text, cta: { label: "Open Record Lab", url: `${SITE_URL}/editor` } }),
    });
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : "The mail didn't go out.";
  }
}

/** Admins only. action "create" (default): makes a code for one email and optionally mails it. "resend": mails an unused code again. "revoke": deletes an unused code. */
export async function POST(request: Request) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Only Record Lab admins can do this." }, { status: 403 });
  const db = getAdminDb();
  if (!db) return NextResponse.json({ error: "Server write access isn't set up. Add FIREBASE_SERVICE_ACCOUNT (see docs/billing.md)." }, { status: 501 });

  const b = (await request.json().catch(() => ({}))) as Body;

  if (b.action === "revoke" || b.action === "resend") {
    const code = normalizeCode(typeof b.code === "string" ? b.code : "");
    const ref = db.doc(`promoCodes/${code || "x"}`);
    const snap = await ref.get();
    const d = snap.data();
    if (!code || !d) return NextResponse.json({ error: "That code doesn't exist." }, { status: 404 });
    if (d.redeemedAt) return NextResponse.json({ error: "That code was already used." }, { status: 409 });
    if (b.action === "revoke") {
      await ref.delete();
      return NextResponse.json({ ok: true });
    }
    const mailError = await mailCode({ email: d.email, code, days: d.days, codeExpiresAt: (d.codeExpiresAt as Timestamp).toDate(), note: String(d.note ?? "") });
    return NextResponse.json({ ok: !mailError, mailError });
  }

  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  const days = Math.round(Number(b.days));
  const validDays = Math.round(Number(b.validDays));
  const note = typeof b.note === "string" ? b.note.trim().slice(0, 500) : "";
  if (!EMAIL.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (!Number.isFinite(days) || days < 1 || days > 3650) return NextResponse.json({ error: "Pro length must be 1 to 3650 days." }, { status: 400 });
  if (!Number.isFinite(validDays) || validDays < 1 || validDays > 365) return NextResponse.json({ error: "Redeem-by must be 1 to 365 days from now." }, { status: 400 });

  const codeExpiresAt = new Date(Date.now() + validDays * 86_400_000);
  let code = "";
  for (let i = 0; i < 5 && !code; i++) {
    const candidate = newCode();
    try {
      await db.doc(`promoCodes/${candidate}`).create({ email, days, note, codeExpiresAt: Timestamp.fromDate(codeExpiresAt), createdBy: admin.uid, createdAt: FieldValue.serverTimestamp(), redeemedAt: null, redeemedBy: null });
      code = candidate;
    } catch {
      /* the code already exists (vanishingly rare): draw another */
    }
  }
  if (!code) return NextResponse.json({ error: "Couldn't make a code. Try again." }, { status: 500 });

  const mailError = b.send === false ? null : await mailCode({ email, code, days, codeExpiresAt, note });
  return NextResponse.json({ code, mailed: b.send !== false && !mailError, mailError });
}
