import { NextResponse } from "next/server";
import { buildMailHtml } from "@/lib/mailTemplate";
import { mailConfig, sendMail } from "@/lib/server/gmail";
import { welcomeMail } from "@/lib/welcomeMail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Only accounts this new are welcomed, so switching this on never mails people who joined long ago. */
const NEW_ACCOUNT_MS = 48 * 60 * 60 * 1000;

/**
 * Sends the welcome email once per new account. The caller proves who they are with their ID token;
 * the one-time claim is a document at welcomes/<uid>, created as that user (the rules allow only the
 * owner to create it, and a second create fails), so a repeat call can never send a second mail.
 * Only verified emails are welcomed (Google sign-in), so this can't be used to mail strangers.
 */
export async function POST(request: Request) {
  const idToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const project = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const cfg = mailConfig();
  if (!idToken || !apiKey || !project || !cfg) return NextResponse.json({ sent: false });

  const lookup = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!lookup.ok) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const user = ((await lookup.json()) as { users?: { localId: string; email?: string; emailVerified?: boolean; displayName?: string; createdAt?: string }[] }).users?.[0];
  if (!user?.email || !user.emailVerified) return NextResponse.json({ sent: false });
  if (Date.now() - Number(user.createdAt ?? 0) > NEW_ACCOUNT_MS) return NextResponse.json({ sent: false });

  const base = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/welcomes`;
  const auth = { Authorization: `Bearer ${idToken}` };
  const claim = await fetch(`${base}?documentId=${encodeURIComponent(user.localId)}`, {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ fields: { sentAt: { timestampValue: new Date().toISOString() } } }),
  });
  if (!claim.ok) return NextResponse.json({ sent: false }); // already welcomed (409), or the rules aren't deployed

  const mail = welcomeMail(user.displayName);
  try {
    await sendMail(cfg, {
      to: user.email,
      toName: user.displayName,
      subject: mail.subject,
      text: `${mail.text}\n\n${mail.cta.label}: ${mail.cta.url}`,
      html: buildMailHtml({ subject: mail.subject, text: mail.text, cta: mail.cta }),
    });
    return NextResponse.json({ sent: true });
  } catch {
    // Release the claim so the next visit tries again.
    await fetch(`${base}/${encodeURIComponent(user.localId)}`, { method: "DELETE", headers: auth }).catch(() => {});
    return NextResponse.json({ sent: false }, { status: 502 });
  }
}
