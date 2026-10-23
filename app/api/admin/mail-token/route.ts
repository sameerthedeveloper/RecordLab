import { NextResponse } from "next/server";

/**
 * One-off helper to mint the Gmail refresh token, for local setup only (docs/admin-mail.md).
 * Open http://localhost:3000/api/admin/mail-token while `npm run dev` is running; sign in as the
 * Workspace sender; copy the values it shows into .env.local. It refuses to run in production.
 * Register http://localhost:3000/api/admin/mail-token as an Authorized redirect URI on the OAuth client.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SCOPE = "openid email https://www.googleapis.com/auth/gmail.send";
const page = (body: string, status = 200) =>
  new NextResponse(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Gmail setup</title><body style="font:15px/1.6 system-ui,sans-serif;max-width:640px;margin:48px auto;padding:0 20px;color:#1c2b33">${body}</body>`, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") return page("<p>This helper only runs locally.</p>", 404);

  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  if (!clientId || !clientSecret) return page("<h1>Missing client</h1><p>Set <code>GMAIL_CLIENT_ID</code> and <code>GMAIL_CLIENT_SECRET</code> in <code>.env.local</code> and restart <code>npm run dev</code>.</p>", 400);

  const url = new URL(request.url);
  const redirectUri = `${url.origin}${url.pathname}`;
  const code = url.searchParams.get("code");
  const cookieState = request.headers.get("cookie")?.match(/rl_oauth_state=([^;]+)/)?.[1];

  // Step 1: send the person to Google.
  if (!code && !url.searchParams.get("error")) {
    const state = crypto.randomUUID();
    const auth = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    auth.search = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, response_type: "code", scope: SCOPE, access_type: "offline", prompt: "consent", state }).toString();
    const res = NextResponse.redirect(auth);
    res.cookies.set("rl_oauth_state", state, { httpOnly: true, sameSite: "lax", path: "/api/admin/mail-token", maxAge: 600 });
    return res;
  }

  if (url.searchParams.get("error")) return page(`<h1>Google said no</h1><p><code>${esc(url.searchParams.get("error")!)}</code></p><p><a href="${url.pathname}">Try again</a></p>`, 400);
  if (!cookieState || cookieState !== url.searchParams.get("state")) return page(`<h1>Start again</h1><p>The sign-in didn't start here. <a href="${url.pathname}">Begin from this page</a>.</p>`, 400);

  // Step 2: trade the code for tokens.
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code: code!, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" }),
  });
  const t = (await tokenRes.json().catch(() => ({}))) as { refresh_token?: string; id_token?: string; error?: string; error_description?: string };
  if (!tokenRes.ok) return page(`<h1>Couldn't get the token</h1><p><code>${esc(t.error_description || t.error || "unknown error")}</code></p><p><a href="${url.pathname}">Try again</a></p>`, 400);
  if (!t.refresh_token) return page(`<h1>No refresh token</h1><p>Google only gives one the first time an account approves this app. Remove "Record Lab" at <a href="https://myaccount.google.com/permissions">myaccount.google.com/permissions</a> and <a href="${url.pathname}">try again</a>.</p>`, 400);

  let email = "";
  try {
    email = JSON.parse(Buffer.from(String(t.id_token).split(".")[1], "base64url").toString()).email ?? "";
  } catch {}

  return page(
    `<h1>Done</h1><p>Copy these two lines into <code>.env.local</code>, restart <code>npm run dev</code>, and add them to Vercel too.</p>
<pre style="background:#f4efe3;padding:14px;border-radius:10px;overflow:auto;white-space:pre-wrap;word-break:break-all">GMAIL_REFRESH_TOKEN=${esc(t.refresh_token)}\nMAIL_SENDER=${esc(email)}</pre>
<p>Keep the token private. Then close this tab.</p>`,
  );
}
