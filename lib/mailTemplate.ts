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
    .map((p) => `<p style="margin:0 0 16px;font:16px/1.65 Arial,Helvetica,sans-serif;color:${INK}">${p.replace(/\n/g, "<br>").replace(/(https?:\/\/[^\s<]+)/g, `<a href="$1" style="color:${ACCENT};text-decoration:underline">$1</a>`)}</p>`)
    .join("");
}

export function buildMailHtml({ subject, text, cta }: { subject: string; text: string; cta?: MailCta | null }): string {
  const url = cta?.label.trim() && cta.url ? safeUrl(cta.url) : null;
  const preheader = esc(text.replace(/\s+/g, " ").trim().slice(0, 110));
  const button = url
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 22px"><tr><td style="border-radius:10px;background:${ACCENT}"><a href="${esc(url)}" style="display:inline-block;padding:13px 26px;font:700 15px Arial,Helvetica,sans-serif;color:#ffffff;text-decoration:none;border-radius:10px">${esc(cta!.label.trim())}</a></td></tr></table>`
    : "";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#faf7f0">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf7f0"><tr><td align="center" style="padding:28px 14px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px">
<tr><td style="padding:0 4px 14px">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="width:30px;height:38px;border:1.5px solid ${LINE};border-radius:3px;background:#ffffff;vertical-align:middle;padding:7px 5px">
<div style="height:2px;background:${ACCENT};opacity:.7;margin-bottom:5px"></div><div style="height:2px;background:${INK};opacity:.25;margin-bottom:5px"></div><div style="height:2px;width:60%;background:${INK};opacity:.25"></div></td>
<td style="padding-left:11px;font:700 21px Georgia,'Times New Roman',serif;color:${INK};letter-spacing:-0.01em">Record Lab</td></tr></table>
</td></tr>
<tr><td style="background:#ffffff;border:1px solid ${LINE};border-top:4px solid ${ACCENT};border-radius:14px;padding:30px 30px 14px">
<h1 style="margin:0 0 18px;font:700 22px/1.3 Georgia,'Times New Roman',serif;color:${INK}">${esc(subject)}</h1>
${paragraphs(text)}${button}
</td></tr>
<tr><td style="padding:18px 6px 0;font:12px/1.6 Arial,Helvetica,sans-serif;color:${SOFT}">
You are receiving this because you have a Record Lab account.<br>
<a href="${SITE_URL}" style="color:${SOFT}">${SITE_URL.replace(/^https?:\/\//, "")}</a> · A product by Cogniheim
</td></tr>
</table></td></tr></table></body></html>`;
}
