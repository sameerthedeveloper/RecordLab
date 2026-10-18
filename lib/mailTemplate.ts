/**
 * The HTML email Record Lab sends from the admin panel. Pure string building, so the server uses it to
 * send and the dashboard uses the very same function to preview. Email clients ignore most modern CSS,
 * so it is tables with inline styles, system fonts and a bulletproof button.
 */
import { SITE_URL } from "./site";

export interface MailCta {
  label: string;
  url: string;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Only http(s) links, so a button can never carry javascript: or data: URLs. */
export function safeUrl(url: string): string | null {
  try {
    const u = new URL(url.trim());
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

const INK = "#1c2b33";
const SOFT = "#6b7780";
const LINE = "#e5decb";
const ACCENT = "#c2410c";

/** Plain text -> paragraphs on blank lines, line breaks inside them, bare links made clickable. */
function paragraphs(text: string): string {
  return esc(text)
    .split(/\n{2,}/)
    .filter((p) => p.trim())
    .map((p) => `<p style="margin:0 0 18px;font:16px/1.7 Arial,Helvetica,sans-serif;color:${INK}">${p.replace(/\n/g, "<br>").replace(/(https?:\/\/[^\s<]+)/g, `<a href="$1" style="color:${ACCENT};text-decoration:underline">$1</a>`)}</p>`)
    .join("");
}

/** The app icon, hosted on the site: email clients cannot show SVG, so this is the PNG. */
export const MAIL_LOGO_URL = `${SITE_URL}/icons/icon-192.png`;

export function buildMailHtml({ subject, text, cta }: { subject: string; text: string; cta?: MailCta | null }): string {
  const url = cta?.label.trim() && cta.url ? safeUrl(cta.url) : null;
  const preheader = esc(text.replace(/\s+/g, " ").trim().slice(0, 110));
  const sans = "Arial,Helvetica,sans-serif";
  const serif = "Georgia,'Times New Roman',serif";
  const logo = (size: number) =>
    `<img src="${MAIL_LOGO_URL}" width="${size}" height="${size}" alt="Record Lab" style="display:block;border:0;outline:none;border-radius:${Math.round(size * 0.23)}px">`;
  const button = url
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 26px"><tr><td style="border-radius:10px;background:${ACCENT}"><a href="${esc(url)}" style="display:inline-block;padding:14px 28px;font:700 15px ${sans};color:#ffffff;text-decoration:none;border-radius:10px">${esc(cta!.label.trim())}</a></td></tr></table>`
    : "";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#f4efe3">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4efe3"><tr><td align="center" style="padding:32px 14px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid ${LINE};border-radius:16px;overflow:hidden">
<tr><td style="padding:26px 34px 22px;border-bottom:1px solid ${LINE}">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="vertical-align:middle">${logo(48)}</td>
<td style="padding-left:14px;vertical-align:middle"><div style="font:700 22px/1.1 ${serif};color:${INK};letter-spacing:-0.01em">Record Lab</div><div style="margin-top:4px;font:13px/1.2 ${sans};color:${SOFT}">Lab records, done properly</div></td>
</tr></table></td></tr>
<tr><td style="height:4px;background:${ACCENT};font-size:0;line-height:0">&nbsp;</td></tr>
<tr><td style="padding:34px 34px 14px">
<h1 style="margin:0 0 20px;font:700 24px/1.3 ${serif};color:${INK}">${esc(subject)}</h1>
${paragraphs(text)}${button}
</td></tr>
<tr><td style="padding:22px 34px 28px;background:#faf7f0;border-top:1px solid ${LINE}">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="vertical-align:top">${logo(28)}</td>
<td style="padding-left:11px;font:12px/1.65 ${sans};color:${SOFT}">
<strong style="color:${INK}">Record Lab</strong>, a product by Cogniheim<br>
<a href="${SITE_URL}" style="color:${ACCENT};text-decoration:none">${SITE_URL.replace(/^https?:\/\//, "")}</a> &nbsp;·&nbsp; <a href="${SITE_URL}/editor" style="color:${ACCENT};text-decoration:none">Open the editor</a><br>
<span style="color:#8a949b">You are receiving this because you have a Record Lab account. Reply to this email if you need help.</span>
</td></tr></table>
</td></tr>
</table></td></tr></table></body></html>`;
}
