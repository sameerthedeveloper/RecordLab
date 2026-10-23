import { NextResponse } from "next/server";
import { firstName } from "@/lib/adminFormat";
import { buildMailHtml, safeUrl } from "@/lib/mailTemplate";
import { verifyAdmin } from "@/lib/server/adminAuth";
import { mailConfig, sendMail } from "@/lib/server/gmail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_RECIPIENTS = 100;
const EMAIL = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]+$/;

interface Body {
  subject?: unknown;
  message?: unknown;
  recipients?: unknown;
  cta?: { label?: unknown; url?: unknown } | null;
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

  const ctaLabel = typeof body.cta?.label === "string" ? body.cta.label.trim().slice(0, 60) : "";
  const ctaUrl = typeof body.cta?.url === "string" ? safeUrl(body.cta.url) : null;
  if (ctaLabel && !ctaUrl) return NextResponse.json({ error: "The button link must start with https://." }, { status: 400 });
  const cta = ctaLabel && ctaUrl ? { label: ctaLabel, url: ctaUrl } : null;

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
        const first = firstName(r.name);
        const personalise = (s: string) => s.replace(/\{\{\s*name\s*\}\}/gi, first);
        const text = personalise(message);
        const subj = personalise(subject);
        try {
          await sendMail(cfg, { to: r.email, toName: r.name || undefined, subject: subj, text: cta ? `${text}\n\n${cta.label}: ${cta.url}` : text, html: buildMailHtml({ subject: subj, text, cta }) });
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
