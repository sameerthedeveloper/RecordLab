import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/server/adminAuth";
import { mailConfig, sendMail } from "@/lib/server/gmail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_RECIPIENTS = 100;
const EMAIL = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]+$/;

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Plain message -> simple, readable HTML: paragraphs on blank lines, line breaks inside, links kept clickable. */
function toHtml(text: string): string {
  const paragraphs = escapeHtml(text)
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px">${p.replace(/\n/g, "<br>").replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#c2410c">$1</a>')}</p>`)
    .join("");
  return `<!doctype html><html><body style="margin:0;background:#faf7f0;padding:24px"><div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5decb;border-radius:14px;padding:28px;font:15px/1.6 Arial,Helvetica,sans-serif;color:#1c2b33">${paragraphs}<hr style="border:none;border-top:1px solid #e5decb;margin:22px 0 12px"><p style="margin:0;font-size:12px;color:#6b7780">You are receiving this because you have a Record Lab account.</p></div></body></html>`;
}

interface Body {
  subject?: unknown;
  message?: unknown;
  recipients?: unknown;
}

export async function POST(request: Request) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Only Record Lab admins can send mail." }, { status: 403 });

  const cfg = mailConfig();
  if (!cfg) return NextResponse.json({ error: "Mail isn't set up yet. Add the GMAIL_* and MAIL_SENDER environment variables (see docs/admin-mail.md)." }, { status: 501 });

  const body = (await request.json().catch(() => ({}))) as Body;
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!subject || subject.length > 150) return NextResponse.json({ error: "Write a subject of up to 150 characters." }, { status: 400 });
  if (!message || message.length > 20_000) return NextResponse.json({ error: "Write a message of up to 20,000 characters." }, { status: 400 });

  const seen = new Set<string>();
  const recipients = (Array.isArray(body.recipients) ? body.recipients : [])
    .map((r) => ({ email: String((r as { email?: unknown })?.email ?? "").trim().toLowerCase(), name: String((r as { name?: unknown })?.name ?? "").trim().slice(0, 80) }))
    .filter((r) => EMAIL.test(r.email) && !seen.has(r.email) && seen.add(r.email));
  if (recipients.length === 0) return NextResponse.json({ error: "No valid recipients." }, { status: 400 });
  if (recipients.length > MAX_RECIPIENTS) return NextResponse.json({ error: `Send at most ${MAX_RECIPIENTS} per request.` }, { status: 400 });

  const sent: string[] = [];
  const failed: { email: string; error: string }[] = [];
  // A few at a time: fast enough, gentle on Gmail's per-second limits.
  for (let i = 0; i < recipients.length; i += 5) {
    await Promise.all(
      recipients.slice(i, i + 5).map(async (r) => {
        const first = r.name.split(/\s+/)[0] || "there";
        const personalise = (s: string) => s.replace(/\{\{\s*name\s*\}\}/gi, first);
        const text = personalise(message);
        try {
          await sendMail(cfg, { to: r.email, toName: r.name || undefined, subject: personalise(subject), text, html: toHtml(text) });
          sent.push(r.email);
        } catch (e) {
          failed.push({ email: r.email, error: e instanceof Error ? e.message : "Couldn't send." });
        }
      }),
    );
  }
  return NextResponse.json({ sent: sent.length, failed });
}

/** Lets the dashboard know whether mail is configured, without exposing any secret. */
export async function GET(request: Request) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Only Record Lab admins can send mail." }, { status: 403 });
  const cfg = mailConfig();
  return NextResponse.json({ configured: Boolean(cfg), sender: cfg?.sender ?? null });
}
