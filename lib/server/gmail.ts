/**
 * Sends mail through the Gmail API as the Google Workspace account that owns the refresh token.
 * No SMTP password and no extra dependency: an OAuth refresh token with the gmail.send scope is
 * exchanged for a short-lived access token, then each message is posted as base64url RFC 822.
 * Server only: reads GMAIL_* environment variables.
 */

export interface MailConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  /** The Workspace address mail is sent from (the account that granted the token). */
  sender: string;
  senderName: string;
  replyTo?: string;
}

export function mailConfig(): MailConfig | null {
  const { GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, MAIL_SENDER, MAIL_SENDER_NAME, MAIL_REPLY_TO } = process.env;
  if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN || !MAIL_SENDER) return null;
  return { clientId: GMAIL_CLIENT_ID, clientSecret: GMAIL_CLIENT_SECRET, refreshToken: GMAIL_REFRESH_TOKEN, sender: MAIL_SENDER, senderName: MAIL_SENDER_NAME || "Record Lab", replyTo: MAIL_REPLY_TO };
}

let cached: { token: string; expires: number } | null = null;

async function accessToken(cfg: MailConfig): Promise<string> {
  if (cached && cached.expires > Date.now() + 30_000) return cached.token;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: cfg.clientId, client_secret: cfg.clientSecret, refresh_token: cfg.refreshToken, grant_type: "refresh_token" }),
  });
  const json = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error_description?: string };
  if (!res.ok || !json.access_token) throw new Error(json.error_description || "Google refused the mail credentials. Create a new refresh token.");
  cached = { token: json.access_token, expires: Date.now() + (json.expires_in ?? 3600) * 1000 };
  return cached.token;
}

const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64");
const b64url = (s: string) => Buffer.from(s, "utf8").toString("base64url");
/** RFC 2047 encoded-word for non-ASCII headers (subject, names). */
const header = (s: string) => (/^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${b64(s)}?=`);
const wrap76 = (s: string) => s.replace(/(.{76})/g, "$1\r\n");
/** Header values must never carry a line break (header injection). */
const oneLine = (s: string) => s.replace(/[\r\n]+/g, " ").trim();

export interface OutgoingMail {
  to: string;
  toName?: string;
  subject: string;
  text: string;
  html: string;
}

function buildMessage(cfg: MailConfig, mail: OutgoingMail): string {
  const boundary = `rl_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  const from = `${header(oneLine(cfg.senderName))} <${cfg.sender}>`;
  const to = mail.toName ? `${header(oneLine(mail.toName))} <${mail.to}>` : mail.to;
  return [
    `From: ${from}`,
    `To: ${to}`,
    cfg.replyTo ? `Reply-To: ${cfg.replyTo}` : "",
    `Subject: ${header(oneLine(mail.subject))}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    wrap76(b64(mail.text)),
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    wrap76(b64(mail.html)),
    `--${boundary}--`,
    "",
  ].join("\r\n");
}

export async function sendMail(cfg: MailConfig, mail: OutgoingMail): Promise<void> {
  const token = await accessToken(cfg);
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw: b64url(buildMessage(cfg, mail)) }),
  });
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(j.error?.message || `Gmail answered ${res.status}`);
  }
}
